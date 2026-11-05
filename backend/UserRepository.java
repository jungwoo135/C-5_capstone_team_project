package com.shinjung.repository;

import com.shinjung.entity.User;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * 유저들을 ID가 작은 순서대로 잠그면서 읽습니다.
     * 잠그는 순서를 통일해, 두 거래가 서로의 잠금을 기다리다 멈추는 일(교착 상태)을 줄입니다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.userId in :userIds order by u.userId")
    List<User> findAllByIdForUpdate(@Param("userIds") Collection<Long> userIds);
}
