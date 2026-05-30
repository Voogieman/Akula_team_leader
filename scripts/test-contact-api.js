/**
 * Тест формы /api/contact. Сервер: npm run dev или NODE_ENV=production npm start
 * Локально: node scripts/test-contact-api.js
 * Render:  API_URL=https://akula-team-leader.onrender.com node scripts/test-contact-api.js
 */
const fs = require('fs');
const path = require('path');

const API = process.env.API_URL || 'http://localhost:3001';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}

async function main() {
  loadEnv();

  const body = {
    name: 'Test Contact',
    phone: '+79092864847',
    email: process.env.OWNER_EMAIL || 'test@example.com',
    comment: 'Проверка отправки через Unisender Go API',
  };

  console.log(`POST ${API}/api/contact`);
  const res = await fetch(`${API}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(text);

  if (!res.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
