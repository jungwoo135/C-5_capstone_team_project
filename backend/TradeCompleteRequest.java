package com.shinjung.dto;

import jakarta.validation.constraints.NotNull;

/** React가 보내는 거래 완료 요청 내용 */
public record TradeCompleteRequest(
        @NotNull Long itemId,
        @NotNull Long sellerId,
        @NotNull Long buyerId) {
}
