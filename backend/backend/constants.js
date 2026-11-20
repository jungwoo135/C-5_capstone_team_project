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
