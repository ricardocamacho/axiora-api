const axios = require('axios');

let axiosInstance;
let locationId;

const createAxiosInstance = baseUrl => {
  axiosInstance = axios.create({
    baseURL: baseUrl,
    timeout: 20000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

const setToken = token => {
  axiosInstance.defaults.headers.common['X-Shopify-Access-Token'] = token;
};

const setLocationId = id => {
  locationId = id;
};

const getProductsBySku = async sku => {
  const response = await axiosInstance.post('/admin/api/2021-01/graphql.json', {
    query: `query ($filter: String!) {
      productVariants(first: 10, query: $filter) {
        edges {
          node {
            id
            sku
            title
            inventoryQuantity
            legacyResourceId
            displayName
            inventoryItem {
              id
              legacyResourceId
            }
          }
        }
      }
    }`,
    variables: {
      filter: `sku:${sku}`
    }
  });
  return response.data;
};

const updateInventoryLevels = async (inventoryItemId, quantity) => {
  const response = await axiosInstance.post(
    '/admin/api/2021-01/inventory_levels/set.json',
    {
      location_id: locationId.split('/').pop(),
      inventory_item_id: inventoryItemId,
      available: quantity
    }
  );
  return response.data;
};

const shopifyApi = {
  createAxiosInstance,
  setToken,
  setLocationId,
  getProductsBySku,
  updateInventoryLevels
};

module.exports = shopifyApi;
