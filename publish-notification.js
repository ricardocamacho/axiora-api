'use strict';

const { SNS } = require('@aws-sdk/client-sns');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { AWS_ACCOUNT_ID, SNS_TOPIC_NAME } = process.env;

const sns = new SNS();

module.exports.handler = (event, context, callback) => {
  const data = JSON.parse(event.body);
  const params = {
    Message: JSON.stringify({ ...data, channel: event.pathParameters.channel }),
    TopicArn: `arn:aws:sns:us-east-2:${AWS_ACCOUNT_ID}:${SNS_TOPIC_NAME}`,
  };

  sns.publish(params, (error) => {
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t send the event due an internal error. Please try again later.',
      });
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully sent the event to the processNotification SNS' }),
    };
    console.log('Publishing notification');
    callback(null, response);
  });
};
