'use strict';

const { SNS } = require('@aws-sdk/client-sns');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { AWS_ACCOUNT_ID, SNS_TOPIC_NAME } = process.env;

const sns = new SNS();

module.exports.handler = (event) => {
  const data = JSON.parse(event.body);
  const params = {
    Message: JSON.stringify({ ...data, channel: event.pathParameters.channel }),
    TopicArn: `arn:aws:sns:us-east-2:${AWS_ACCOUNT_ID}:${SNS_TOPIC_NAME}`,
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
