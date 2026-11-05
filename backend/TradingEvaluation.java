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

/** 거래 평가 (trading_evaluation 테이블) */
@Entity
@Table(name = "trading_evaluation")
public class TradingEvaluation {

    /** 평가 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "eval_id")
    private Long evalId;

    /** 평가 대상 물품: 물품 ID */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    /** 평가 작성: 회원 ID */
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** 회원 구분 코드 */
    @Column(name = "member_type_code", nullable = false, length = 50)
    private String memberTypeCode;

    /** 매너 평가 점수 */
    @Column(name = "manner_score", nullable = false)
    private Integer mannerScore;

    /** 소통 평가 점수 */
    @Column(name = "comm_score", nullable = false)
    private Integer commScore;

    /** 시간 평가 점수 */
    @Column(name = "time_score", nullable = false)
    private Integer timeScore;

    public TradingEvaluation() {
    }

    public Long getEvalId() {
        return evalId;
    }

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getMemberTypeCode() {
        return memberTypeCode;
    }

    public void setMemberTypeCode(String memberTypeCode) {
        this.memberTypeCode = memberTypeCode;
    }

    public Integer getMannerScore() {
        return mannerScore;
    }

    public void setMannerScore(Integer mannerScore) {
        this.mannerScore = mannerScore;
    }

    public Integer getCommScore() {
        return commScore;
    }

    public void setCommScore(Integer commScore) {
        this.commScore = commScore;
    }

    public Integer getTimeScore() {
        return timeScore;
    }

    public void setTimeScore(Integer timeScore) {
        this.timeScore = timeScore;
    }
}
