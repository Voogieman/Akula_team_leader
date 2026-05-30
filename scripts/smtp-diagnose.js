/**
 * Диагностика SMTP. Запуск: node scripts/smtp-diagnose.js
 * Пароль в консоль не выводится.
 */
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const nodemailer = require('nodemailer');

dns.setDefaultResultOrder('ipv4first');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Файл .env не найден');
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function tryVerify(label, options) {
  const transport = nodemailer.createTransport(options);
  const started = Date.now();
  try {
    await transport.verify();
    console.log(`✓ ${label} — OK (${Date.now() - started} ms)`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`✗ ${label} — ${msg}`);
    return false;
  } finally {
    transport.close();
  }
}

async function main() {
  loadEnv();

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const host = process.env.SMTP_HOST?.trim() || 'smtp.yandex.ru';

  console.log('=== SMTP диагностика ===\n');
  console.log('SMTP_USER:', user);
  console.log('SMTP_PASS длина:', pass?.length ?? 0, 'символов');
  console.log(
    'SMTP_PASS пробелы/кавычки:',
    pass !== process.env.SMTP_PASS ? 'есть лишние символы — проверьте .env' : 'нет',
  );
  console.log('SMTP_HOST из .env:', host);
  console.log('SMTP_PORT из .env:', process.env.SMTP_PORT);
  console.log('SMTP_SECURE из .env:', process.env.SMTP_SECURE);
  console.log('OWNER_EMAIL:', process.env.OWNER_EMAIL?.trim());
  console.log('');

  if (!user || !pass) {
    console.error('Заполните SMTP_USER и SMTP_PASS в .env');
    process.exit(1);
  }

  const auth = { user, pass };

  const variants = [
    ['Yandex 465 SSL', { host: 'smtp.yandex.ru', port: 465, secure: true, auth, tls: { servername: 'smtp.yandex.ru', minVersion: 'TLSv1.2' } }],
    ['Yandex 587 STARTTLS', { host: 'smtp.yandex.ru', port: 587, secure: false, requireTLS: true, auth, tls: { servername: 'smtp.yandex.ru', minVersion: 'TLSv1.2' } }],
    ['Yandex 465 без SSL (ошибочно)', { host: 'smtp.yandex.ru', port: 465, secure: false, auth }],
    ['login только local-part', { host: 'smtp.yandex.ru', port: 465, secure: true, auth: { user: user.split('@')[0], pass }, tls: { servername: 'smtp.yandex.ru' } }],
  ];

  console.log('--- Проверка подключения (verify) ---\n');
  for (const [label, opts] of variants) {
    await tryVerify(label, opts);
  }

  console.log('\n--- Если везде 535 / access rights ---');
  console.log('1. Нужен именно ПАРОЛЬ ПРИЛОЖЕНИЯ, не пароль от аккаунта Яндекс ID');
  console.log('2. id.yandex.ru → Безопасность → Пароли приложений → тип «Почта»');
  console.log('3. mail.yandex.ru → шестерёнка → «Почтовые программы» → доступ включён');
  console.log('4. Двухфакторная аутентификация должна быть включена (для паролей приложений)');
  console.log('5. После смены пароля — перезапустите npm run dev (Nest кэширует .env при старте)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
