const AWS = require('aws-sdk');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const AXIORA_TABLE = process.env.DYNAMODB_AXIORA_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const getUser = async email => {
  const params = {
    TableName: AXIORA_TABLE,
    KeyConditionExpression: 'PK = :email and SK = :profile',
    ExpressionAttributeValues: {
      ':email': `USER#${email}`,
      ':profile': 'PROFILE'
    }
  };
  const { Items: items, Count: count } = await dynamoDb.query(params).promise();
  if (count === 0) {
    throw Error('User not found');
  }
  return items[0];
};

const createUser = async (email, hash) => {
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
  await dynamoDb.put(params).promise();
  return {
    email,
    created_at
  };
};

const getStores = async email => {
  const params = {
    TableName: AXIORA_TABLE,
    KeyConditionExpression: 'PK = :email and begins_with(SK,:beginsWith)',
    ExpressionAttributeValues: {
      ':email': `USER#${email}`,
      ':beginsWith': 'STORE#'
    }
  };
  const { Items: items, Count: count } = await dynamoDb.query(params).promise();
  const activeStores = items.filter(item => item.status === 'ACTIVE');
  return activeStores;
};

const getStore = async channelAccountId => {
  const params = {
    TableName: AXIORA_TABLE,
    IndexName: 'SK-PK-index',
    KeyConditionExpression: 'SK = :store',
    ExpressionAttributeValues: {
      ':store': `STORE#${channelAccountId}`
    }
  };
  const { Items: items, Count: count } = await dynamoDb.query(params).promise();
  if (count === 0) {
    throw Error('Store does not exist');
  }
  return items[0];
};

const addStore = async (email, channel, channelAccountId, storeData) => {
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
  await dynamoDb.put(params).promise();
  return true;
};

const updateStore = async (PK, channelAccountId, storeData) => {
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
  const updated = await dynamoDb.update(params).promise();
  return updated;
};

const getOrder = async (channelAccountId, orderId) => {
  const params = {
    TableName: AXIORA_TABLE,
    KeyConditionExpression: 'PK = :store and SK = :order',
    ExpressionAttributeValues: {
      ':store': `STORE#${channelAccountId}`,
      ':order': `ORDER#${orderId}`
    }
  };
  const { Items: items, Count: count } = await dynamoDb.query(params).promise();
  if (count === 0) {
    throw Error('Order does not exist');
  }
  return items;
};

const addOrder = async (channelAccountId, orderId, channel, created) => {
  const params = {
    TableName: AXIORA_TABLE,
    Item: {
      PK: `STORE#${channelAccountId}`,
      SK: `ORDER#${orderId}`,
      channel,
      created
    },
    ConditionExpression: 'PK <> :store AND SK <> :order',
    ExpressionAttributeValues: {
      ':store': `STORE#${channelAccountId}`,
      ':order': `ORDER#${orderId}`
    },
    ReturnValues: 'ALL_OLD'
  };
  await dynamoDb.put(params).promise();
  return true;
};

const database = {
  createUser,
  getUser,
  getStores,
  getStore,
  addStore,
  updateStore,
  getOrder,
  addOrder
};

module.exports = database;
