-- ============================================================
-- 신중 DB 마이그레이션 v1 → v2 (기존 데이터를 지우지 않습니다)
--
-- 대상: schema.sql v1으로 이미 만들어 둔 운영 DB (AWS RDS)
-- 실행: mysql -h <RDS주소> -u admin -p --ssl-ca=$HOME/global-bundle.pem --ssl-verify-server-cert < backend/migration-v2.sql
-- 특징: IF NOT EXISTS를 써서 실수로 두 번 실행해도 안전합니다.
--
-- 바뀌는 내용
--   1. item.seller_id 추가 (물품 등록자, users 참조)
--      - 기존 물품은 판매자 정보가 없으므로, 가장 먼저 만든 유저를 판매자로 채웁니다.
--      - 유저가 한 명도 없는 상태에서 물품만 있으면 실패합니다. (현재 운영 DB는 해당 없음)
--   2. users.password_hash 추가 (로그인 비밀번호 해시)
--      - 기존 테스트 유저는 '!'(로그인 불가 표시)로 채워집니다. 로그인하려면 새로 가입하세요.
--   3. 중복 방지 제약 추가: 찜, 차단, 거래 평가
--      - 이미 중복 데이터가 들어 있으면 해당 줄에서 실패합니다. 그때는 중복 행을 지우고 다시 실행하세요.
-- ============================================================

USE shinjung;

-- 1. item.seller_id
ALTER TABLE item ADD COLUMN IF NOT EXISTS seller_id BIGINT NULL COMMENT '판매자 ID (물품 등록자)' AFTER category_id;
UPDATE item SET seller_id = (SELECT MIN(user_id) FROM users) WHERE seller_id IS NULL;
ALTER TABLE item MODIFY seller_id BIGINT NOT NULL COMMENT '판매자 ID (물품 등록자)';
ALTER TABLE item ADD CONSTRAINT fk_item_seller FOREIGN KEY IF NOT EXISTS (seller_id) REFERENCES users (user_id);

-- 2. users.password_hash
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '!' COMMENT '비밀번호 해시 (비밀번호 원문은 저장하지 않음)' AFTER nickname;
ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT;

-- 3. 중복 방지 제약
ALTER TABLE wishlist ADD CONSTRAINT uk_wishlist_user_item UNIQUE KEY IF NOT EXISTS (user_id, item_id);
ALTER TABLE block_list ADD CONSTRAINT uk_block_pair UNIQUE KEY IF NOT EXISTS (blocker_user_id, blocked_user_id);
ALTER TABLE trading_evaluation ADD CONSTRAINT uk_eval_item_user UNIQUE KEY IF NOT EXISTS (item_id, user_id);
