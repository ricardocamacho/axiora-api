'use strict';

const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const auth = require('./src/auth');
const mercadolibre = require('./src/mercadolibre');
const shopify = require('./src/shopify');
const updateInventory = require('./src/update-inventory');
const shopifyOrderCreated = require('./src/webhooks/shopify-order-created');

const app = express();

app.use(
  cors({
    origin: [
      'http://mercadolibre-gogo.s3-website.us-east-2.amazonaws.com',
      'http://localhost:3000'
    ]
  })
);
app.use(bodyParser.json({ strict: false }));

app.get('/', (req, res) => {
  res.send('Axiora API ' + process.env.STAGE);
});

app.post('/sign-up', async (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    try {
      const { created_at, token } = await auth.signUp(email, password);
      res.status(201).send({
        email,
        created_at,
        token
      });
    } catch (error) {
      res.status(400).send({
        error: error.name,
        message: error.message
      });
    }
  } else {
    res.status(400).send({
      error: 'Email and password are required'
    });
  }
});

app.post('/sign-in', async (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    try {
      const { token } = await auth.signIn(email, password);
      res.status(200).send({
        email,
        token
      });
    } catch (error) {
      res.status(400).send({
        error: error.name,
        message: error.message
      });
    }
  } else {
    res.status(400).send({
      error: 'Email and password are required'
    });
  }
});

app.post(
  '/mercadolibre/store',
  auth.verifyTokenMiddleware,
  async (req, res) => {
    const { meliUserId, code, redirectUri } = req.body;
    try {
      const created = await mercadolibre.addStore(
        req.email,
        meliUserId,
        code,
        redirectUri
      );
      res.status(201).send({
        created
      });
    } catch (error) {
      res.status(400).send({
        error: error.name,
        message: error.message
      });
    }
  }
);

app.get(
  '/mercadolibre/questions',
  auth.verifyTokenMiddleware,
  async (req, res) => {
    await auth.channelsSetAuth(req.email);
    const questions = await mercadolibre.getQuestions();
    res.status(200).send(questions);
  }
);

app.put('/inventory', auth.verifyTokenMiddleware, async (req, res) => {
  await auth.channelsSetAuth(req.email);
  const { sku, quantity } = req.body;
  const updatedItems = await updateInventory(req.email, sku, quantity);
  res.json(updatedItems);
});

app.post('/shopify/product', auth.verifyTokenMiddleware, async (req, res) => {
  await auth.channelsSetAuth(req.email);
  const createdProduct = await shopify.createProduct(req.body);
  res.json(createdProduct);
});

app.post('/shopify/order-created/:email', async (req, res) => {
  await auth.channelsSetAuth(req.params.email);
  const orderCreatedResponse = await shopifyOrderCreated(
    req.params.email,
    req.body
  );
  console.log('Shopify order created', orderCreatedResponse);
  res.json(orderCreatedResponse);
});

module.exports.handler = serverless(app);
