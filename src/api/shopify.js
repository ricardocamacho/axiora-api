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
    query: `query ($filter: String!, $locationId: ID!) {
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
              inventoryLevel(locationId: $locationId) {
                id
              }
            }
          }
        }
      }
    }`,
    variables: {
      filter: `sku:${sku}`,
      locationId
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

const adjustInventoryLevelQuantity = async (
  inventoryLevelId,
  availableDelta
) => {
  const response = await axiosInstance.post('/admin/api/2021-01/graphql.json', {
    query: `mutation adjustInventoryLevelQuantity($inventoryAdjustQuantityInput: InventoryAdjustQuantityInput!) {
      inventoryAdjustQuantity(input: $inventoryAdjustQuantityInput) {
        inventoryLevel {
          id
          available
        }
        userErrors {
          field
          message
        }
      }
    }`,
    variables: {
      inventoryAdjustQuantityInput: {
        inventoryLevelId,
        availableDelta
      }
    }
  });
  return response.data;
};

const createProduct = async productInput => {
  const response = await axiosInstance.post('/admin/api/2021-01/graphql.json', {
    query: `mutation($productInput: ProductInput!) {
      productCreate(input: $productInput) {
        product {
          id
          title
        }
      }
    }`,
    variables: {
      productInput
    }
  });
  return response.data;
};

const shopifyApi = {
  createAxiosInstance,
  setToken,
  setLocationId,
  getProductsBySku,
  updateInventoryLevels,
  adjustInventoryLevelQuantity,
  createProduct
};

module.exports = shopifyApi;
