'use strict';

const mercadolibreApi = require('./api/mercadolibre');

const auth = () => {
  // Get token and user id from dynamo...
  const mercadolibreToken = '';
  mercadolibreApi.setToken(mercadolibreToken);
  mercadolibreApi.setUserId();
};

module.exports = auth;
