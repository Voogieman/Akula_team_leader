# Лендинг-презентация разработчика

**Автор:** Гулиев Вугар Шахид оглы  
**GitHub:** https://github.com/Voogieman  
**Репозиторий проекта:** https://github.com/Voogieman/Akula_team_leader  
**Демо:** https://akula-team-leader.onrender.com

Одностраничный лендинг с формой обратной связи, backend API (NestJS) и AI-интеграцией (ProxyAPI + OpenAI).

---

## Как запустить проект

### Требования

- Node.js 18+
- npm

### Установка

```bash
git clone <url-репозитория>
cd Akula_team_leader
npm install --include=dev
cp .env.example .env
```

Заполните `.env` (см. `.env.example`):

- **Почта:** Unisender Go SMTP — `SMTP_*`, `MAIL_FROM`, `OWNER_EMAIL` (см. `.env.example`)
- **AI:** `OPENAI_API_KEY`, `OPENAI_BASE_URL=https://api.proxyapi.ru/openai/v1`

### Режим разработки

```bash
npm run dev
```

- Сайт: http://localhost:5173  
- API: http://localhost:3001  
- Запросы `/api/*` проксируются через Vite на backend

### Production-сборка

```bash
npm run build
set NODE_ENV=production
npm start
```

Приложение отдаёт frontend из `dist/client` и API на одном порту (`PORT`, по умолчанию 3001).

### Структура проекта

```
client/          — HTML, SCSS, TypeScript (Vite)
server/src/      — NestJS: contact, ai, mail, schemas
.env.example     — переменные окружения
render.yaml      — конфиг деплоя на Render
```

---

## Какой стек использован

| Часть | Технологии |
|-------|------------|
| Frontend | HTML5, SCSS, TypeScript, Vite |
| Backend | Node.js, NestJS, Zod |
| Почта | Nodemailer + Unisender Go SMTP (локально) / HTTP API на Render Free |
| AI | OpenAI API через ProxyAPI, модель `gpt-4o-mini` |
| Тесты | Jest |

---

## Как реализована форма

### Поля

Имя, телефон, email, комментарий.

### Frontend

- Файл: `client/src/modules/contact-form.ts`
- HTML5-валидация + вывод ошибок по каждому полю
- Состояния UI: **loading** (спиннер на кнопке), **success** и **error** (alert-блок)
- Запрос: `POST /api/contact` через `client/src/api/client.ts`

### Backend

- Endpoint: `POST /api/contact`
- Модули: `ContactController` → `ContactService` → `MailService`
- Серверная валидация: Zod (`server/src/schemas/contact.schema.ts`)
- Отправка двух писем через **Nodemailer + SMTP** (Unisender Go):
  1. владельцу сайта (`OWNER_EMAIL`) — данные заявки;
  2. копия пользователю на email из формы
- Обработка ошибок: `ApiExceptionFilter`, коды 400 / 503 / 500 / 429

### Настройка SMTP (Unisender Go)

[Конфигурация SMTP](https://go2.unisender.ru/ru/settings/smtp-configuration)

На **Render Free** SMTP-порт 587 [заблокирован](https://render.com/docs/free) — backend отправляет через **HTTP API** (тот же `SMTP_PASS`).

#### Sandbox-домен (тест)

1. Unisender Go → **Домены отправки** → «Получить тестовый домен»
2. **Подтверждённые email-адреса** → добавьте `OWNER_EMAIL` и email для тестов формы
3. В `.env` / Render:

| Переменная | Значение |
|------------|----------|
| `UNISENDER_SANDBOX_DOMAIN` | `sandbox-8227938-990634.unigosendbox.com` |
| `MAIL_FROM` | `test@sandbox-8227938-990634.unigosendbox.com` |
| `SMTP_USER` | числовой логин (`8227938`) |
| `SMTP_PASS` | пароль из «Конфигурация SMTP» |
| `OWNER_EMAIL` | **подтверждённый** email получателя |

> Sandbox: письма можно отправлять **только на подтверждённые адреса** (в т.ч. email в поле формы).

**Тест sandbox API:**

```bash
npm run test:unisender
npm run test:contact
API_URL=https://akula-team-leader.onrender.com npm run test:contact
```

#### Переменные (prod / локально)

| Переменная | Значение |
|------------|----------|
| `SMTP_HOST` | `smtp.go2.unisender.ru` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | числовой логин |
| `SMTP_PASS` | пароль SMTP / API |
| `MAIL_FROM` | sandbox или подтверждённый email |
| `OWNER_EMAIL` | куда приходят заявки |

На **Render** → **Environment** → **Manual Deploy**.

### Полный цикл

```
Форма (UI) → POST /api/contact → Zod → Nodemailer → 2 письма → success/error на странице
```

---

## Какие AI-инструменты использовались

### При разработке проекта

| Инструмент | Назначение |
|------------|------------|
| **Cursor (Claude)** | Генерация каркаса, NestJS-модулей, SCSS, README, отладка |
| **ChatGPT** | Формулировки текстов секций лендинга |

### В продукте (блок AI Helper на сайте)

| Инструмент | Назначение |
|------------|------------|
| **ProxyAPI** | Доступ к OpenAI API из РФ |
| **OpenAI API** | Генерация краткого объяснения темы (`gpt-4o-mini`) |

Endpoint: `POST /api/ai/summary` — пользователь вводит тему, backend возвращает текст. На UI: loading / success / error.

---

## Что делалось с помощью ИИ

- Структура проекта (`client/` + `server/`)
- Черновики NestJS-модулей (contact, ai, mail) и Zod-схем
- Базовая вёрстка лендинга, SCSS-сетка, адаптивное меню
- Черновик API-клиента и обработчиков формы на frontend
- Первичный вариант README и диагностических скриптов

---

## Что пришлось исправлять вручную

- Заполнение лендинга данными из резюме (имя, контакты, кейсы, ссылки на GitHub)
- Настройка Unisender Go SMTP: `smtp.go2.unisender.ru:587`, `MAIL_FROM`, пароль из кабинета
- Переход с прямого OpenAI на **ProxyAPI** (`OPENAI_BASE_URL=https://api.proxyapi.ru/openai/v1`)
- Исправление сборки NestJS (`dist/main.js`, watch-режим, `deleteOutDir`)
- Доработка обработки ошибок: `ApiError`, полевые ошибки с сервера, rate limit, SMTP-сообщения
- Escape HTML в письмах, a11y-атрибуты (`aria-*`, skip-link)
- Написание и прогон Jest-тестов для AI-модуля
- Финальная проверка полного цикла: frontend → API → почта / AI → результат на UI

---

## API (справочно)

| Method | Path | Описание |
|--------|------|----------|
| GET | `/api/health` | Проверка работы API |
| POST | `/api/contact` | Форма обратной связи |
| POST | `/api/ai/summary` | AI Helper `{ "topic": "..." }` |
