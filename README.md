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

- **Почта (локально):** `SMTP_*`, `OWNER_EMAIL` — Яндекс.Почта, пароль приложения
- **Почта (Render):** `UNISENDER_API_KEY`, `MAIL_FROM`, `OWNER_EMAIL` — см. раздел ниже
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
| Почта (локально) | Nodemailer, SMTP (Яндекс.Почта) |
| Почта (Render) | Unisender Go API (HTTPS) — обход блокировки SMTP на Free tier |
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
- Отправка двух писем:
  1. владельцу сайта (`OWNER_EMAIL`) — данные заявки;
  2. копия пользователю на email из формы
- **Локально:** Nodemailer → Яндекс SMTP (`server/src/mail/mail.service.ts`)
- **На Render (Free):** Unisender Go REST API (`server/src/mail/unisender-mail.sender.ts`) — SMTP-порты 465/587 заблокированы платформой
- Обработка ошибок: `ApiExceptionFilter`, коды 400 / 503 / 500 / 429

### Почта на Render (Unisender Go)

[Render Free](https://render.com/docs/free) не пропускает исходящий SMTP (порты 465/587). На проде используется **Unisender Go** — российский сервис, регистрация с российским номером (+7), отправка через HTTPS.

> Brevo из РФ часто недоступен (требует иностранный телефон). Unisender Go — основной вариант для деплоя.

**Настройка Unisender Go (один раз):**

1. Регистрация: [unisender.com](https://www.unisender.com) → продукт **Unisender Go**
2. Подтвердите email или домен отправителя (тот же, что в `MAIL_FROM`)
3. **Настройки → API** → скопируйте API-ключ

**Переменные на Render → Environment:**

| Переменная | Пример | Обязательно |
|------------|--------|-------------|
| `UNISENDER_API_KEY` | ключ из Unisender Go | да |
| `MAIL_FROM` | ваш `@yandex.ru` | да |
| `OWNER_EMAIL` | куда приходят заявки | да |
| `NODE_ENV` | `production` | да |
| `UNISENDER_API_URL` | `https://goapi.unisender.ru/ru/transactional/api/v1` | нет (по умолчанию) |
| `SMTP_*` | — | нет (на Render не используются, если задан `UNISENDER_API_KEY`) |

После сохранения — **Manual Deploy** → Deploy latest commit.

### Полный цикл

```
Форма (UI) → POST /api/contact → Zod → MailService → 2 письма → success/error на странице
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
- Настройка Яндекс SMTP: `SMTP_SECURE=true`, пароль приложения, доступ в настройках почты
- Отправка на Render Free: переход на **Unisender Go API** (SMTP заблокирован; Brevo из РФ недоступен)
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
