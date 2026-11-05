package com.shinjung.dto;

import java.time.LocalDateTime;

/** 거래 완료 후 React에 돌려주는 결과 */
public record TradeCompleteResponse(
        Long salesId,
        Long purchaseId,
        Long itemId,
        String salesStatus,
        LocalDateTime completedAt) {
}
