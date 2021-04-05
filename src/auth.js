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
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).send({ error: 'Token is invalid' });
  }
};

const signUp = async (email, password) => {
  const hash = await bcrypt.hash(password, 10);
  const {
    ref: { id: userId }
  } = await database.createUser(email, hash);
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET_KEY);
  return {
    userId,
    token
  };
};

const signIn = async (email, password) => {
  const {
    data: { password: userPassword },
    ref: { id: userId }
  } = await database.getUserByEmail(email);
  if (!userId) {
    throw Error('User not found');
  }
  const compareResult = await bcrypt.compare(password, userPassword);
  if (!compareResult) {
    throw Error('Email and password does not match');
  }
  const token = jwt.sign({ userId, email }, process.env.JWT_SECRET_KEY);
  return {
    userId,
    token
  };
};

const channelsSetAuth = async userId => {
  const { data: stores } = await database.getStores(userId);
  const mercadolibreStores = stores
    .filter(store => store.data.channel === 'mercadolibre')
    .map(store => store.data);
  mercadolibreApi.setStores(mercadolibreStores, userId);
  const { data: user } = await database.getUser(userId);
  if (user.shopify) {
    shopifyApi.createAxiosInstance(user.shopify.base_url);
    shopifyApi.setToken(user.shopify.access_token);
    shopifyApi.setLocationId(user.shopify.location_id);
  }
};

module.exports = {
  verifyTokenMiddleware,
  signUp,
  signIn,
  channelsSetAuth
};
