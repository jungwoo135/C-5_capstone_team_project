/**
 * AWS 서버의 기본 시간대는 보통 UTC이므로 한국 시간을 직접 만듭니다.
 * 결과 예: "2026-11-12 15:30:00" (DATETIME 형식, 초 단위)
 */
export function koreaNow() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date());
}

/**
 * "2026-11-28 14:00:00" 같은 한국 시간 문자열을 밀리초 숫자로 바꿉니다. (비교·뺄셈용)
 * DB의 DATETIME은 시간대 정보가 없으므로, 이 프로젝트에서는 전부 한국 시간으로 간주합니다.
 * 형식이 맞지 않으면 null을 돌려줍니다.
 */
export function koreaDateTimeToMs(text) {
  if (typeof text !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const ms = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s ?? "00"}+09:00`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * 밀리초 숫자를 DB에 저장하는 DATETIME 형식("YYYY-MM-DD HH:MM:SS", 한국 시간)으로 바꿉니다.
 */
export function msToKoreaDateTime(ms) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(ms));
}

/** 지금 시각(한국)을 밀리초 숫자로 돌려줍니다. */
export function koreaNowMs() {
  return koreaDateTimeToMs(koreaNow());
}
