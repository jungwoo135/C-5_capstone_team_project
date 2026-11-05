package com.shinjung.controller;

import com.shinjung.dto.TradeCompleteRequest;
import com.shinjung.dto.TradeCompleteResponse;
import com.shinjung.service.TradeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trades")
public class TradeController {

    private final TradeService tradeService;

    public TradeController(TradeService tradeService) {
        this.tradeService = tradeService;
    }

    /** POST /api/trades/complete : 거래 완료 처리 */
    @PostMapping("/complete")
    @ResponseStatus(HttpStatus.CREATED)
    public TradeCompleteResponse completeTrade(@Valid @RequestBody TradeCompleteRequest request) {
        return tradeService.completeTrade(request);
    }
}
