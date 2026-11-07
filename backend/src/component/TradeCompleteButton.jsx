"use client"; // 클릭처럼 브라우저에서 동작하는 코드가 있다고 Next.js에 알립니다.

import { useRef, useState } from "react";
import { completeTrade } from "@/lib/trade-api";

/**
 * 거래 완료 버튼.
 * itemId: 거래할 물품 ID, sellerId: 판매자 유저 ID, buyerId: 구매자 유저 ID
 * onCompleted: 거래 완료 후 실행할 함수 (선택)
 */
export default function TradeCompleteButton({ itemId, sellerId, buyerId, onCompleted }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 화면이 다시 그려지기 전에 들어온 클릭도 막기 위해, 즉시 바뀌는 값을 하나 더 둡니다.
  const isRequestInFlight = useRef(false);

  async function handleClick() {
    if (isRequestInFlight.current) return;
    isRequestInFlight.current = true;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const result = await completeTrade({ itemId, sellerId, buyerId });
      setIsCompleted(true);
      onCompleted?.(result);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      isRequestInFlight.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      {/* 처리 중이거나 완료되면 버튼을 잠가 중복 요청을 막습니다. */}
      <button type="button" onClick={handleClick} disabled={isSubmitting || isCompleted}>
        {isCompleted ? "거래 완료됨" : isSubmitting ? "처리 중..." : "거래 완료"}
      </button>
      {errorMessage && <p role="alert">{errorMessage}</p>}
    </div>
  );
}
