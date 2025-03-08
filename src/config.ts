import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

export default {
  STAGE: process.env.STAGE,
  AWS_ACCOUNT_ID: process.env.AWS_ACCOUNT_ID,
  AWS_ACCOUNT_REGION: process.env.AWS_ACCOUNT_REGION,
  DYNAMODB_AXIORA_TABLE: process.env.DYNAMODB_AXIORA_TABLE,
  SNS_TOPIC_NAME: process.env.SNS_TOPIC_NAME,
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
  MELI_CLIENT_ID: process.env.MELI_CLIENT_ID,
  MELI_CLIENT_SECRET: process.env.MELI_CLIENT_SECRET,
  SLACK_WEBHOOK_PATH: process.env.SLACK_WEBHOOK_PATH,
};
