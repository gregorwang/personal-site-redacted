-- 首页赛博终端换成「构建记录」后，隐藏补给 token、Echo Token 和对应的 /api/claim-token 都已删除（2026-10-15）。
-- 这两张表不再有代码读写，整表删除；删除后数据无法恢复。
DROP INDEX IF EXISTS idx_hidden_supply_interactions_echo_code;
DROP INDEX IF EXISTS idx_hidden_supply_interactions_user_id;
DROP TABLE IF EXISTS hidden_supply_interactions;

DROP INDEX IF EXISTS idx_redeem_tokens_user_id;
DROP TABLE IF EXISTS redeem_tokens;
