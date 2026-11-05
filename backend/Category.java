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

/** 카테고리 (category 테이블) */
@Entity
@Table(name = "category")
public class Category {

    /** 카테고리 ID */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Long categoryId;

    /** 카테고리명 */
    @Column(name = "category_name", nullable = false, length = 50)
    private String categoryName;

    /** 분류: 이 카테고리에 속한 물품들 */
    @JsonIgnore
    @OneToMany(mappedBy = "category")
    private List<Item> items = new ArrayList<>();

    public Category() {
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public List<Item> getItems() {
        return items;
    }
}
