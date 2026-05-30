/**
 * HTTP-тесты AI endpoint. Сервер должен быть запущен: npm run dev:server
 * Запуск: node scripts/test-ai-api.js
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

async function request(name, body) {
  const res = await fetch(`${API}/api/ai/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { parseError: true };
  }
  return { name, status: res.status, data };
}

async function main() {
  loadEnv();
  console.log(`=== AI API tests → ${API} ===\n`);
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'задан' : 'нет');
  console.log('OPENAI_BASE_URL:', process.env.OPENAI_BASE_URL || '(по умолчанию)');
  console.log('');

  const cases = [
    { name: 'валидная тема', body: { topic: 'PostgreSQL индексы' } },
    { name: 'короткая тема (400)', body: { topic: 'ab' } },
    { name: 'пустое тело (400)', body: {} },
  ];

  let passed = 0;
  for (const c of cases) {
    try {
      const r = await request(c.name, c.body);
      const ok =
        c.name.includes('валидная')
          ? r.status === 200 && r.data.ok === true && r.data.summary
          : r.status === 400 && r.data.ok === false;
      console.log(ok ? '✓' : '✗', c.name, '→', r.status, JSON.stringify(r.data).slice(0, 120));
      if (ok) passed++;
      if (r.data.summary) {
        console.log('  summary:', r.data.summary.slice(0, 100) + '...\n');
      }
    } catch (e) {
      console.log('✗', c.name, '→', e.message);
      if (e.cause?.code === 'ECONNREFUSED') {
        console.log('  Запустите backend: npm run dev:server\n');
        process.exit(1);
      }
    }
  }

  console.log(`\nИтого: ${passed}/${cases.length} проверок`);
  process.exit(passed === cases.length ? 0 : 1);
}

main();
