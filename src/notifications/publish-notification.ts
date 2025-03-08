import { APIGatewayEvent, Handler } from 'aws-lambda';
import { SNS } from '@aws-sdk/client-sns';
import { Notification } from '../types/mercadolibre';

const { AWS_ACCOUNT_ID, AWS_ACCOUNT_REGION, SNS_TOPIC_NAME } = process.env;

const sns = new SNS({ region: AWS_ACCOUNT_REGION });

const TOPIC_ARN = `arn:aws:sns:${AWS_ACCOUNT_REGION}:${AWS_ACCOUNT_ID}:${SNS_TOPIC_NAME}`;
const DEFAULT_MESSAGE_GROUP_ID = 'default-message-group-id';

export const handler: Handler = (event: APIGatewayEvent): void => {
  const data: Notification = JSON.parse(event.body || '{}');
  const params = {
    Message: JSON.stringify({ ...data, channel: event.pathParameters?.channel }),
    TopicArn: TOPIC_ARN,
    MessageGroupId: DEFAULT_MESSAGE_GROUP_ID
  };

  if (data.topic !== 'orders_v2') {
    console.log('Not an order notification');
    return;
  }

  sns.publish(params, (error: any) => {
    if (error) {
      console.error('Notification publish error', error);
    } else {
      console.log('Notification published');
    }
  });
};
