/**
 * 서비스 전체에서 함께 쓰는 고정 값 모음.
 * "SOLD" 같은 문자열을 곳곳에 직접 쓰면 오타가 나도 알아채기 어려우므로,
 * 반드시 이 파일에서 가져다 씁니다.
 */

/** 물품 판매 상태 (item.sales_status 컬럼에 저장되는 값) */
export const SALES_STATUS = {
  ON_SALE: "ON_SALE", // 판매 중
  RESERVED: "RESERVED", // 예약 중
  SOLD: "SOLD", // 판매 완료
};

/** 판매 상태로 허용되는 값 목록 (입력 검사용) */
export const SALES_STATUS_VALUES = Object.values(SALES_STATUS);

/** 거래 평가 작성자 구분 (trading_evaluation.member_type_code 컬럼에 저장되는 값) */
export const MEMBER_TYPE = {
  SELLER: "SELLER", // 판매자가 구매자를 평가
  BUYER: "BUYER", // 구매자가 판매자를 평가
};

/** 작성자 구분으로 허용되는 값 목록 (입력 검사용) */
export const MEMBER_TYPE_VALUES = Object.values(MEMBER_TYPE);

/** 로그인 토큰을 담는 쿠키 이름 */
export const AUTH_COOKIE_NAME = "shinjung_token";

/**
 * 뱃지 달성 조건(badge.achievement_condition)의 기계 판독 형식.
 *   TRUST_SCORE>=80 → 신뢰점수 80 이상이면 자동 부여
 *   TRADE_COUNT>=10 → 판매+구매 완료 합계 10회 이상이면 자동 부여
 * 이 형식이 아닌 조건 문구는 자동 부여에서 건너뜁니다. (수동 부여용)
 */
export const BADGE_CONDITION_PATTERN = /^(TRUST_SCORE|TRADE_COUNT)>=(\d{1,3})$/;

/** 거래 약속 상태 (appointment.status 컬럼에 저장되는 값) */
export const APPOINTMENT_STATUS = {
  PROPOSED: "PROPOSED", // 한쪽이 제안함 (상대 확정 대기)
  CONFIRMED: "CONFIRMED", // 상대가 확정함
  DONE: "DONE", // 두 사람 모두 도착 확인됨
  CANCELLED: "CANCELLED", // 취소됨
};

/** 약속 장소에 "도착"으로 인정하는 반경 (미터). 도심 GPS 오차 10~30m, 실내 50m 이상을 고려한 값 */
export const ARRIVAL_RADIUS_M = 100;

/** 도착 확인을 받아 주는 시간 범위: 약속 시각 앞뒤로 이 분(分)만큼 */
export const ARRIVAL_WINDOW_MINUTES = 60;

/** 약속은 지금부터 최대 며칠 뒤까지 잡을 수 있는지 */
export const APPOINTMENT_MAX_DAYS_AHEAD = 30;

/** 채팅 메시지 최대 길이 */
export const CHAT_MESSAGE_MAX_LENGTH = 1000;

/** 안전 장소 종류 (safe_place.place_type 컬럼에 저장되는 값) */
export const SAFE_PLACE_TYPE = {
  POLICE: "POLICE", // 경찰서·지구대·파출소
  CCTV: "CCTV", // CCTV 밀집 구역 (약 100m 격자)
};

/** 안전 장소 추천 반경 기본값과 최대값 (미터) */
export const SAFE_PLACE_RADIUS_DEFAULT_M = 1000;
export const SAFE_PLACE_RADIUS_MAX_M = 3000;

/** 안전 장소 점수: 종류별 기본 점수 (높을수록 먼저 추천) */
export const SAFE_PLACE_BASE_SCORE = {
  POLICE: 3,
  CCTV: 2,
};

/** 신고 대상 종류 (report.target_type 컬럼에 저장되는 값) */
export const REPORT_TARGET_TYPE = {
  USER: "USER",
  ITEM: "ITEM",
  MESSAGE: "MESSAGE",
};
export const REPORT_TARGET_TYPE_VALUES = Object.values(REPORT_TARGET_TYPE);

/** 신고 사유 코드 (report.reason 컬럼에 저장되는 값) */
export const REPORT_REASON = {
  FRAUD: "FRAUD", // 사기
  ABUSE: "ABUSE", // 욕설·괴롭힘
  SPAM: "SPAM", // 광고·도배
  FAKE: "FAKE", // 허위 매물·가품
  OTHER: "OTHER", // 기타
};
export const REPORT_REASON_VALUES = Object.values(REPORT_REASON);
