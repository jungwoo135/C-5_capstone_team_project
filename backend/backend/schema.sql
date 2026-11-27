-- ============================================================
-- 신중: 신뢰가는 중고거래 - MariaDB 전체 스키마 v3 (테이블 17개)
--
-- v2에서 바뀐 점 (이미 v2로 만든 DB는 이 파일 대신 migration-v3.sql을 실행하세요)
--   1. 1:1 채팅: chat_room, chat_message
--   2. 안전 장소 추천: chat_location(참여자 위치 제출), safe_place(경찰관서·CCTV 밀집 구역)
--   3. 거래 약속·도착 판별: appointment
--   4. 신고: report
--   5. trading_evaluation.review_text 추가 (한 줄 후기)
--
-- v1 → v2에서 바뀐 점
--   1. item.seller_id 추가: 물품을 등록한 판매자 (users 참조)
--   2. users.password_hash 추가: 로그인 비밀번호 해시
--   3. 중복 방지 제약 추가: 찜(유저+물품), 차단(차단자+대상), 평가(물품+작성자)
--
-- 생성 순서가 중요합니다.
--   users <-> item_sales, users <-> item_purchase 는 서로를 참조합니다.
--   아직 없는 테이블은 외래키로 참조할 수 없으므로,
--   users를 외래키 없이 먼저 만들고, 맨 아래 ALTER TABLE에서 연결합니다.
--
-- 명세에 길이가 없는 VARCHAR는 아래 길이로 정했습니다.
--   이름/코드류 50, 제목/조건류 200, 이미지 주소 500, 비밀번호 해시 255
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
    user_id            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '유저 ID',
    sales_record_id    BIGINT       NULL COMMENT '판매 기록',
    purchase_record_id BIGINT       NULL COMMENT '구매 기록',
    nickname           VARCHAR(50)  NOT NULL COMMENT '닉네임',
    password_hash      VARCHAR(255) NOT NULL COMMENT '비밀번호 해시 (비밀번호 원문은 저장하지 않음)',
    region_code        VARCHAR(50)  NOT NULL COMMENT '지역 코드',
    trust_score        INT          DEFAULT 50 COMMENT '신뢰점수',
    PRIMARY KEY (user_id),
    CONSTRAINT uk_users_nickname UNIQUE (nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='유저';

-- 3. 물품
CREATE TABLE item (
    item_id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '물품 ID',
    category_id       BIGINT       NOT NULL COMMENT '카테고리 ID',
    seller_id         BIGINT       NOT NULL COMMENT '판매자 ID (물품 등록자)',
    title             VARCHAR(200) NOT NULL COMMENT '제목',
    price             INT          NOT NULL COMMENT '가격',
    content           TEXT         NOT NULL COMMENT '본문 내용',
    item_image        VARCHAR(500) NULL COMMENT '제품 이미지',
    sales_status      VARCHAR(50)  NOT NULL COMMENT '판매 상태 (ON_SALE/RESERVED/SOLD)',
    ai_photo_verified BOOLEAN      NOT NULL COMMENT 'AI 사진 검토 여부',
    created_at        DATETIME     NOT NULL COMMENT '등록 일자',
    PRIMARY KEY (item_id),
    CONSTRAINT fk_item_category FOREIGN KEY (category_id) REFERENCES category (category_id),
    CONSTRAINT fk_item_seller   FOREIGN KEY (seller_id)   REFERENCES users (user_id)
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
    CONSTRAINT fk_block_list_blocked FOREIGN KEY (blocked_user_id) REFERENCES users (user_id),
    CONSTRAINT uk_block_pair UNIQUE (blocker_user_id, blocked_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='차단 목록';

-- 7. 물품 인증
CREATE TABLE item_authentication (
    auth_id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '인증 ID',
    item_id           BIGINT       NOT NULL COMMENT '물품 ID',
    auth_type         VARCHAR(50)  NOT NULL COMMENT '인증 유형',
    serial_number     VARCHAR(200) NULL COMMENT '시리얼 번호',
    auth_image        VARCHAR(500) NULL COMMENT '인증 사진',
    reliability_score DOUBLE       NOT NULL COMMENT '신뢰도 수치 (0~100, AI가 계산)',
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
    CONSTRAINT fk_wishlist_item FOREIGN KEY (item_id) REFERENCES item (item_id),
    CONSTRAINT uk_wishlist_user_item UNIQUE (user_id, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='찜 목록';

-- 9. 뱃지
CREATE TABLE badge (
    badge_id              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '뱃지 ID',
    badge_name            VARCHAR(50)  NOT NULL COMMENT '뱃지명',
    badge_image           VARCHAR(500) NULL COMMENT '뱃지 이미지',
    achievement_condition VARCHAR(200) NOT NULL COMMENT '달성 조건 (자동 부여: TRUST_SCORE>=80, TRADE_COUNT>=10 형식)',
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
    user_id          BIGINT      NOT NULL COMMENT '회원 ID (평가 작성자)',
    member_type_code VARCHAR(50) NOT NULL COMMENT '회원 구분 코드 (SELLER/BUYER)',
    manner_score     INT         NOT NULL COMMENT '매너 평가 점수 (1~5)',
    comm_score       INT         NOT NULL COMMENT '소통 평가 점수 (1~5)',
    time_score       INT         NOT NULL COMMENT '시간 평가 점수 (1~5)',
    review_text      VARCHAR(500) NULL COMMENT '한 줄 후기 (선택)',
    PRIMARY KEY (eval_id),
    CONSTRAINT fk_trading_evaluation_item FOREIGN KEY (item_id) REFERENCES item (item_id),
    CONSTRAINT fk_trading_evaluation_user FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT uk_eval_item_user UNIQUE (item_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='거래 평가';

-- 순환 참조 연결: item_sales, item_purchase가 만들어진 뒤에 users 외래키를 추가합니다.
ALTER TABLE users
    ADD CONSTRAINT fk_users_sales_record
        FOREIGN KEY (sales_record_id) REFERENCES item_sales (sales_id);

ALTER TABLE users
    ADD CONSTRAINT fk_users_purchase_record
        FOREIGN KEY (purchase_record_id) REFERENCES item_purchase (purchase_id);

-- ============================================================
-- v3 추가 테이블 (채팅 · 안전 장소 · 약속 · 신고)
-- ============================================================

-- 12. 채팅방: 물품 하나에 구매 희망자 한 명당 방 하나
CREATE TABLE chat_room (
    room_id         BIGINT   NOT NULL AUTO_INCREMENT COMMENT '채팅방 ID',
    item_id         BIGINT   NOT NULL COMMENT '물품 ID',
    seller_id       BIGINT   NOT NULL COMMENT '판매자 ID (물품 등록자)',
    buyer_id        BIGINT   NOT NULL COMMENT '구매 희망자 ID (방을 연 사람)',
    created_at      DATETIME NOT NULL COMMENT '방 생성 일시',
    last_message_at DATETIME NULL COMMENT '마지막 메시지 일시 (목록 정렬용)',
    PRIMARY KEY (room_id),
    CONSTRAINT fk_chat_room_item   FOREIGN KEY (item_id)   REFERENCES item (item_id),
    CONSTRAINT fk_chat_room_seller FOREIGN KEY (seller_id) REFERENCES users (user_id),
    CONSTRAINT fk_chat_room_buyer  FOREIGN KEY (buyer_id)  REFERENCES users (user_id),
    CONSTRAINT uk_chat_room_item_buyer UNIQUE (item_id, buyer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅방';

-- 13. 채팅 메시지 (로그 저장)
CREATE TABLE chat_message (
    message_id BIGINT        NOT NULL AUTO_INCREMENT COMMENT '메시지 ID (클수록 최신, 폴링 기준값)',
    room_id    BIGINT        NOT NULL COMMENT '채팅방 ID',
    sender_id  BIGINT        NOT NULL COMMENT '보낸 유저 ID',
    content    VARCHAR(1000) NOT NULL COMMENT '내용 (1~1000자)',
    created_at DATETIME      NOT NULL COMMENT '보낸 일시',
    read_at    DATETIME      NULL COMMENT '상대가 읽은 일시 (NULL이면 안 읽음)',
    PRIMARY KEY (message_id),
    CONSTRAINT fk_chat_message_room   FOREIGN KEY (room_id)   REFERENCES chat_room (room_id),
    CONSTRAINT fk_chat_message_sender FOREIGN KEY (sender_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅 메시지';
CREATE INDEX idx_chat_message_room ON chat_message (room_id, message_id);

-- 14. 채팅방 위치 제출: 안전 장소 추천을 위해 참여자가 각자 자기 위치만 제출 (상대에게 노출하지 않음)
CREATE TABLE chat_location (
    room_id      BIGINT   NOT NULL COMMENT '채팅방 ID',
    user_id      BIGINT   NOT NULL COMMENT '제출한 유저 ID',
    latitude     DOUBLE   NOT NULL COMMENT '위도',
    longitude    DOUBLE   NOT NULL COMMENT '경도',
    submitted_at DATETIME NOT NULL COMMENT '제출 일시',
    PRIMARY KEY (room_id, user_id),
    CONSTRAINT fk_chat_location_room FOREIGN KEY (room_id) REFERENCES chat_room (room_id),
    CONSTRAINT fk_chat_location_user FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅방 참여자 위치';

-- 15. 안전 장소: 공공데이터에서 적재 (경찰관서 1건 = 1행, CCTV는 약 100m 격자로 묶어 1행)
CREATE TABLE safe_place (
    place_id   BIGINT       NOT NULL AUTO_INCREMENT COMMENT '장소 ID',
    place_type VARCHAR(20)  NOT NULL COMMENT '종류 (POLICE: 경찰서·지구대·파출소 / CCTV: CCTV 밀집 구역)',
    place_name VARCHAR(200) NOT NULL COMMENT '장소명',
    address    VARCHAR(300) NULL COMMENT '주소',
    latitude   DOUBLE       NOT NULL COMMENT '위도',
    longitude  DOUBLE       NOT NULL COMMENT '경도',
    cctv_count INT          NULL COMMENT 'CCTV 구역일 때 카메라 대수',
    source     VARCHAR(100) NULL COMMENT '데이터 출처',
    PRIMARY KEY (place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='안전 장소';
CREATE INDEX idx_safe_place_latlng ON safe_place (latitude, longitude);

-- 16. 거래 약속: 장소·시간 저장과 도착 판별
CREATE TABLE appointment (
    appointment_id    BIGINT       NOT NULL AUTO_INCREMENT COMMENT '약속 ID',
    room_id           BIGINT       NOT NULL COMMENT '채팅방 ID',
    item_id           BIGINT       NOT NULL COMMENT '물품 ID',
    seller_id         BIGINT       NOT NULL COMMENT '판매자 ID',
    buyer_id          BIGINT       NOT NULL COMMENT '구매자 ID',
    proposed_by       BIGINT       NOT NULL COMMENT '약속을 제안한 유저 ID',
    place_name        VARCHAR(200) NOT NULL COMMENT '약속 장소명',
    latitude          DOUBLE       NOT NULL COMMENT '약속 장소 위도',
    longitude         DOUBLE       NOT NULL COMMENT '약속 장소 경도',
    scheduled_at      DATETIME     NOT NULL COMMENT '약속 일시',
    status            VARCHAR(20)  NOT NULL COMMENT '상태 (PROPOSED 제안됨 / CONFIRMED 확정 / DONE 둘 다 도착 / CANCELLED 취소)',
    seller_arrived_at DATETIME     NULL COMMENT '판매자 도착 확인 일시',
    buyer_arrived_at  DATETIME     NULL COMMENT '구매자 도착 확인 일시',
    created_at        DATETIME     NOT NULL COMMENT '생성 일시',
    PRIMARY KEY (appointment_id),
    CONSTRAINT fk_appointment_room   FOREIGN KEY (room_id)     REFERENCES chat_room (room_id),
    CONSTRAINT fk_appointment_item   FOREIGN KEY (item_id)     REFERENCES item (item_id),
    CONSTRAINT fk_appointment_seller FOREIGN KEY (seller_id)   REFERENCES users (user_id),
    CONSTRAINT fk_appointment_buyer  FOREIGN KEY (buyer_id)    REFERENCES users (user_id),
    CONSTRAINT fk_appointment_prop   FOREIGN KEY (proposed_by) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='거래 약속';
CREATE INDEX idx_appointment_room ON appointment (room_id, status);

-- 17. 신고: 유저·물품·메시지 (같은 대상은 한 사람이 한 번만)
CREATE TABLE report (
    report_id   BIGINT        NOT NULL AUTO_INCREMENT COMMENT '신고 ID',
    reporter_id BIGINT        NOT NULL COMMENT '신고한 유저 ID',
    target_type VARCHAR(20)   NOT NULL COMMENT '대상 종류 (USER / ITEM / MESSAGE)',
    target_id   BIGINT        NOT NULL COMMENT '대상 ID (유저 ID, 물품 ID, 메시지 ID 중 하나)',
    reason      VARCHAR(50)   NOT NULL COMMENT '사유 코드 (FRAUD 사기 / ABUSE 욕설·괴롭힘 / SPAM 광고 / FAKE 허위·가품 / OTHER 기타)',
    detail      VARCHAR(1000) NULL COMMENT '상세 내용 (선택)',
    created_at  DATETIME      NOT NULL COMMENT '신고 일시',
    PRIMARY KEY (report_id),
    CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES users (user_id),
    CONSTRAINT uk_report_once UNIQUE (reporter_id, target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='신고';
