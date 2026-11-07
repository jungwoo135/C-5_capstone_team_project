import TradeCompleteButton from "@/components/TradeCompleteButton";

// 연결 확인용 임시 화면입니다. 숫자는 테스트 데이터의 물품, 판매자, 구매자 ID입니다.
export default function Page() {
  return <TradeCompleteButton itemId={2} sellerId={1} buyerId={2} />;
}
