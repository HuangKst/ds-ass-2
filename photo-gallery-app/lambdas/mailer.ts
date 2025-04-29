import { SQSHandler } from 'aws-lambda';
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-ses';

const SES_REGION = process.env.SES_REGION || 'eu-west-1';
const SES_EMAIL_FROM = process.env.SES_EMAIL_FROM || '20108869@mail.wit.ie';
const SES_EMAIL_TO = process.env.SES_EMAIL_TO || 'huangzihan.2003@gmail.com';

const client = new SESClient({ region: SES_REGION });

export const handler: SQSHandler = async (event) => {
  console.log('Received email notification event:', JSON.stringify(event));
  
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      const { id, update } = message;
      const { status, reason } = update;

      const subject = `Photo Status Update: ${id}`;
      const html = `
        <html>
          <body>
            <h2>Your photo (${id}) has been reviewed.</h2>
            <p><b>Status:</b> ${status}</p>
            <p><b>Reason:</b> ${reason}</p>
          </body>
        </html>
      `;

      const params: SendEmailCommandInput = {
        Destination: {
          ToAddresses: [SES_EMAIL_TO],
        },
        Message: {
          Subject: {
            Charset: 'UTF-8',
            Data: subject,
          },
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: html,
            },
          },
        },
        Source: SES_EMAIL_FROM,
      };

      console.log(`Sending email for image: ${id}, to: ${SES_EMAIL_TO}, from: ${SES_EMAIL_FROM}`);
      await client.send(new SendEmailCommand(params));
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
};
