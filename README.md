# Лендинг-презентация разработчика

**Автор:** Гулиев Вугар Шахид оглы  
**GitHub:** https://github.com/Voogieman  
**Репозиторий:** https://github.com/Voogieman/Akula_team_leader  
**Демо:** https://akula-team-leader.onrender.com

---

## Как протестировать демо

На демо используется **sandbox-домен Unisender Go**. Письма можно отправлять **только на подтверждённые email-адреса** — не более **10 адресов** в личном кабинете Unisender Go (**Учётная запись → Подтверждённые email-адреса**). Каждый новый адрес подтверждается по ссылке из письма.

**Как проверить форму:**

1. Откройте [демо](https://akula-team-leader.onrender.com/) → секция «Контакты».
2. В поле **Email** укажите **любой адрес из подтверждённого списка** (например `gulievvug@yandex.ru`).
3. Заполните имя, телефон и комментарий (не короче 10 символов) → «Отправить».
4. Придут **2 письма**: заявка владельцу и копия на указанный email.

---

## Как запустить проект

**Требования:** Node.js 18+, npm

```bash
git clone https://github.com/Voogieman/Akula_team_leader.git
cd Akula_team_leader
npm install --include=dev
cp .env.example .env
```

Заполните `.env` (см. `.env.example`):

- **Почта:** `SMTP_*`, `MAIL_FROM`, `OWNER_EMAIL` (Unisender Go)
- **AI:** `OPENAI_API_KEY`, `OPENAI_BASE_URL=https://api.proxyapi.ru/openai/v1`

**Разработка:**

```bash
npm run dev
```

- Сайт: http://localhost:5173  
- API: http://localhost:3001  

**Production:**

```bash
npm run build
set NODE_ENV=production
npm start
```

---

## Какой стек использован

| Часть | Технологии |
|-------|------------|
| Frontend | HTML5, SCSS, TypeScript, Vite |
| Backend | Node.js, NestJS, Zod |
| Почта | Nodemailer, Unisender Go (SMTP локально / HTTP API на Render) |
| AI | OpenAI API через ProxyAPI (`gpt-4o-mini`) |
| Тесты | Jest |

---

## Как реализована форма

**Поля:** имя, телефон, email, комментарий.

**Frontend** (`client/src/modules/contact-form.ts`):

- HTML5-валидация, ошибки по полям
- Состояния UI: **loading**, **success**, **error**
- `POST /api/contact`

**Backend** (`ContactController` → `ContactService` → `MailService`):

- Валидация Zod (`server/src/schemas/contact.schema.ts`)
- **2 письма:** владельцу (`OWNER_EMAIL`) и копия пользователю
- Коды ошибок: 400 / 503 / 500 / 429

**Цикл:**

```
Форма → POST /api/contact → Zod → MailService → 2 письма → success/error на UI
```

---

## Какие AI-инструменты использовались

**При разработке:**

| Инструмент | Назначение |
|------------|------------|
| Cursor (Claude) | Каркас проекта, NestJS-модули, SCSS, README, отладка |
| ChatGPT | Тексты секций лендинга |

**В продукте (блок AI Helper):**

| Инструмент | Назначение |
|------------|------------|
| ProxyAPI | Доступ к OpenAI из РФ |
| OpenAI API | `POST /api/ai/summary`, модель `gpt-4o-mini` |

---

## Что делалось с помощью ИИ

- Структура проекта (`client/` + `server/`)
- Черновики NestJS-модулей (contact, ai, mail) и Zod-схем
- Базовая вёрстка, SCSS, адаптивное меню
- Черновик API-клиента и обработчиков формы
- Первичный вариант README

---

## Что пришлось исправлять вручную

- Данные лендинга из резюме (контакты, кейсы, ссылки GitHub)
- Настройка Unisender Go (sandbox на демо, деплой на Render)
- Переход OpenAI → ProxyAPI для работы из РФ
- Сборка NestJS (`dist/main.js`, watch-режим)
- Обработка ошибок формы и API, rate limit, escape HTML в письмах
- a11y (`aria-*`, skip-link), Jest-тесты AI-модуля
- Финальная проверка: frontend → API → почта / AI → UI
