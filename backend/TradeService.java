package com.shinjung.service;

import com.shinjung.dto.TradeCompleteRequest;
import com.shinjung.dto.TradeCompleteResponse;
import com.shinjung.entity.Item;
import com.shinjung.entity.ItemPurchase;
import com.shinjung.entity.ItemSales;
import com.shinjung.entity.User;
import com.shinjung.repository.ItemPurchaseRepository;
import com.shinjung.repository.ItemRepository;
import com.shinjung.repository.ItemSalesRepository;
import com.shinjung.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TradeService {

    /** 거래가 끝난 물품의 판매 상태 값 */
    public static final String SALES_STATUS_SOLD = "SOLD";

    /** AWS 서버의 기본 시간대는 보통 UTC이므로 한국 시간을 직접 지정합니다. */
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");

    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final ItemSalesRepository itemSalesRepository;
    private final ItemPurchaseRepository itemPurchaseRepository;

    public TradeService(ItemRepository itemRepository,
                        UserRepository userRepository,
                        ItemSalesRepository itemSalesRepository,
                        ItemPurchaseRepository itemPurchaseRepository) {
        this.itemRepository = itemRepository;
        this.userRepository = userRepository;
        this.itemSalesRepository = itemSalesRepository;
        this.itemPurchaseRepository = itemPurchaseRepository;
    }

    /**
     * 거래 완료 처리.
     * 아래 저장 작업은 전부 성공하거나 전부 취소됩니다.
     * 중간에 오류가 나면 앞서 저장한 판매/구매 기록도 함께 되돌려집니다.
     */
    @Transactional
    public TradeCompleteResponse completeTrade(TradeCompleteRequest request) {
        if (request.sellerId().equals(request.buyerId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "판매자와 구매자는 같을 수 없습니다.");
        }

        // 1. 물품을 잠그고, 이미 팔린 물품인지 확인합니다.
        Item item = itemRepository.findByIdForUpdate(request.itemId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "물품을 찾을 수 없습니다."));
        if (SALES_STATUS_SOLD.equals(item.getSalesStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 판매 완료된 물품입니다.");
        }

        // 2. 판매자와 구매자를 잠그고 가져옵니다.
        List<User> users = userRepository.findAllByIdForUpdate(List.of(request.sellerId(), request.buyerId()));
        User seller = findUser(users, request.sellerId(), "판매자를 찾을 수 없습니다.");
        User buyer = findUser(users, request.buyerId(), "구매자를 찾을 수 없습니다.");

        // 3. 판매 기록과 구매 기록을 만듭니다. (DB가 부여한 ID를 다음 단계에서 씁니다)
        // DB의 DATETIME은 초 단위까지 저장하므로 시각도 초 단위로 맞춥니다.
        LocalDateTime now = LocalDateTime.now(KOREA).truncatedTo(ChronoUnit.SECONDS);
        ItemSales sales = itemSalesRepository.save(new ItemSales(seller, item, now));
        ItemPurchase purchase = itemPurchaseRepository.save(new ItemPurchase(buyer, item, now));

        // 4. users.sales_record_id, users.purchase_record_id, item.sales_status를 바꿉니다.
        // save를 따로 부르지 않아도 트랜잭션이 끝날 때 바뀐 값이 DB에 반영됩니다.
        seller.setSalesRecord(sales);
        buyer.setPurchaseRecord(purchase);
        item.setSalesStatus(SALES_STATUS_SOLD);

        return new TradeCompleteResponse(
                sales.getSalesId(), purchase.getPurchaseId(), item.getItemId(), item.getSalesStatus(), now);
    }

    private User findUser(List<User> users, Long userId, String notFoundMessage) {
        return users.stream()
                .filter(user -> user.getUserId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, notFoundMessage));
    }
}
