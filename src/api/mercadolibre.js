'use strict';

const axios = require('axios');

const CLIENT_ID = '7979460756315625';
const CLIENT_SECRET = 'O4S9ubYIVvH1EAB4wlz4BZTTPnvm1nO4';

const axiosInstance = axios.create({
  baseURL: 'https://api.mercadolibre.com',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

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

const mercadolibreApi = {
  setToken,
  setRefreshToken,
  setUserId,
  refreshToken,
  getItemsBySKU,
  getItem,
  updateItem
};

module.exports = mercadolibreApi;
