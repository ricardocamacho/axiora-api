import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import * as dotenv from 'dotenv'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const { AWS_ACCOUNT_REGION } = process.env;

const client = new SESv2Client({
  region: AWS_ACCOUNT_REGION
});

const contact = async (email: string, name: string, phone: string, message: string) => {
  const formattedMessage = `Email: ${email}\nName: ${name}\nPhone: ${phone}\nMessage: ${message}`;
  const input = { // SendEmailRequest
    FromEmailAddress: "hello@codingsquad.co",
    Destination: { // Destination
      ToAddresses: [ // EmailAddressList
        'hello@codingsquad.co',
      ],
    },
    ReplyToAddresses: [
      email,
    ],
    Content: { // EmailContent
      Simple: { // Message
        Subject: { // Content
          Data: 'Inquiry from CodingSquad', // required
        },
        Body: { // Body
          Text: {
            Data: formattedMessage, // required
          },
        },
      },
    },
  };
  const command = new SendEmailCommand(input);
  await client.send(command);
  return true;
};

export default contact;
