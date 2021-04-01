'use strict';

const axios = require('axios');

const database = require('../database');

const CLIENT_ID = '7979460756315625';
const CLIENT_SECRET = 'O4S9ubYIVvH1EAB4wlz4BZTTPnvm1nO4';

const stores = [];

const setStores = (meliStores, user) => {
  meliStores.forEach(store => {
    store.api = new MercadoLibreApi(
      store.access_token,
      store.refresh_token,
      store.user_id,
      user
    );
    stores.push(store);
  });
};

class MercadoLibreApi {
  constructor(accessToken, refreshTokenValue, meliUserId, userId) {
    this.axiosInstance = axios.create({
      baseURL: 'https://api.mercadolibre.com',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.refreshTokenValue = refreshTokenValue;
    this.meliUserId = meliUserId;
    this.userId = userId;
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
          const user = await database.getUser(this.userId);
          const store = user.mercadolibre.find(
            s => s.user_id === this.meliUserId
          );
          store.access_token = access_token;
          store.refresh_token = refresh_token;
          await database.updateMercadolibreStores(
            this.userId,
            user.mercadolibre
          );
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

let userId = null;
let refreshTokenValue = null;

const setToken = token => {
  if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

const setRefreshToken = token => {
  refreshTokenValue = token;
};

const setUserId = id => {
  userId = id;
};

const refreshToken = async () => {
  const response = await axiosInstance.post('/oauth/token', {
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshTokenValue
  });
  return response.data;
};

const getItemsBySKU = async (sku, aditionalParams) => {
  const response = await axiosInstance.get(
    `/users/${userId}/items/search?seller_sku=${sku}`,
    {
      params: aditionalParams
    }
  );
  return response.data;
};

const getItem = async (itemId, aditionalParams) => {
  const response = await axiosInstance.get(
    `/items/${itemId}?attributes=variations`,
    {
      params: aditionalParams
    }
  );
  return response.data;
};

const updateItem = async (itemId, item) => {
  const response = await axiosInstance.put(`/items/${itemId}`, item);
  return response.data;
};

const getOrder = async orderId => {
  const response = await axiosInstance.get(`/orders/${orderId}`);
  return response.data;
};

const mercadolibreApi = {
  stores,
  setStores,
  getTokens,
  setToken,
  setRefreshToken,
  setUserId,
  refreshToken,
  getItemsBySKU,
  getItem,
  updateItem,
  getOrder
};

module.exports = mercadolibreApi;
