import crypto from "node:crypto";
import { AUTH_COOKIE_NAME } from "./constants.js";
import { query } from "./db.js";
import { ApiError, isValidId } from "./http.js";

/**
 * 회원가입·로그인과 "지금 요청을 보낸 사람이 누구인지" 확인을 담당합니다.
 *
 * 외부 패키지 없이 Node.js 내장 crypto만 씁니다.
 *  - 비밀번호: scrypt 해시로 저장합니다. 비밀번호 원문은 어디에도 저장하지 않습니다.
 *  - 로그인 유지: HS256 방식 토큰(JWT)을 만들어 HttpOnly 쿠키에 담습니다.
 *    HttpOnly 쿠키는 브라우저의 자바스크립트가 읽을 수 없어 토큰 탈취에 비교적 안전합니다.
 */

/** scrypt 해시 설정 (저장 형식: s2$N$r$p$솔트$해시) */
const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 32, maxmem: 64 * 1024 * 1024 };

/** 로그인 유지 기간 (7일) */
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    // 설정 문제는 개발자가 바로 알아채도록 분명한 문구로 알립니다.
    throw new ApiError(500, "서버에 SESSION_SECRET이 설정되지 않았습니다. .env.local을 확인하세요.");
  }
  return secret;
}

function scryptAsync(password, salt, keyLength, options) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/** 비밀번호 → 저장용 해시 문자열 */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const { N, r, p, keyLength, maxmem } = SCRYPT;
  const hash = await scryptAsync(password, salt, keyLength, { N, r, p, maxmem });
  return ["s2", N, r, p, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

/** 입력한 비밀번호가 저장된 해시와 맞는지 확인합니다. (형식이 깨진 해시는 항상 false) */
export async function verifyPassword(password, storedHash) {
  try {
    const [tag, n, r, p, saltText, hashText] = String(storedHash).split("$");
    if (tag !== "s2") return false;
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(hashText, "base64url");
    const actual = await scryptAsync(password, salt, expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
    });
    // timingSafeEqual: 비교 시간 차이로 비밀번호를 유추하는 공격을 막습니다.
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

const toBase64Url = (text) => Buffer.from(text).toString("base64url");

/** 로그인 토큰 발급 (알고리즘은 HS256으로 고정) */
export function signToken(payload) {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }),
  );
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/** 토큰 검증. 유효하면 내용물을, 위조·만료·형식 오류면 null을 돌려줍니다. */
export function verifyToken(token) {
  try {
    const [header, body, signature] = String(token).split(".");
    if (!header || !body || !signature) return null;
    const expected = crypto.createHmac("sha256", getSecret()).update(`${header}.${body}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookie(request, name) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** 로그인 성공 시 브라우저에 심을 쿠키 값 (Set-Cookie 헤더용) */
export function buildAuthCookie(token) {
  // HTTPS를 적용한 뒤 .env.local에 COOKIE_SECURE=true를 넣으면 HTTPS에서만 쿠키가 전송됩니다.
  const secure = process.env.COOKIE_SECURE === "true" ? "; Secure" : "";
  return `${AUTH_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_TTL_SECONDS}; SameSite=Lax${secure}`;
}

/** 로그아웃: 쿠키를 즉시 만료시킵니다. */
export function buildLogoutCookie() {
  return `${AUTH_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

/** 요청을 보낸 로그인 사용자를 돌려줍니다. 로그인하지 않았으면 null. */
export function getAuthUser(request) {
  const token = readCookie(request, AUTH_COOKIE_NAME);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || !Number.isSafeInteger(payload.uid) || payload.uid < 1) return null;
  return { userId: payload.uid, nickname: typeof payload.nick === "string" ? payload.nick : "" };
}

/** 로그인이 필요한 기능에서 씁니다. 로그인하지 않았으면 401 오류를 던집니다. */
export function requireAuth(request) {
  const user = getAuthUser(request);
  if (!user) throw new ApiError(401, "로그인이 필요합니다.");
  return user;
}

function isDuplicateError(error) {
  return error?.code === "ER_DUP_ENTRY" || error?.errno === 1062 || /duplicate/i.test(error?.message ?? "");
}

/** 회원가입: 닉네임 중복을 확인하고 유저를 만듭니다. */
export async function signup({ nickname, password, regionCode }) {
  const passwordHash = await hashPassword(password);
  let result;
  try {
    result = await query(
      "INSERT INTO users (nickname, password_hash, region_code) VALUES (?, ?, ?)",
      [nickname, passwordHash, regionCode],
    );
  } catch (error) {
    // 닉네임 UNIQUE 제약 덕분에, 동시에 같은 닉네임으로 가입해도 한 명만 성공합니다.
    if (isDuplicateError(error)) throw new ApiError(409, "이미 사용 중인 닉네임입니다.");
    throw error;
  }
  return { userId: Number(result.insertId), nickname, trustScore: 50 };
}

/** 로그인: 닉네임과 비밀번호를 확인하고 토큰을 발급합니다. */
export async function login({ nickname, password }) {
  const rows = await query(
    "SELECT user_id, nickname, password_hash, trust_score FROM users WHERE nickname = ?",
    [nickname],
  );
  const user = rows[0];
  // 유저가 없어도 비밀번호가 틀려도 같은 문구로 답해, 닉네임 존재 여부를 밖에서 알 수 없게 합니다.
  const passwordOk = user ? await verifyPassword(password, user.password_hash) : false;
  if (!passwordOk) throw new ApiError(401, "닉네임 또는 비밀번호가 올바르지 않습니다.");
  const token = signToken({ uid: Number(user.user_id), nick: user.nickname });
  return {
    token,
    user: {
      userId: Number(user.user_id),
      nickname: user.nickname,
      trustScore: Number(user.trust_score),
    },
  };
}

/**
 * 주소에 들어온 유저 ID를 숫자로 바꿉니다. "me"는 로그인한 본인을 뜻합니다.
 * 예: /api/users/me/items → 내 물품, /api/users/7/items → 7번 유저의 물품
 */
export function resolveUserId(request, rawUserId) {
  if (rawUserId === "me") return requireAuth(request).userId;
  const userId = Number(rawUserId);
  if (!isValidId(userId)) throw new ApiError(400, "유저 ID가 올바르지 않습니다.");
  return userId;
}
