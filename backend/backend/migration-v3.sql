-- ============================================================
-- 신중 DB 마이그레이션 v2 → v3 (기존 데이터를 지우지 않습니다)
--
-- 대상: schema.sql v2(또는 migration-v2.sql 적용)로 운영 중인 DB (AWS RDS)
-- 실행: mysql -h <RDS주소> -u admin -p --ssl-ca=$HOME/global-bundle.pem --ssl-verify-server-cert < backend/migration-v3.sql
-- 특징: IF NOT EXISTS를 써서 실수로 두 번 실행해도 안전합니다.
--
-- 추가되는 것
--   1. 1:1 채팅: chat_room, chat_message
--   2. 안전 장소 추천: chat_location(참여자 위치 제출), safe_place(경찰관서·CCTV 밀집 구역)
--   3. 거래 약속·도착 판별: appointment
--   4. 신고: report
--   5. trading_evaluation.review_text (한 줄 후기, NULL 허용이라 기존 행에 영향 없음)
--
-- safe_place 데이터는 이 파일이 넣지 않습니다. backend/load-safe-places.mjs 로 공공데이터 CSV를 적재하세요.
-- ============================================================

USE shinjung;

-- 5. 평가 한 줄 후기
ALTER TABLE trading_evaluation ADD COLUMN IF NOT EXISTS review_text VARCHAR(500) NULL COMMENT '한 줄 후기 (선택)' AFTER time_score;

-- 1. 채팅
CREATE TABLE IF NOT EXISTS chat_room (
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

CREATE TABLE IF NOT EXISTS chat_message (
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
CREATE INDEX IF NOT EXISTS idx_chat_message_room ON chat_message (room_id, message_id);

-- 2. 안전 장소
CREATE TABLE IF NOT EXISTS chat_location (
    room_id      BIGINT   NOT NULL COMMENT '채팅방 ID',
    user_id      BIGINT   NOT NULL COMMENT '제출한 유저 ID',
    latitude     DOUBLE   NOT NULL COMMENT '위도',
    longitude    DOUBLE   NOT NULL COMMENT '경도',
    submitted_at DATETIME NOT NULL COMMENT '제출 일시',
    PRIMARY KEY (room_id, user_id),
    CONSTRAINT fk_chat_location_room FOREIGN KEY (room_id) REFERENCES chat_room (room_id),
    CONSTRAINT fk_chat_location_user FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅방 참여자 위치';

CREATE TABLE IF NOT EXISTS safe_place (
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
CREATE INDEX IF NOT EXISTS idx_safe_place_latlng ON safe_place (latitude, longitude);

-- 3. 거래 약속
CREATE TABLE IF NOT EXISTS appointment (
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
CREATE INDEX IF NOT EXISTS idx_appointment_room ON appointment (room_id, status);

-- 4. 신고
CREATE TABLE IF NOT EXISTS report (
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
