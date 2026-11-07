-- ============================================================
-- 신중: 신뢰가는 중고거래 - MariaDB 전체 스키마 (테이블 11개)
--
-- 생성 순서가 중요합니다.
--   users <-> item_sales, users <-> item_purchase 는 서로를 참조합니다.
--   아직 없는 테이블은 외래키로 참조할 수 없으므로,
--   users를 외래키 없이 먼저 만들고, 맨 아래 ALTER TABLE에서 연결합니다.
--
-- 명세에 길이가 없는 VARCHAR는 아래 길이로 정했습니다.
--   이름/코드류 50, 제목/조건류 200, 이미지 주소 500
-- ============================================================

CREATE DATABASE IF NOT EXISTS shinjung
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE shinjung;

-- 1. 카테고리
CREATE TABLE category (
    category_id   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '카테고리 ID',
    category_name VARCHAR(50)  NOT NULL COMMENT '카테고리명',
    PRIMARY KEY (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='카테고리';

-- 2. 유저 (sales_record_id, purchase_record_id 외래키는 맨 아래 ALTER TABLE에서 추가)
CREATE TABLE users (
    user_id            BIGINT      NOT NULL AUTO_INCREMENT COMMENT '유저 ID',
    sales_record_id    BIGINT      NULL COMMENT '판매 기록',
    purchase_record_id BIGINT      NULL COMMENT '구매 기록',
    nickname           VARCHAR(50) NOT NULL COMMENT '닉네임',
    region_code        VARCHAR(50) NOT NULL COMMENT '지역 코드',
    trust_score        INT         DEFAULT 50 COMMENT '신뢰점수',
    PRIMARY KEY (user_id),
    CONSTRAINT uk_users_nickname UNIQUE (nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='유저';

-- 3. 물품
CREATE TABLE item (
    item_id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '물품 ID',
    category_id       BIGINT       NOT NULL COMMENT '카테고리 ID',
    title             VARCHAR(200) NOT NULL COMMENT '제목',
    price             INT          NOT NULL COMMENT '가격',
    content           TEXT         NOT NULL COMMENT '본문 내용',
    item_image        VARCHAR(500) NULL COMMENT '제품 이미지',
    sales_status      VARCHAR(50)  NOT NULL COMMENT '판매 상태',
    ai_photo_verified BOOLEAN      NOT NULL COMMENT 'AI 사진 검토 여부',
    created_at        DATETIME     NOT NULL COMMENT '등록 일자',
    PRIMARY KEY (item_id),
    CONSTRAINT fk_item_category FOREIGN KEY (category_id) REFERENCES category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='물품';

-- 4. 물품 판매
CREATE TABLE item_sales (
    sales_id   BIGINT   NOT NULL AUTO_INCREMENT COMMENT '판매 ID',
    seller_id  BIGINT   NOT NULL COMMENT '판매자 ID',
    item_id    BIGINT   NOT NULL COMMENT '물품 ID',
    sales_date DATETIME NOT NULL COMMENT '판매 일자',
    PRIMARY KEY (sales_id),
    CONSTRAINT fk_item_sales_seller FOREIGN KEY (seller_id) REFERENCES users (user_id),
    CONSTRAINT fk_item_sales_item   FOREIGN KEY (item_id)   REFERENCES item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='물품 판매';

-- 5. 물품 구매
CREATE TABLE item_purchase (
    purchase_id   BIGINT   NOT NULL AUTO_INCREMENT COMMENT '구매 ID',
    buyer_id      BIGINT   NOT NULL COMMENT '구매자 ID',
    item_id       BIGINT   NOT NULL COMMENT '물품 ID',
    purchase_date DATETIME NOT NULL COMMENT '구매 일자',
    PRIMARY KEY (purchase_id),
    CONSTRAINT fk_item_purchase_buyer FOREIGN KEY (buyer_id) REFERENCES users (user_id),
    CONSTRAINT fk_item_purchase_item  FOREIGN KEY (item_id)  REFERENCES item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='물품 구매';

-- 6. 차단 목록
CREATE TABLE block_list (
    block_id        BIGINT   NOT NULL AUTO_INCREMENT COMMENT '차단 ID',
    blocker_user_id BIGINT   NOT NULL COMMENT '차단 한 유저 ID',
    blocked_user_id BIGINT   NOT NULL COMMENT '차단 된 유저 ID',
    blocked_at      DATETIME NOT NULL COMMENT '차단 일시',
    PRIMARY KEY (block_id),
    CONSTRAINT fk_block_list_blocker FOREIGN KEY (blocker_user_id) REFERENCES users (user_id),
    CONSTRAINT fk_block_list_blocked FOREIGN KEY (blocked_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='차단 목록';

-- 7. 물품 인증
CREATE TABLE item_authentication (
    auth_id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '인증 ID',
    item_id           BIGINT       NOT NULL COMMENT '물품 ID',
    auth_type         VARCHAR(50)  NOT NULL COMMENT '인증 유형',
    serial_number     VARCHAR(200) NULL COMMENT '시리얼 번호',
    auth_image        VARCHAR(500) NULL COMMENT '인증 사진',
    reliability_score DOUBLE       NOT NULL COMMENT '신뢰도 수치',
    PRIMARY KEY (auth_id),
    CONSTRAINT fk_item_authentication_item FOREIGN KEY (item_id) REFERENCES item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='물품 인증';

-- 8. 찜 목록
CREATE TABLE wishlist (
    wish_id   BIGINT   NOT NULL AUTO_INCREMENT COMMENT '찜 ID',
    user_id   BIGINT   NOT NULL COMMENT '찜 한 유저 ID',
    item_id   BIGINT   NOT NULL COMMENT '찜 된 물품 ID',
    wished_at DATETIME NOT NULL COMMENT '찜 등록 일시',
    PRIMARY KEY (wish_id),
    CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT fk_wishlist_item FOREIGN KEY (item_id) REFERENCES item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='찜 목록';

-- 9. 뱃지
CREATE TABLE badge (
    badge_id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '뱃지 ID',
    badge_name            VARCHAR(50)  NOT NULL COMMENT '뱃지명',
    badge_image           VARCHAR(500) NULL COMMENT '뱃지 이미지',
    achievement_condition VARCHAR(200) NOT NULL COMMENT '달성 조건',
    PRIMARY KEY (badge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='뱃지';

-- 10. 유저 뱃지
CREATE TABLE user_badge (
    id          BIGINT   NOT NULL AUTO_INCREMENT COMMENT 'ID',
    user_id     BIGINT   NOT NULL COMMENT '유저 ID',
    badge_id    BIGINT   NOT NULL COMMENT '뱃지 ID',
    achieved_at DATETIME NOT NULL COMMENT '달성 일자',
    PRIMARY KEY (id),
    CONSTRAINT fk_user_badge_user  FOREIGN KEY (user_id)  REFERENCES users (user_id),
    CONSTRAINT fk_user_badge_badge FOREIGN KEY (badge_id) REFERENCES badge (badge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='유저 뱃지';

-- 11. 거래 평가
CREATE TABLE trading_evaluation (
    eval_id          BIGINT      NOT NULL AUTO_INCREMENT COMMENT '평가 ID',
    item_id          BIGINT      NOT NULL COMMENT '물품 ID',
    user_id          BIGINT      NOT NULL COMMENT '회원 ID',
    member_type_code VARCHAR(50) NOT NULL COMMENT '회원 구분 코드',
    manner_score     INT         NOT NULL COMMENT '매너 평가 점수',
    comm_score       INT         NOT NULL COMMENT '소통 평가 점수',
    time_score       INT         NOT NULL COMMENT '시간 평가 점수',
    PRIMARY KEY (eval_id),
    CONSTRAINT fk_trading_evaluation_item FOREIGN KEY (item_id) REFERENCES item (item_id),
    CONSTRAINT fk_trading_evaluation_user FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='거래 평가';

-- 순환 참조 연결: item_sales, item_purchase가 만들어진 뒤에 users 외래키를 추가합니다.
ALTER TABLE users
    ADD CONSTRAINT fk_users_sales_record
        FOREIGN KEY (sales_record_id) REFERENCES item_sales (sales_id);

ALTER TABLE users
    ADD CONSTRAINT fk_users_purchase_record
        FOREIGN KEY (purchase_record_id) REFERENCES item_purchase (purchase_id);
