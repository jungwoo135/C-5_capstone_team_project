/**
 * 회원가입·로그인 API를 호출하는 화면용 함수 모음.
 * 토큰은 HttpOnly 쿠키로 오가므로, 화면 코드가 따로 보관할 것이 없습니다.
 */

async function callApi(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.detail ?? `요청에 실패했습니다. (오류 코드 ${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

const jsonPost = (data) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

/** 회원가입. 성공하면 바로 로그인 상태가 됩니다. */
export async function signup({ nickname, password, regionCode }) {
  return callApi("/api/auth/signup", jsonPost({ nickname, password, regionCode }));
}

/** 로그인 */
export async function login({ nickname, password }) {
  return callApi("/api/auth/login", jsonPost({ nickname, password }));
}

/** 로그아웃 */
export async function logout() {
  return callApi("/api/auth/logout", { method: "POST" });
}

/** 지금 로그인한 사용자. 로그인하지 않았으면 null을 돌려줍니다. */
export async function getMe() {
  try {
    const body = await callApi("/api/auth/me");
    return body.user;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}
