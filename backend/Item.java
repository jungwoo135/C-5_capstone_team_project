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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** 물품 (item 테이블) */
@Entity
@Table(name = "item")
public class Item {

    /** 물품 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long itemId;

    /** 분류: 카테고리 ID */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    /** 제목 */
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    /** 가격 */
    @Column(name = "price", nullable = false)
    private Integer price;

    /** 본문 내용 */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 제품 이미지 */
    @Column(name = "item_image", length = 500)
    private String itemImage;

    /** 판매 상태 */
    @Column(name = "sales_status", nullable = false, length = 50)
    private String salesStatus;

    /** AI 사진 검토 여부 */
    @Column(name = "ai_photo_verified", nullable = false)
    private Boolean aiPhotoVerified;

    /** 등록 일자 */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** 판매하기 */
    @JsonIgnore
    @OneToMany(mappedBy = "item")
    private List<ItemSales> salesList = new ArrayList<>();

    /** 구매하기 */
    @JsonIgnore
    @OneToMany(mappedBy = "item")
    private List<ItemPurchase> purchaseList = new ArrayList<>();

    /** 인증 내역 */
    @JsonIgnore
    @OneToMany(mappedBy = "item")
    private List<ItemAuthentication> authentications = new ArrayList<>();

    /** 찜 당함 */
    @JsonIgnore
    @OneToMany(mappedBy = "item")
    private List<Wishlist> wishlists = new ArrayList<>();

    /** 평가 대상 물품 */
    @JsonIgnore
    @OneToMany(mappedBy = "item")
    private List<TradingEvaluation> evaluations = new ArrayList<>();

    public Item() {
    }

    public Long getItemId() {
        return itemId;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Integer getPrice() {
        return price;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getItemImage() {
        return itemImage;
    }

    public void setItemImage(String itemImage) {
        this.itemImage = itemImage;
    }

    public String getSalesStatus() {
        return salesStatus;
    }

    public void setSalesStatus(String salesStatus) {
        this.salesStatus = salesStatus;
    }

    public Boolean getAiPhotoVerified() {
        return aiPhotoVerified;
    }

    public void setAiPhotoVerified(Boolean aiPhotoVerified) {
        this.aiPhotoVerified = aiPhotoVerified;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<ItemSales> getSalesList() {
        return salesList;
    }

    public List<ItemPurchase> getPurchaseList() {
        return purchaseList;
    }

    public List<ItemAuthentication> getAuthentications() {
        return authentications;
    }

    public List<Wishlist> getWishlists() {
        return wishlists;
    }

    public List<TradingEvaluation> getEvaluations() {
        return evaluations;
    }
}
