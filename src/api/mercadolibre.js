'use strict';

const axios = require('axios');

const database = require('../database');

const CLIENT_ID = '7979460756315625';
const CLIENT_SECRET = 'O4S9ubYIVvH1EAB4wlz4BZTTPnvm1nO4';

const stores = [];

const setStores = meliStores => {
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

class MercadoLibreApi {
  constructor(accessToken, refreshTokenValue, meliUserId) {
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

  setExpiredTokenInterceptor() {
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
          store.data.access_token = access_token;
          store.data.refresh_token = refresh_token;
          await database.updateStore(store.PK, this.meliUserId, store.data);
          // Try the original request with the new token
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
          return this.axiosInstance.request(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  setRefreshToken(token) {
    this.refreshTokenValue = token;
  }

  setToken(token) {
    if (token) {
      this.axiosInstance.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${token}`;
    } else {
      delete this.axiosInstance.defaults.headers.common['Authorization'];
    }
  }

  async refreshToken() {
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

  async getQuestions() {
    const response = await this.axiosInstance.get(
      `/questions/search?seller_id=${this.meliUserId}&sort_fields=date_created&sort_types=DESC&status=UNANSWERED`
    );
    return response.data;
  }

  async getItemsBySKU(sku, aditionalParams) {
    const response = await this.axiosInstance.get(
      `/users/${this.meliUserId}/items/search?seller_sku=${sku}`,
      {
        params: aditionalParams
      }
    );
    return response.data;
  }

  async getItem(itemId, aditionalParams) {
    const response = await this.axiosInstance.get(
      `/items/${itemId}?attributes=variations`,
      {
        params: aditionalParams
      }
    );
    return response.data;
  }

  async updateItem(itemId, item) {
    const response = await this.axiosInstance.put(`/items/${itemId}`, item);
    return response.data;
  }

  async getOrder(orderId) {
    const response = await this.axiosInstance.get(`/orders/${orderId}`);
    return response.data;
  }
}

const axiosInstance = axios.create({
  baseURL: 'https://api.mercadolibre.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

const getTokens = async (code, redirectUri) => {
  const response = await axiosInstance.post('/oauth/token', {
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: redirectUri
  });
  return response.data;
};

const mercadolibreApi = {
  stores,
  setStores,
  getTokens
};

module.exports = mercadolibreApi;
