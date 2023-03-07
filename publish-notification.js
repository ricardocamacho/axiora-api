'use strict';

const { SNS } = require('@aws-sdk/client-sns');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { AWS_ACCOUNT_ID, SNS_TOPIC_NAME } = process.env;

const sns = new SNS();

const TOPIC_ARN = `arn:aws:sns:us-east-2:${AWS_ACCOUNT_ID}:${SNS_TOPIC_NAME}`;
const DEFAULT_MESSAGE_GROUP_ID = 'default-message-group-id';

module.exports.handler = (event) => {
  const data = JSON.parse(event.body);
  const params = {
    Message: JSON.stringify({ ...data, channel: event.pathParameters.channel }),
    TopicArn: TOPIC_ARN,
    MessageGroupId: DEFAULT_MESSAGE_GROUP_ID
  };

  if (data.topic !== 'orders_v2') {
    console.log('Not an order notification');
    return;
  }

  sns.publish(params, (error) => {
    if (error) {
      console.error('Notification publish error', error);
    } else {
      console.log('Notification published');
    }
  });
};
