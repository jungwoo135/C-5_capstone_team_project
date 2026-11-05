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

/** 물품 인증 (item_authentication 테이블) */
@Entity
@Table(name = "item_authentication")
public class ItemAuthentication {

    /** 인증 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "auth_id")
    private Long authId;

    /** 인증 내역: 물품 ID */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    /** 인증 유형 */
    @Column(name = "auth_type", nullable = false, length = 50)
    private String authType;

    /** 시리얼 번호 */
    @Column(name = "serial_number", length = 200)
    private String serialNumber;

    /** 인증 사진 */
    @Column(name = "auth_image", length = 500)
    private String authImage;

    /** 신뢰도 수치 */
    @Column(name = "reliability_score", nullable = false)
    private Double reliabilityScore;

    public ItemAuthentication() {
    }

    public Long getAuthId() {
        return authId;
    }

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }

    public String getAuthType() {
        return authType;
    }

    public void setAuthType(String authType) {
        this.authType = authType;
    }

    public String getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
    }

    public String getAuthImage() {
        return authImage;
    }

    public void setAuthImage(String authImage) {
        this.authImage = authImage;
    }

    public Double getReliabilityScore() {
        return reliabilityScore;
    }

    public void setReliabilityScore(Double reliabilityScore) {
        this.reliabilityScore = reliabilityScore;
    }
}
