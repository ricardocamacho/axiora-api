'use strict';

const database = require('./database');
const mercadolibreApi = require('./api/mercadolibre');

const auth = async () => {
  const user = await database.getUser('1');
  // Get token and user id from dynamo...
  mercadolibreApi.setToken(user.mercadolibre.access_token);
  mercadolibreApi.setUserId(user.mercadolibre.user_id);
};

module.exports = auth;
