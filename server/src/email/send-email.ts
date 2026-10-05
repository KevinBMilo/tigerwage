import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let sesClient: SESv2Client | null = null;

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (process.env.EMAIL_MODE !== 'ses') {
    console.log('\n---------- EMAIL (console mode, not sent) ----------');
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log('');
    console.log(message.text);
    console.log('----------------------------------------------------\n');
    return;
  }

  sesClient ??= new SESv2Client({ region: process.env.AWS_REGION });

  await sesClient.send(
    new SendEmailCommand({
      FromEmailAddress: process.env.EMAIL_FROM,
      Destination: { ToAddresses: [message.to] },
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: message.text, Charset: 'UTF-8' },
            Html: { Data: message.html, Charset: 'UTF-8' },
          },
        },
      },
    })
  );
}