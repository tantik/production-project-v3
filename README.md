# Production Project v7

Deploy-ready AI sales system foundation for Japan.

Система помогает находить лидов, оценивать их, готовить мягкий outreach, отправлять сообщения, принимать ответы, вести follow-up, запускать кампании и управлять этим через dashboard/API.

> В этот архив **включён `.env`** с тестовым ключом, как ты попросил. Перед реальным продакшеном обязательно замени его на новый ключ.

## Что делает проект

Проект — это не просто генератор DM. Это каркас почти полноценной sales-операционной системы:

1. **Lead intake**  
   Получает лида из JSON, CSV, webhook или dashboard.

2. **Enrichment**  
   Анализирует нишу, tone of voice, booking flow, strengths, pain points.

3. **Scoring**  
   Даёт приоритет лидов: кому писать первым, кого пропустить, кого держать в очереди.

4. **Message generation**  
   Создаёт 3 варианта первого сообщения на японском, выбирает лучший и делает полировку.

5. **Approval policy**  
   В `dry_run` можно авто-одобрять. В `live` по умолчанию действует безопасная политика: требуется ручное подтверждение.

6. **Sending layer**  
   Есть adapters для Instagram / LINE / email. По умолчанию безопасный режим — `dry_run`.

7. **Inbox ingestion**  
   Принимает входящие ответы, сохраняет их, классифицирует intent и готовит следующий ответ.

8. **Conversation + CRM**  
   Хранит историю переписки, текущий статус, approvals, follow-ups, campaigns, suppression list.

9. **Campaigns**  
   Позволяет запускать отложенные кампании по выбранным лидам или по фильтрам.

10. **Operator dashboard**  
    Даёт интерфейс для проверки env, просмотров лидов, approvals, replies, suppression, analytics и ручных действий.

11. **Worker**  
    Отдельный процесс, который периодически обрабатывает due campaigns и due follow-ups.

---

## Основной flow

```text
lead -> enrich -> score -> generate -> select -> polish -> approve -> send -> inbound reply -> classify -> next action
```

Дополнительные safety-слои:
- suppression list
- send limits
- cooldown
- live approval policy
- follow-up cancellation after inbound reply

---

## Структура проекта

```text
agents/         Логика агентов: enrich, score, generate, select, polish, reply
analytics/      Сводки и метрики
approvals/      Хранение и обработка approval requests
batch/          Импорт/экспорт CSV
campaigns/      Кампании и scheduler
channels/       Отправка сообщений и channel adapters
config/         Бизнес-правила, статусы, лимиты, safety policy
crm/            Лиды, conversation history, inbound events
followups/      Очередь и обработка follow-up
guards/         Ограничения на отправку и safety checks
public/         Простая dashboard-страница
scripts/        CLI-команды для запуска и тестов
server/         HTTP API + dashboard server + webhooks
services/       env, db, auth, logger, openai client
suppression/    Suppression list
utils/          Утилиты
workflows/      Связанные сценарии (outreach, reply, approval, batch)
```

---

## Хранилище

### SQLite (по умолчанию)
Самый простой режим для локального запуска и тестов.

- База: `data/app.db`
- Ничего дополнительно поднимать не нужно

### Postgres
Нужен для более серьёзного деплоя.

Пример:
```env
DATABASE_URL=postgres://user:pass@host:5432/dbname
```

Если `DATABASE_URL` задан, проект автоматически переходит на Postgres.

---

## `.env` и зачем он нужен

В `.env` лежат секреты и настройки:

- `OPENAI_API_KEY` — генерация текста
- `DASHBOARD_PASSWORD` — пароль для dashboard
- `DASHBOARD_SESSION_SECRET` — подпись сессий
- `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` — LINE live mode
- `META_PAGE_ACCESS_TOKEN` / `INSTAGRAM_VERIFY_TOKEN` — Instagram live mode
- `DATABASE_URL` — Postgres
- `PORT` — HTTP порт
- `WORKER_INTERVAL_MS` — интервал worker’а

В этом архиве `.env` уже лежит. Для локального теста это удобно. Для реального продакшена — **обязательно заменить**.

---

## Команды

### Установить зависимости
```bash
npm install
```
Ставит все зависимости.

### Инициализировать базу
```bash
npm run db:init
```
Создаёт базу и таблицы.

### Проверить env
```bash
npm run env:check
```
Показывает, какие ключи и настройки видит проект.

### Проверить прод-готовность локально
```bash
npm run preflight
```
Показывает: есть ли `.env`, виден ли OpenAI key, какой database mode используется, включена ли live safety policy.

### Запустить demo outreach workflow
```bash
npm run start
```
Прогоняет demo лида через весь pipeline.

### Запустить API + dashboard
```bash
npm run server
```
Поднимает HTTP сервер.

### Запустить production entrypoint
```bash
npm run start:prod
```
Запускает сервер в production-стиле.

### Запустить worker loop
```bash
npm run worker
```
Постоянно обрабатывает due campaigns и due follow-ups.

### Однократный прогон worker
```bash
npm run worker:once
```
Один цикл worker’а — удобно для тестов и cron.

### Batch / CSV
```bash
npm run csv:import
npm run start:batch
npm run csv:export
```
Импорт лидов из CSV, обработка batch, экспорт результата.

### Demo сценарии
```bash
npm run reply:demo
npm run approval:demo
npm run followup:demo
npm run campaign:demo
npm run campaign:run
```
Проверяют reply flow, approval flow, follow-ups и campaigns.

---

## Локальный запуск шаг за шагом

```bash
npm install
npm run db:init
npm run env:check
npm run preflight
npm run start
npm run server
```

Открыть:
```text
http://localhost:3000
```

Если порт занят:
```bash
PORT=3101 npm run server
```

---

## Что есть в dashboard

Dashboard показывает:
- env summary
- analytics
- leads
- approvals
- follow-ups
- inbound events
- suppression list
- campaigns
- manual send / manual reply actions

### Что делает оператор
Оператор может:
- просмотреть лид
- посмотреть историю переписки
- вручную одобрить или отклонить сообщение
- отправить reply вручную
- запустить outreach по одному лиду
- добавить suppression
- создавать кампании

---

## API endpoints

### Public / semi-public
- `GET /api/health` — быстрый health check
- `GET /api/ready` — более полный readiness check
- `POST /api/login` — логин в dashboard
- `POST /api/logout` — logout
- `GET /webhooks/instagram` — verify webhook
- `POST /webhooks/instagram` — inbound Instagram events
- `POST /webhooks/line` — inbound LINE events

### Protected API
- `GET /api/env`
- `GET /api/leads`
- `GET /api/leads/:id`
- `GET /api/conversations/:leadId`
- `GET /api/approvals`
- `GET /api/followups`
- `GET /api/suppression`
- `GET /api/inbound-events`
- `GET /api/campaigns`
- `GET /api/analytics`
- `POST /api/approvals/:leadId/approve`
- `POST /api/approvals/:leadId/reject`
- `POST /api/outreach/run`
- `POST /api/replies/manual`
- `POST /api/operator/send`
- `POST /api/suppression`
- `POST /api/campaigns`
- `POST /api/campaigns/process-due`

---

## Live mode и безопасность

По умолчанию прод настроен безопасно:

```env
LIVE_REQUIRE_MANUAL_APPROVAL=true
LIVE_BLOCK_AUTO_APPROVE=true
```

Это значит:
- live auto-approve блокируется
- live send требует ручного approve

Почему это важно:
- чтобы случайно не устроить авто-рассылку
- чтобы оператор успевал проверять японский текст
- чтобы не сломать аккаунты резкими отправками

---

## Deploy-ready файлы

В v7 добавлены файлы для развёртывания:

- `Dockerfile` — собрать контейнер
- `docker-compose.yml` — app + worker + postgres
- `Procfile` — для платформ в стиле Heroku/Render
- `ecosystem.config.cjs` — для PM2
- `render.yaml` — пример для Render

---

## Примеры деплоя

### 1. Docker локально
```bash
docker compose up --build
```
Поднимет:
- web app
- worker
- postgres

### 2. PM2 на VPS
```bash
npm install
npm run db:init
pm2 start ecosystem.config.cjs
```

### 3. Cron + worker once
Если не хочешь постоянный worker loop, можешь вызывать worker раз в минуту:
```bash
* * * * * cd /path/to/project && npm run worker:once >> worker.log 2>&1
```

---

## Как это использовать вживую

### Минимально безопасный путь
1. Держать send mode = `dry_run`
2. Проверить dashboard
3. Проверить тексты
4. Проверить campaigns
5. Подключить реальные токены LINE / Instagram
6. Только потом включать отдельные live-сценарии

### Что важно перед продом
- заменить `.env`
- поставить новый OpenAI key
- задать `DASHBOARD_PASSWORD`
- задать `DASHBOARD_SESSION_SECRET`
- вынести базу в Postgres
- настроить HTTPS / reverse proxy
- настроить process manager (PM2, Docker, Render, Railway, VPS)

---

## Что проект делает хорошо уже сейчас

- даёт связанный outreach pipeline
- хранит состояние лида
- умеет принимать ответы
- умеет планировать follow-up
- умеет запускать кампании
- даёт dashboard и API
- готов к деплою локально или на VPS

## Что ещё не “магически готово” само собой

- не заменяет реальную sales-стратегию
- не даёт 100% качество reply-classification на любой японский ответ
- не гарантирует безопасность платформ, если включить агрессивный live outreach
- требует аккуратной настройки токенов, лимитов и approval-процесса

---

## Рекомендуемый следующий шаг после запуска v7

1. Локально протестировать SQLite + dashboard  
2. Прогнать CSV batch  
3. Поднять Postgres  
4. Проверить worker  
5. Подключить один реальный канал сначала в controlled mode  
6. Только потом переходить к более широкому live use
