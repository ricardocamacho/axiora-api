'use strict';

const axios = require('axios');

const axiosInstance = axios.create({
  baseURL: 'https://api.mercadolibre.com',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let userId = null;

const setToken = token => {
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

const setUserId = id => {
  userId = id;
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
  setUserId,
  getItemsBySKU,
  getItem,
  updateItem
};

module.exports = mercadolibreApi;
