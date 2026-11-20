import TradeCompleteButton from "@/components/TradeCompleteButton";

// 연결 확인용 임시 화면입니다. 거래 완료는 물품을 등록한 판매자가 로그인한 상태에서만 됩니다.
// (로그인하지 않으면 버튼 아래에 "로그인이 필요합니다."가 표시됩니다)
export default function Page() {
  return <TradeCompleteButton itemId={2} buyerId={2} />;
}
