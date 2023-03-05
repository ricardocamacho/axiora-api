const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { AWS_ACCOUNT_REGION, DYNAMODB_AXIORA_TABLE: AXIORA_TABLE } = process.env;

const dynamoDbClient = new DynamoDBClient({ region: AWS_ACCOUNT_REGION });

const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

const getUser = async email => {
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
  await dynamoDb.send(new PutCommand(params));
  return {
    email,
    created_at
  };
};

const updateUserLastIntegrationDate = async (email, lastIntegrationDate) => {
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

const getStores = async email => {
  const params = {
    TableName: AXIORA_TABLE,
    KeyConditionExpression: 'PK = :email and begins_with(SK,:beginsWith)',
    ExpressionAttributeValues: {
      ':email': `USER#${email}`,
      ':beginsWith': 'STORE#'
    }
  };
  const { Items: items } = await dynamoDb.send(new QueryCommand(params));
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
  const { Items: items, Count: count } = await dynamoDb.send(new QueryCommand(params));
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
  await dynamoDb.send(new PutCommand(params));
  return { created_at };
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
  const updated = await dynamoDb.send(new UpdateCommand(params));
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
  const { Items: items, Count: count } = await dynamoDb.send(new QueryCommand(params));
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
  await dynamoDb.send(new PutCommand(params));
  return true;
};

const database = {
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

module.exports = database;
