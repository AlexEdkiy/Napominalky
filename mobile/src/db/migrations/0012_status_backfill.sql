-- Бэкфилл инварианта status ⇔ done-флаг, упущенный в 0010: колонка status
-- получила дефолт 'new' для всех существующих строк (включая давно
-- выполненные is_checked=1), а серверные статусы старых записей без сброса
-- pull-курсора не подтягиваются. До первого полного pull (и в offline)
-- восстанавливаем только пары done⇔флаг; осмысленные статусы
-- (in_progress/postponed) не трогаем — их принесёт полный pull (LWW).
UPDATE `shopping_list_items` SET `status` = 'done' WHERE `is_checked` = 1 AND `status` = 'new';--> statement-breakpoint
UPDATE `shopping_lists` SET `status` = 'done', `status_is_manual` = 1 WHERE `is_completed` = 1 AND `type` = 'tasks' AND `status` = 'new';
