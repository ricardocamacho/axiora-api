const axios = require('axios');

const axiosInstance = axios.create({
  baseURL: 'https://smart-bang.myshopify.com',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});
