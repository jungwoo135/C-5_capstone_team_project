package com.shinjung.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;

/** 뱃지 (badge 테이블) */
@Entity
@Table(name = "badge")
public class Badge {

    /** 뱃지 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "badge_id")
    private Long badgeId;

    /** 뱃지명 */
    @Column(name = "badge_name", nullable = false, length = 50)
    private String badgeName;

    /** 뱃지 이미지 */
    @Column(name = "badge_image", length = 500)
    private String badgeImage;

    /** 달성 조건 */
    @Column(name = "achievement_condition", nullable = false, length = 200)
    private String achievementCondition;

    /** 부여됨 */
    @JsonIgnore
    @OneToMany(mappedBy = "badge")
    private List<UserBadge> userBadges = new ArrayList<>();

    public Badge() {
    }

    public Long getBadgeId() {
        return badgeId;
    }

    public String getBadgeName() {
        return badgeName;
    }

    public void setBadgeName(String badgeName) {
        this.badgeName = badgeName;
    }

    public String getBadgeImage() {
        return badgeImage;
    }

    public void setBadgeImage(String badgeImage) {
        this.badgeImage = badgeImage;
    }

    public String getAchievementCondition() {
        return achievementCondition;
    }

    public void setAchievementCondition(String achievementCondition) {
        this.achievementCondition = achievementCondition;
    }

    public List<UserBadge> getUserBadges() {
        return userBadges;
    }
}
