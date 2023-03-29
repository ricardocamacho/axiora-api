import { Request, Response, NextFunction } from 'express';
import { verify, sign, JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv'

import { DbStore, DbMercadolibreData, DbShopifyData } from './types/common';
import { database } from './database';
import { mercadolibreApi } from './api/mercadolibre';
import { shopifyApi } from './api/shopify';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

type RequestWithEmail = Request & {
  email?: string
};

type Decoded = JwtPayload & {
  email: string
};

const verifyTokenMiddleware = async (req: RequestWithEmail, res: Response, next: NextFunction) => {
  let token = req.headers.authorization;
  if (!token) return res.status(401).send({ error: 'Token is not provided' });
  token = token.split('Bearer ')[1];
  try {
    const decoded: Decoded = await verify(token, process.env.JWT_SECRET_KEY || '') as Decoded;
    res.locals.email = decoded.email;
    next();
  } catch (err) {
    return res.status(401).send({ error: 'Token is invalid' });
  }
};

const signUp = async (email: string, password: string) => {
  const hash = await bcrypt.hash(password, 10);
  const { created_at } = await database.createUser(email, hash);
  const token = sign({ email }, process.env.JWT_SECRET_KEY || '');
  return {
    email,
    created_at,
    token
  };
};

const signIn = async (email: string, password: string) => {
  const { hash } = await database.getUser(email);
  const compareResult = await bcrypt.compare(password, hash);
  if (!compareResult) {
    throw Error('Email and password does not match');
  }
  const token = sign({ email }, process.env.JWT_SECRET_KEY || '');
  return {
    email,
    token
  };
};

const channelsSetAuth = async (email: string | null, shopifyUuid?: string) => {
  if (shopifyUuid) {
    const store = await database.getStore(shopifyUuid);
    email = store?.PK.replace('USER#', '');
  }
  if (!email) {
    throw new Error('Empty or invalid email provided');
  }
  const stores = await database.getStores(email);
  const mercadolibreStores = stores
    .filter(store => store.channel === 'mercadolibre')
    .map(store => store.data) as DbMercadolibreData[];
  mercadolibreApi.setStores(mercadolibreStores);
  const shopifyStore = stores.find(store => store.channel === 'shopify') as DbStore<DbShopifyData>;
  if (shopifyStore) {
    shopifyApi.createAxiosInstance(shopifyStore.data.base_url);
    shopifyApi.setToken(shopifyStore.data.access_token);
    shopifyApi.setLocationId(shopifyStore.data.location_id);
  }
  return email;
};

export const auth = {
  verifyTokenMiddleware,
  signUp,
  signIn,
  channelsSetAuth
};
