'use strict';

const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');

const auth = require('./src/auth');
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
  res.send('Axiora API');
});

app.put('/inventory', async (req, res) => {
  await auth();
  const { sku, quantity } = req.body;
  const updatedItems = await updateInventory(sku, quantity);
  res.json(updatedItems);
});

app.post('/shopify/order-created', async (req, res) => {
  await auth();
  const { line_items } = req.body;
  const orderCreatedResponse = await shopifyOrderCreated(line_items);
  res.json(orderCreatedResponse);
});

module.exports.handler = serverless(app);
