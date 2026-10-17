-- 留言收音机：每条留言在创建时分配一个 FM 频率（88.5 ～ 107.5），之后永不改变。
-- 允许 NULL：分配失败或旧数据没有频率时，前端按 app/lib/guestbook-radio.ts 的同一规则临时补算。
ALTER TABLE messages ADD COLUMN frequency REAL;

-- 回填线上已有的三条留言（按 assignRadioFrequency 依次算出；id 6「bro,认可」固定在原型里的 90.5）。
-- 本地库里没有这些 id 时，这几条 UPDATE 不会影响任何行。
UPDATE messages SET frequency = 90.5 WHERE id = 6 AND frequency IS NULL;
UPDATE messages SET frequency = 91.7 WHERE id = 7 AND frequency IS NULL;
UPDATE messages SET frequency = 92.9 WHERE id = 8 AND frequency IS NULL;
