import { SQSHandler, SQSEvent } from 'aws-lambda';
import { mercadolibre } from '../mercadolibre';

export const handler: SQSHandler = async (event: SQSEvent) => {
  for(const message of event.Records) {
    const notification = JSON.parse(message.body);
    console.log('Processing notification', notification);
    await mercadolibre.handleNotification(notification);
  }
};
