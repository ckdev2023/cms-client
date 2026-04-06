-- 007_portal rollback: 按依赖反序删除 Portal 域 6 张表

drop table if exists intake_forms;
drop table if exists user_documents;
drop table if exists messages;
drop table if exists conversations;
drop table if exists leads;
drop table if exists app_users;
