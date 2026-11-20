-- ============================================================
-- 뱃지 기본 데이터 (선택 사항)
--
-- 실행: mysql -h <RDS주소> -u admin -p --ssl-ca=$HOME/global-bundle.pem --ssl-verify-server-cert < backend/seed-badges.sql
-- 주의: 실행할 때마다 같은 뱃지가 또 추가되므로 한 번만 실행하세요.
--
-- achievement_condition 형식 (이 형식이어야 자동 부여됩니다)
--   TRADE_COUNT>=N : 판매+구매 완료 횟수 합계가 N 이상
--   TRUST_SCORE>=N : 신뢰점수가 N 이상
-- 다른 문구로 적으면 자동 부여 대상에서 빠지고, 수동 부여용으로만 남습니다.
-- ============================================================

USE shinjung;

INSERT INTO badge (badge_name, badge_image, achievement_condition) VALUES
('첫 거래', NULL, 'TRADE_COUNT>=1'),
('거래 단골', NULL, 'TRADE_COUNT>=10'),
('믿을 만한 이웃', NULL, 'TRUST_SCORE>=70'),
('신뢰왕', NULL, 'TRUST_SCORE>=90');
