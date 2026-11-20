import {
  buildAuthCookie,
  buildLogoutCookie,
  getAuthUser,
  login,
  signToken,
  signup,
} from "./auth-service.js";
import { errorResponse, handleError, readJson } from "./http.js";

/** 닉네임 규칙: 공백 없는 2~20자 */
const NICKNAME_RULE = /^\S{2,20}$/;

function validateCredentials(body) {
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!NICKNAME_RULE.test(nickname)) return { error: "nickname은 공백 없는 2~20자여야 합니다." };
  if (password.length < 8 || password.length > 72) return { error: "password는 8~72자여야 합니다." };
  return { nickname, password };
}

/** POST /api/auth/signup : 회원가입 (성공하면 바로 로그인 상태가 됩니다) */
export async function signupHandler(request) {
  try {
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const checked = validateCredentials(body);
    if (checked.error) return errorResponse(400, checked.error);
    const regionCode = typeof body.regionCode === "string" ? body.regionCode.trim() : "";
    if (regionCode.length < 1 || regionCode.length > 50) {
      return errorResponse(400, "regionCode는 1~50자여야 합니다.");
    }

    const user = await signup({ nickname: checked.nickname, password: checked.password, regionCode });
    const token = signToken({ uid: user.userId, nick: user.nickname });
    return Response.json({ user }, { status: 201, headers: { "Set-Cookie": buildAuthCookie(token) } });
  } catch (error) {
    return handleError(error, "회원가입 실패");
  }
}

/** POST /api/auth/login : 로그인 (토큰을 HttpOnly 쿠키로 심어 줍니다) */
export async function loginHandler(request) {
  try {
    const body = await readJson(request);
    if (!body) return errorResponse(400, "요청 내용을 읽을 수 없습니다.");
    const checked = validateCredentials(body);
    if (checked.error) return errorResponse(400, checked.error);

    const { token, user } = await login({ nickname: checked.nickname, password: checked.password });
    return Response.json({ user }, { status: 200, headers: { "Set-Cookie": buildAuthCookie(token) } });
  } catch (error) {
    return handleError(error, "로그인 실패");
  }
}

/** POST /api/auth/logout : 로그아웃 (쿠키를 지웁니다) */
export async function logoutHandler() {
  return Response.json({ ok: true }, { status: 200, headers: { "Set-Cookie": buildLogoutCookie() } });
}

/** GET /api/auth/me : 지금 로그인한 사용자 확인 (화면에서 로그인 상태 표시용) */
export async function meHandler(request) {
  const user = getAuthUser(request);
  if (!user) return errorResponse(401, "로그인이 필요합니다.");
  return Response.json({ user });
}
