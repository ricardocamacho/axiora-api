import axios, { AxiosInstance } from 'axios';
import config from '../config';

import { Store, Profile, Item, Order, Shipping, OAuthTokenResponse } from '../types/mercadolibre';
import { database } from '../database';

type ItemsBySkuResponse = {
  results: string[]
};

const CLIENT_ID = config.MELI_CLIENT_ID;
const CLIENT_SECRET = config.MELI_CLIENT_SECRET;

const stores: Store[] = [];

const setStores = (meliStores: Store[]) => {
  stores.length = 0;
  meliStores.forEach(store => {
    store.api = new MercadoLibreApi(
      store.access_token,
      store.refresh_token,
      store.user_id
    );
    stores.push(store);
  });
};

export class MercadoLibreApi {
  axiosInstance: AxiosInstance;
  refreshTokenValue: string;
  meliUserId: number;

  constructor(accessToken: string, refreshTokenValue: string, meliUserId: number) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.mercadolibre.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.refreshTokenValue = refreshTokenValue;
    this.meliUserId = meliUserId;
    this.setToken(accessToken);
    this.setExpiredTokenInterceptor();
  }

  setExpiredTokenInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      response => {
        return response;
      },
      async error => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          // Call refresh token and set them on the headers
          this.setToken(null);
          console.log('Refreshing Mercardolibre token...');
          const { access_token, refresh_token } = await this.refreshToken();
          this.setToken(access_token);
          this.setRefreshToken(refresh_token);
          // Find store in database and update it with new tokens
          const store = await database.getStore(this.meliUserId);
          if (store) {
            store.data.access_token = access_token;
            store.data.refresh_token = refresh_token;
            await database.updateStore(store.PK, this.meliUserId, store.data);
          }
          // Try the original request with the new token
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return this.axiosInstance.request(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  setRefreshToken(token: string): void {
    this.refreshTokenValue = token;
  }

  setToken(token: string | null): void {
    if (token) {
      this.axiosInstance.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${token}`;
    } else {
      delete this.axiosInstance.defaults.headers.common['Authorization'];
    }
  }

  async refreshToken(): Promise<{ access_token: string, refresh_token: string }> {
    const response = await this.axiosInstance.post(
      '/oauth/token',
      {
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: this.refreshTokenValue
      },
      {
        headers: {
          Authorization: null
        }
      }
    );
    return response.data;
  }

  async getUser(): Promise<Profile> {
    const response = await this.axiosInstance.get('/users/me');
    return response.data;
  }

  async getQuestions(): Promise<object> {
    const response = await this.axiosInstance.get(
      `/questions/search?seller_id=${this.meliUserId}&sort_fields=date_created&sort_types=DESC&status=UNANSWERED`
    );
    return response.data;
  }

  async getItemsBySKU(sku: string, aditionalParams: object = {}): Promise<ItemsBySkuResponse> {
    const response = await this.axiosInstance.get(
      `/users/${this.meliUserId}/items/search?seller_sku=${sku}`,
      {
        params: aditionalParams
      }
    );
    return response.data;
  }

  async getItem(itemId: string, aditionalParams: object): Promise<Item> {
    const response = await this.axiosInstance.get(
      `/items/${itemId}`,
      {
        params: aditionalParams
      }
    );
    return response.data;
  }

  async updateItem(itemId: string, item: object): Promise<object> {
    const response = await this.axiosInstance.put(`/items/${itemId}`, item);
    return response.data;
  }

  async getOrder(orderId: number): Promise<Order> {
    const response = await this.axiosInstance.get(`/orders/${orderId}`);
    return response.data;
  }

  async getShipment(shipmentId: number): Promise<Shipping> {
    const response = await this.axiosInstance.get(`/shipments/${shipmentId}`);
    return response.data;
  }
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: 'https://api.mercadolibre.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

const getTokens = async (code: string, redirectUri: string): Promise<OAuthTokenResponse> => {
  const response = await axiosInstance.post('/oauth/token', {
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: redirectUri
  });
  return response.data;
};

export const mercadolibreApi = {
  stores,
  setStores,
  getTokens
};
