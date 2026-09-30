# ARCH-4: проверка исходного поведения

Дата: 2026-09-30. Координатор/автор самопроверки: Codex.
Ветка `manage-2026-09-30`, исходный HEAD `c013f6e`.
Связанный [проект решения](../architecture/sync-resilience.md) пока не согласован.

Проверка выполнялась на `napominalky_stage_api`, отдельной БД `reminders_test` и отдельной
Docker-сети. Код backend этого артефакта совпадает с backend проверяемой ветки. Скрипты
проверяли имя БД до записи; созданные фикстуры откатывались/удалялись. Production не затронут.
Проверка Drizzle запускала установленный драйвер с записывающим команды fake SQLite client,
поэтому доказывает порядок команд драйвера, но не поведение native SQLite при аварии.

## Подтверждённые наблюдения

| № | Наблюдение | Фактический результат |
|---|---|---|
| F1 | Push item с несуществующим parent UUID | acknowledged=true, stored=false |
| F2 | Push note с color=teal → SyncSerializer | В БД teal; ключа color в ответе нет |
| F3 | Повтор той же note-мутации | server_revision увеличился повторно |
| F4 | Дважды отправлена одна проигрывающая LWW-версия | Две строки sync_conflicts |
| F5 | Item с quantity/deadline/reminder_at/link/comment/tags | Все шесть полей отсутствуют в sync-сериализации |
| F6 | Валидная note + item с INVALID_ENUM | ValueError; валидная note откатилась вместе с batch |
| F7 | Две PDO-транзакции: меньшая revision commit позже | Первый pull видит только большую; следующий пропускает меньшую |
| F8 | Реальный Drizzle transaction(async callback) | begin → INSERT domain → commit → INSERT outbox; rollback при поздней ошибке отсутствует |

F1–F6 вызывали существующий SyncPushService/SyncSerializer на тестовых моделях внутри
внешней тестовой транзакции с rollback. Это сервисный probe, не отдельный HTTP-тест.
F7 использовал две PDO-сессии для вставки notes с nextval и существующий SyncPullService;
временный пользователь и записи удалены после сценария. F8 использовал Drizzle 0.38.4
из установленного node_modules, `drizzle(fakeClient)` и async callback с ошибкой после await.
Диагностические скрипты этой сессии: `/tmp/napominalky-arch4/` (временные, не часть релиза).

Краткие результаты вывода:

```json
{
  "orphan": { "acknowledged": true, "stored": false },
  "note_roundtrip": { "stored_color": "teal", "serialized_color_present": false },
  "retry": { "revision_changed": true },
  "conflict_retry": { "conflict_backups": 2 },
  "item_roundtrip": { "missing_fields": ["quantity", "deadline", "reminder_at", "link", "comment", "tags"] },
  "batch_error": { "exception": "ValueError", "good_note_stored": false },
  "commit_order": { "slow_revision_lower": true, "first_page_only_fast": true, "slow_omitted_after_commit": true },
  "driver_transaction": { "trace": ["begin", "INSERT domain", "commit", "INSERT outbox"], "rolled_back": false }
}
```

## Проверка исходного кода

- [SyncPushService](../../backend/app/Services/Sync/SyncPushService.php): добавляет uuid в
  applied даже после null от create; одна DB::transaction на batch; lookup не блокирует
  конкурентную запись; повтор updated_at >= существующего вызывает ещё один save.
- [SyncChangeApplier](../../backend/app/Services/Sync/SyncChangeApplier.php): orphan item/
  comment и пустой delete неизвестного UUID возвращают null. Разные причины no-op
  не различаются результатом сервиса.
- [SyncSerializer](../../backend/app/Services/Sync/SyncSerializer.php) и
  [mappers](../../mobile/src/services/sync/mappers.ts): отсутствующие поля превращаются
  в null/1 на клиенте. Canonical-state применение без исправления serializer опасно.
- [TracksSyncRevision](../../backend/app/Models/Concerns/TracksSyncRevision.php) и
  [SyncPullService](../../backend/app/Services/Sync/SyncPullService.php): nextval выдаётся
  до commit, pull читает пять таблиц отдельными SELECT, курсор — максимум видимых строк.
- [BaseRepository](../../mobile/src/db/repositories/baseRepo.ts): доменная запись и
  enqueueOutbox — два отдельных awaited вызова, без общей транзакции, несмотря на
  комментарий в outbox.ts. Сбой между ними может оставить незарегистрированную правку.
- [resetLocalData](../../mobile/src/db/resetLocalData.ts): async callback в синхронном
  Drizzle transaction; отсутствует удаление shopping_list_item_comments.
- [applyChanges](../../mobile/src/services/sync/applyChanges.ts): нет проверки outbox,
  сравнение только по времени; ошибки записи ловятся, затем курсор всё равно сохраняется.
  Неполученные повторно записи не сохраняются в отдельном журнале.
- [pushChanges](../../mobile/src/services/sync/pushChanges.ts): MOB-68 защищает новые
  строки за границей отправленного снимка, но внутри batch результат всё ещё сопоставлен
  по entity UUID; точного соответствия отдельных мутаций в v1 нет.
- [useAuth](../../mobile/src/hooks/useAuth.ts): tryFlushSync считает успехом отсутствие
  исключения, хотя очередь после частичного ack может оставаться. Новый карантин обязан
  участвовать в logout guard. Session generation пока не защищает обработку старого ответа.

Риск pending-edit/pull следует непосредственно из отсутствия outbox guard и проверки
updated_at в applyChanges; отдельная проверка на устройстве здесь не выполнялась.
Исходный аудит REVIEW-1 не переписан: это дополнительные факты более поздней проверки.

## Влияние на план

Простое catch → rejected → finally pull не обеспечивает сохранности. В DEV-24 добавлены
предварительные шаги: полный round-trip, атомарный local CRUD/outbox, закрытый порядок
серверных ревизий и приёмный журнал. Предлагаемый v2 отделяет новые гарантии от старых
клиентов. API/схема/production на этапе ARCH-4 не изменялись.
