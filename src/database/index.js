const AWS = require('aws-sdk');

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
  getUser,
  updateToken
};

module.exports = database;
