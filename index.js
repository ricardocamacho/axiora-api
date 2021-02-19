'use strict';

const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');

const auth = require('./src/auth');
const updateInventory = require('./src/update-inventory');

const app = express();

app.use(bodyParser.json({ strict: false }));

app.get('/', (req, res) => {
  res.send('Axiora API');
});

app.put('/inventory', async (req, res) => {
  auth();
  const { sku, quantity } = req.body;
  const updatedItems = await updateInventory(sku, quantity);
  res.json(updatedItems);
});

module.exports.handler = serverless(app);
