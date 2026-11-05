package com.shinjung.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

/** 찜 목록 (wishlist 테이블) */
@Entity
@Table(name = "wishlist")
public class Wishlist {

    /** 찜 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wish_id")
    private Long wishId;

    /** 찜 등록: 찜 한 유저 ID */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** 찜 당함: 찜 된 물품 ID */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    /** 찜 등록 일시 */
    @Column(name = "wished_at", nullable = false)
    private LocalDateTime wishedAt;

    public Wishlist() {
    }

    public Long getWishId() {
        return wishId;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }

    public LocalDateTime getWishedAt() {
        return wishedAt;
    }

    public void setWishedAt(LocalDateTime wishedAt) {
        this.wishedAt = wishedAt;
    }
}
