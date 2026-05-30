import type { MailPayload } from './mail-payload';

const DEFAULT_API_URL =
  'https://goapi.unisender.ru/ru/transactional/api/v1';

export async function sendViaUnisender(
  apiKey: string,
  payload: MailPayload,
  apiUrl = DEFAULT_API_URL,
): Promise<void> {
  const baseUrl = apiUrl.replace(/\/$/, '');

  await sendUnisenderMessage(baseUrl, apiKey, {
    to: payload.ownerEmail,
    replyTo: payload.userEmail,
    subject: payload.subjectOwner,
    html: payload.ownerHtml,
    text: payload.ownerText,
    fromEmail: payload.fromEmail,
    fromName: payload.fromName,
  });

  await sendUnisenderMessage(baseUrl, apiKey, {
    to: payload.userEmail,
    subject: payload.subjectUser,
    html: payload.userHtml,
    text: payload.userText,
    fromEmail: payload.fromEmail,
    fromName: payload.fromName,
  });
}

async function sendUnisenderMessage(
  baseUrl: string,
  apiKey: string,
  options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    fromEmail: string;
    fromName: string;
    replyTo?: string;
  },
): Promise<void> {
  const response = await fetch(`${baseUrl}/email/send.json`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      message: {
        recipients: [{ email: options.to }],
        subject: options.subject,
        from_email: options.fromEmail,
        from_name: options.fromName,
        reply_to: options.replyTo,
        skip_unsubscribe: 1,
        body: {
          html: options.html,
          plaintext: options.text,
        },
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Unisender ${response.status}: ${details}`);
  }
}
