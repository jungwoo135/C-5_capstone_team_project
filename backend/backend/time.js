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
