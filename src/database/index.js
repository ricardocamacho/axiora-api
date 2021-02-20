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

const database = {
  getUser
};

module.exports = database;
