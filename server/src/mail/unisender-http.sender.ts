export type ContactMailContent = {
  fromName: string;
  fromEmail: string;
  ownerEmail: string;
  userEmail: string;
  subjectOwner: string;
  subjectUser: string;
  ownerHtml: string;
  userHtml: string;
  ownerText: string;
  userText: string;
};

export async function sendViaUnisenderHttp(
  apiKey: string,
  apiUrl: string,
  content: ContactMailContent,
): Promise<void> {
  const baseUrl = apiUrl.replace(/\/$/, '');

  await postEmail(baseUrl, apiKey, {
    to: content.ownerEmail,
    replyTo: content.userEmail,
    subject: content.subjectOwner,
    html: content.ownerHtml,
    text: content.ownerText,
    fromEmail: content.fromEmail,
    fromName: content.fromName,
  });

  await postEmail(baseUrl, apiKey, {
    to: content.userEmail,
    subject: content.subjectUser,
    html: content.userHtml,
    text: content.userText,
    fromEmail: content.fromEmail,
    fromName: content.fromName,
  });
}

async function postEmail(
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
