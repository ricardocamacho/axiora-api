import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as dotenv from 'dotenv'

import { Channel, DbMercadolibreData, DbShopifyData, DbStore } from '../types/common';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

type ChannelAccountId = number | string;

type User = {
  last_integration_date: string,
  hash: string
};

const { AWS_ACCOUNT_REGION, DYNAMODB_AXIORA_TABLE: AXIORA_TABLE } = process.env;

const dynamoDbClient = new DynamoDBClient({ region: AWS_ACCOUNT_REGION });

const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

const getUser = async (email: string): Promise<User> => {
  const params = {
    TableName: AXIORA_TABLE,
    KeyConditionExpression: 'PK = :email and SK = :profile',
    ExpressionAttributeValues: {
      ':email': `USER#${email}`,
      ':profile': 'PROFILE'
    }
  };
  const { Items: items, Count: count } = await dynamoDb.send(new QueryCommand(params));
  if (count === 0) {
    throw Error('User not found');
  }
  return items?.[0] as User;
};

const createUser = async (email: string, hash: string) => {
  const created_at = new Date().toISOString();
  const params = {
    TableName: AXIORA_TABLE,
    Item: {
      PK: `USER#${email}`,
      SK: 'PROFILE',
      hash,
      active: true,
      created_at
    },
    ConditionExpression: 'PK <> :email AND SK <> :profile',
    ExpressionAttributeValues: {
      ':email': `USER#${email}`,
      ':profile': 'PROFILE'
    },
    ReturnValues: 'ALL_OLD'
  };
  await dynamoDb.send(new PutCommand(params));
  return {
    email,
    created_at
  };
};

const updateUserLastIntegrationDate = async (email: string, lastIntegrationDate: string) => {
  const params = {
    TableName: AXIORA_TABLE,
    Key: { PK: `USER#${email}`, SK: 'PROFILE' },
    UpdateExpression: 'set last_integration_date = :last_integration_date',
    ExpressionAttributeValues: {
      ':last_integration_date': lastIntegrationDate
    },
    ReturnValues: 'UPDATED_NEW'
  };
  const updated = await dynamoDb.send(new UpdateCommand(params));
  return updated;
};

const getStores = async (email: string): Promise<DbStore<DbMercadolibreData | DbShopifyData>[]> =>  {
  const params = {
    TableName: AXIORA_TABLE,
    KeyConditionExpression: 'PK = :email and begins_with(SK,:beginsWith)',
    ExpressionAttributeValues: {
      ':email': `USER#${email}`,
      ':beginsWith': 'STORE#'
    }
  };
  const { Items: items } = await dynamoDb.send(new QueryCommand(params));
  const activeStores = items?.filter(item => item.status === 'ACTIVE') || [];
  return activeStores as (DbStore<DbMercadolibreData | DbShopifyData>[]);
};

const getStore = async (channelAccountId: ChannelAccountId) => {
  const params = {
    TableName: AXIORA_TABLE,
    IndexName: 'SK-PK-index',
    KeyConditionExpression: 'SK = :store',
    ExpressionAttributeValues: {
      ':store': `STORE#${channelAccountId}`
    }
  };
  const { Items: items, Count: count } = await dynamoDb.send(new QueryCommand(params));
  if (count === 0) {
    throw Error('Store does not exist');
  }
  return items?.[0];
};

const addStore = async (email: string, channel: Channel, channelAccountId: ChannelAccountId, storeData: DbMercadolibreData | DbShopifyData) => {
  const created_at = new Date().toISOString();
  const params = {
    TableName: AXIORA_TABLE,
    Item: {
      PK: `USER#${email}`,
      SK: `STORE#${channelAccountId}`,
      channel,
      data: storeData,
      status: 'ACTIVE',
      created_at
    },
    ConditionExpression: 'PK <> :email AND SK <> :store',
    ExpressionAttributeValues: {
      ':email': `USER#${email}`,
      ':store': `STORE#${channelAccountId}`
    },
    ReturnValues: 'ALL_OLD'
  };
  await dynamoDb.send(new PutCommand(params));
  return { created_at };
};

const updateStore = async (PK: string, channelAccountId: ChannelAccountId, storeData: DbMercadolibreData | DbShopifyData) => {
  const params = {
    TableName: AXIORA_TABLE,
    Key: { PK, SK: `STORE#${channelAccountId}` },
    UpdateExpression: 'set #data = :data',
    ExpressionAttributeNames: { '#data': 'data' },
    ExpressionAttributeValues: {
      ':data': storeData
    },
    ReturnValues: 'UPDATED_NEW'
  };
  const updated = await dynamoDb.send(new UpdateCommand(params));
  return updated;
};

const getOrder = async (channelAccountId: ChannelAccountId, orderId: number) => {
  const params = {
    TableName: AXIORA_TABLE,
    KeyConditionExpression: 'PK = :store and SK = :order',
    ExpressionAttributeValues: {
      ':store': `STORE#${channelAccountId}`,
      ':order': `ORDER#${orderId}`
    }
  };
  const { Items: items, Count: count } = await dynamoDb.send(new QueryCommand(params));
  if (count === 0) {
    throw Error('Order does not exist');
  }
  return items;
};

const addOrder = async (channelAccountId: ChannelAccountId, orderId: number, channel: Channel, created: string) => {
  const params = {
    TableName: AXIORA_TABLE,
    Item: {
      PK: `STORE#${channelAccountId}`,
      SK: `ORDER#${orderId}`,
      channel,
      created,
      // ttl for 15 day
      ttl: Math.floor(Date.now() / 1000) + (15 * 24 * 60 * 60),
    },
    ConditionExpression: 'PK <> :store AND SK <> :order',
    ExpressionAttributeValues: {
      ':store': `STORE#${channelAccountId}`,
      ':order': `ORDER#${orderId}`
    },
    ReturnValues: 'ALL_OLD'
  };
  await dynamoDb.send(new PutCommand(params));
  return true;
};

export const database = {
  createUser,
  getUser,
  updateUserLastIntegrationDate,
  getStores,
  getStore,
  addStore,
  updateStore,
  getOrder,
  addOrder
};
