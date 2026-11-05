package com.shinjung.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;

/** 유저 (users 테이블) */
@Entity
@Table(name = "users")
public class User {

    /** 유저 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long userId;

    /** 판매 기록: 이 유저의 가장 최근 판매 기록 */
    @JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_record_id")
    private ItemSales salesRecord;

    /** 구매 기록: 이 유저의 가장 최근 구매 기록 */
    @JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_record_id")
    private ItemPurchase purchaseRecord;

    /** 닉네임 (중복 불가) */
    @Column(name = "nickname", nullable = false, unique = true, length = 50)
    private String nickname;

    /** 지역 코드 */
    @Column(name = "region_code", nullable = false, length = 50)
    private String regionCode;

    /** 신뢰점수 (기본값 50) */
    @Column(name = "trust_score")
    private Integer trustScore = 50;

    /** 판매 목록 */
    @JsonIgnore
    @OneToMany(mappedBy = "seller")
    private List<ItemSales> salesList = new ArrayList<>();

    /** 구매 목록 */
    @JsonIgnore
    @OneToMany(mappedBy = "buyer")
    private List<ItemPurchase> purchaseList = new ArrayList<>();

    /** 유저 차단: 내가 차단한 내역 */
    @JsonIgnore
    @OneToMany(mappedBy = "blocker")
    private List<BlockList> blockingList = new ArrayList<>();

    /** 유저 차단: 내가 차단당한 내역 */
    @JsonIgnore
    @OneToMany(mappedBy = "blocked")
    private List<BlockList> blockedByList = new ArrayList<>();

    /** 찜 등록 */
    @JsonIgnore
    @OneToMany(mappedBy = "user")
    private List<Wishlist> wishlists = new ArrayList<>();

    /** 뱃지 획득 */
    @JsonIgnore
    @OneToMany(mappedBy = "user")
    private List<UserBadge> userBadges = new ArrayList<>();

    /** 평가 작성 */
    @JsonIgnore
    @OneToMany(mappedBy = "user")
    private List<TradingEvaluation> evaluations = new ArrayList<>();

    public User() {
    }

    public Long getUserId() {
        return userId;
    }

    public ItemSales getSalesRecord() {
        return salesRecord;
    }

    public void setSalesRecord(ItemSales salesRecord) {
        this.salesRecord = salesRecord;
    }

    public ItemPurchase getPurchaseRecord() {
        return purchaseRecord;
    }

    public void setPurchaseRecord(ItemPurchase purchaseRecord) {
        this.purchaseRecord = purchaseRecord;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getRegionCode() {
        return regionCode;
    }

    public void setRegionCode(String regionCode) {
        this.regionCode = regionCode;
    }

    public Integer getTrustScore() {
        return trustScore;
    }

    public void setTrustScore(Integer trustScore) {
        this.trustScore = trustScore;
    }

    public List<ItemSales> getSalesList() {
        return salesList;
    }

    public List<ItemPurchase> getPurchaseList() {
        return purchaseList;
    }

    public List<BlockList> getBlockingList() {
        return blockingList;
    }

    public List<BlockList> getBlockedByList() {
        return blockedByList;
    }

    public List<Wishlist> getWishlists() {
        return wishlists;
    }

    public List<UserBadge> getUserBadges() {
        return userBadges;
    }

    public List<TradingEvaluation> getEvaluations() {
        return evaluations;
    }
}
