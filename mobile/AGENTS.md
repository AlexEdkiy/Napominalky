# Mobile: Expo SDK 54

Перед изменениями Expo API сверяй `package.json` и lock-файл с документацией
установленной версии: https://docs.expo.dev/versions/v54.0.0/.
Текущий стек: Expo 54, React Native 0.81, React 19.1; переход на другой SDK — отдельная задача.

Читай `../docs/04-typescript-rn.md`; соблюдай local-first и атомарную запись
доменных изменений с outbox. Подтверждение push удаляет только отправленные строки
очереди, а не новые правки той же сущности. Лимит `/sync/push` — 500 изменений.

Проверки: `npm run typecheck`, `npm test -- --runInBand`.
