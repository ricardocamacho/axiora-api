import serverless from 'serverless-http';
import * as bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

import { auth } from './src/auth';
import { axiora } from './src/axiora';
import { mercadolibre } from './src/mercadolibre';
import { shopify } from './src/shopify';
import { updateInventory } from './src/update-inventory';
import shopifyOrderCreated from './src/webhooks/shopify-order-created';

const app = express();

app.use(
  cors({
    origin: [
      'https://dev.axiora.co',
      'https://axiora.co',
      'http://mercadolibre-gogo.s3-website.us-east-2.amazonaws.com',
      'http://localhost:3000'
    ]
  })
);
app.use(bodyParser.json({ strict: false }));

app.get('/', (req: Request, res: Response) => {
  res.send('Axiora API ' + process.env.STAGE);
});

app.post('/', (req: Request, res: Response) => {
  res.send('Axiora API POST req, env ' + process.env.STAGE);
});

app.post('/sign-up', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (email && password) {
    try {
      const { created_at, token } = await auth.signUp(email, password);
      res.status(201).send({
        email,
        created_at,
        token
      });
    } catch (error: any) {
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

app.post('/sign-in', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (email && password) {
    try {
      const { token } = await auth.signIn(email, password);
      res.status(200).send({
        email,
        token
      });
    } catch (error: any) {
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

app.get('/stores', auth.verifyTokenMiddleware, async (req: Request, res: Response) => {
  await auth.channelsSetAuth(res.locals.email);
  const stores = await axiora.getStores(res.locals.email);
  res.status(200).send(stores);
});

app.post(
  '/mercadolibre/store',
  auth.verifyTokenMiddleware,
  async (req: Request, res: Response) => {
    const { meliUserId, code, redirectUri } = req.body;
    try {
      const created = await mercadolibre.addStore(
        res.locals.email,
        meliUserId,
        code,
        redirectUri
      );
      res.status(201).send(created);
    } catch (error: any) {
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
  async (req: Request, res: Response) => {
    await auth.channelsSetAuth(res.locals.email);
    const questions = await mercadolibre.getQuestions();
    res.status(200).send(questions);
  }
);

app.put('/inventory', auth.verifyTokenMiddleware, async (req: Request, res: Response) => {
  await auth.channelsSetAuth(res.locals.email);
  const { sku, quantity } = req.body;
  const updatedItems = await updateInventory(res.locals.email, sku, quantity);
  res.json(updatedItems);
});

app.post('/shopify/product', auth.verifyTokenMiddleware, async (req: Request, res: Response) => {
  await auth.channelsSetAuth(res.locals.email);
  const createdProduct = await shopify.createProduct(req.body);
  res.json(createdProduct);
});

app.post('/shopify/order-created/:shopifyUuid', async (req: Request, res: Response) => {
  const email = await auth.channelsSetAuth(null, req.params.shopifyUuid);
  const orderCreatedResponse = await shopifyOrderCreated(email, req.body);
  console.log('Shopify order created', orderCreatedResponse);
  res.json(orderCreatedResponse);
});

export const handler = serverless(app);
