/**
 * Прямой тест Unisender Go sandbox через HTTP API.
 * Запуск: node scripts/test-unisender-sandbox.js
 */
const fs = require('fs');
const path = require('path');

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

function resolveFromEmail() {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM;
  const domain = process.env.UNISENDER_SANDBOX_DOMAIN;
  if (!domain) throw new Error('Задайте MAIL_FROM или UNISENDER_SANDBOX_DOMAIN в .env');
  const local = process.env.UNISENDER_SANDBOX_LOCAL || 'test';
  return `${local}@${domain}`;
}

function resolveApiUrl() {
  const host = process.env.SMTP_HOST || '';
  if (host.includes('go2.')) return 'https://go2.unisender.ru/ru/transactional/api/v1';
  if (host.includes('go1.')) return 'https://go1.unisender.ru/ru/transactional/api/v1';
  return 'https://goapi.unisender.ru/ru/transactional/api/v1';
}

async function sendTest(apiKey, apiUrl, fromEmail, toEmail) {
  const response = await fetch(`${apiUrl}/email/send.json`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      message: {
        recipients: [{ email: toEmail }],
        subject: 'Unisender Go sandbox test',
        from_email: fromEmail,
        from_name: 'Dev Landing Test',
        body: {
          html: '<p>Sandbox test OK</p>',
          plaintext: 'Sandbox test OK',
        },
      },
    }),
  });

  const text = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(text);

  if (!response.ok) process.exit(1);
}

async function main() {
  loadEnv();

  const apiKey = process.env.SMTP_PASS;
  const toEmail = process.env.OWNER_EMAIL;
  const fromEmail = resolveFromEmail();
  const apiUrl = resolveApiUrl();

  if (!apiKey) throw new Error('SMTP_PASS не задан в .env');
  if (!toEmail) throw new Error('OWNER_EMAIL не задан в .env');

  console.log('Unisender Go sandbox test');
  console.log(`API:    ${apiUrl}`);
  console.log(`From:   ${fromEmail}`);
  console.log(`To:     ${toEmail} (должен быть подтверждён в Unisender Go)`);
  console.log('');

  await sendTest(apiKey, apiUrl, fromEmail, toEmail);
  console.log('\nOK — проверьте почту');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
