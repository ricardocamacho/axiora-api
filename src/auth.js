'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const database = require('./database');
const mercadolibreApi = require('./api/mercadolibre');
const shopifyApi = require('./api/shopify');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const verifyTokenMiddleware = async (req, res, next) => {
  let token = req.headers.authorization;
  if (!token) return res.status(401).send({ error: 'Token is not provided' });
  token = token.split('Bearer ')[1];
  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.email = decoded.email;
    next();
  } catch (err) {
    return res.status(401).send({ error: 'Token is invalid' });
  }
};

const signUp = async (email, password) => {
  const hash = await bcrypt.hash(password, 10);
  const { created_at } = await database.createUser(email, hash);
  const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY);
  return {
    email,
    created_at,
    token
  };
};

const signIn = async (email, password) => {
  const { hash } = await database.getUser(email);
  const compareResult = await bcrypt.compare(password, hash);
  if (!compareResult) {
    throw Error('Email and password does not match');
  }
  const token = jwt.sign({ email }, process.env.JWT_SECRET_KEY);
  return {
    email,
    token
  };
};

const channelsSetAuth = async email => {
  const stores = await database.getStores(email);
  const mercadolibreStores = stores
    .filter(store => store.channel === 'mercadolibre')
    .map(store => store.data);
  mercadolibreApi.setStores(mercadolibreStores);
  const shopifyStore = stores.find(store => store.channel === 'shopify');
  if (shopifyStore) {
    shopifyApi.createAxiosInstance(shopifyStore.data.base_url);
    shopifyApi.setToken(shopifyStore.data.access_token);
    shopifyApi.setLocationId(shopifyStore.data.location_id);
  }
};

module.exports = {
  verifyTokenMiddleware,
  signUp,
  signIn,
  channelsSetAuth
};
