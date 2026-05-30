import type { MailPayload } from './mail-payload';

export type { MailPayload };

export async function sendViaBrevo(
  apiKey: string,
  payload: MailPayload,
): Promise<void> {
  await sendBrevoMessage(apiKey, {
    sender: { name: payload.fromName, email: payload.fromEmail },
    to: [{ email: payload.ownerEmail }],
    replyTo: { email: payload.userEmail },
    subject: payload.subjectOwner,
    htmlContent: payload.ownerHtml,
    textContent: payload.ownerText,
  });

  await sendBrevoMessage(apiKey, {
    sender: { name: payload.fromName, email: payload.fromEmail },
    to: [{ email: payload.userEmail }],
    subject: payload.subjectUser,
    htmlContent: payload.userHtml,
    textContent: payload.userText,
  });
}

async function sendBrevoMessage(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<void> {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Brevo ${response.status}: ${details}`);
  }
}
