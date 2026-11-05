package com.shinjung.repository;

import com.shinjung.entity.Item;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ItemRepository extends JpaRepository<Item, Long> {

    /**
     * 물품을 읽으면서 잠급니다.
     * 같은 물품에 거래 완료 요청이 동시에 와도 하나씩 차례로 처리되어 이중 판매를 막습니다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Item i where i.itemId = :itemId")
    Optional<Item> findByIdForUpdate(@Param("itemId") Long itemId);
}
