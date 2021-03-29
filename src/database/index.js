const AWS = require('aws-sdk');
const { nanoid } = require('nanoid');

const USERS_TABLE = process.env.DYNAMODB_AXIORA_USERS_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const getUser = async id => {
  const params = {
    TableName: USERS_TABLE,
    Key: { id }
  };
  const { Item } = await dynamoDb.get(params).promise();
  return Item;
};

const getUserByEmail = async email => {
  const params = {
    TableName: USERS_TABLE,
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email
    },
    IndexName: 'email-index'
  };
  const { Items } = await dynamoDb.query(params).promise();
  if (Items && Items.length) {
    return Items[0];
  }
};

const createUser = async (email, password) => {
  const id = nanoid();
  const params = {
    TableName: USERS_TABLE,
    Item: {
      id,
      email,
      password,
      active: true,
      created_at: new Date().toISOString(),
      mercadolibre: [],
      shopify: []
    },
    ReturnValues: 'ALL_OLD'
  };
  await dynamoDb.put(params).promise();
  return {
    id
  };
};

const updateToken = async (userId, accessToken, refreshToken) => {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      id: userId
    },
    UpdateExpression:
      'set mercadolibre.access_token = :a, mercadolibre.refresh_token=:b',
    ExpressionAttributeValues: {
      ':a': accessToken,
      ':b': refreshToken
    },
    ReturnValues: 'UPDATED_NEW'
  };
  const { Attributes } = await dynamoDb.update(params).promise();
  return Attributes;
};

const database = {
  createUser,
  getUser,
  getUserByEmail,
  updateToken
};

module.exports = database;
