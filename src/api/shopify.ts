import axios, { AxiosInstance } from 'axios';
import { GetProductsBySkuResponse, AdjustInventoryLevelQuantityResponse, InventoryBulkAdjustQuantityAtLocation, CreateProductResponse } from '../types/shopify'

type InventoryItemAdjustment = {
  inventoryItemId: string,
  availableDelta: number
};

let axiosInstance: AxiosInstance;
let locationId: string;

const createAxiosInstance = (baseUrl: string) => {
  axiosInstance = axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

const setToken = (token: string) => {
  axiosInstance.defaults.headers.common['X-Shopify-Access-Token'] = token;
};

const setLocationId = (id: string) => {
  locationId = id;
};

const getShopInfo = async () => {
  const response = await axiosInstance.post('/admin/api/2021-01/graphql.json', {
    query: `query {
      shop {
        name
      }
    }`
  });
  return response.data;
}

const getProductsBySku = async (sku: string): Promise<GetProductsBySkuResponse> => {
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

const updateInventoryLevels = async (inventoryItemId: string, quantity: number) => {
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
  inventoryLevelId: string,
  availableDelta: number
): Promise<AdjustInventoryLevelQuantityResponse> => {
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

const inventoryBulkAdjustQuantityAtLocation = async (inventoryItemAdjustments: InventoryItemAdjustment[]): Promise<InventoryBulkAdjustQuantityAtLocation> => {
  const response = await axiosInstance.post('/admin/api/2021-01/graphql.json', {
    query: `mutation inventoryBulkAdjustQuantityAtLocation($inventoryItemAdjustments: [InventoryAdjustItemInput!]!, $locationId: ID!) {
      inventoryBulkAdjustQuantityAtLocation(inventoryItemAdjustments: $inventoryItemAdjustments, locationId: $locationId) {
        inventoryLevels {
          id
          available
        }
        userErrors {
          field
          message
        }
      }
    }
    `,
    variables: {
      inventoryItemAdjustments,
      locationId
    }
  });
  return response.data;
};

const createProduct = async (productInput: object): Promise<CreateProductResponse> => {
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

export const shopifyApi = {
  createAxiosInstance,
  setToken,
  setLocationId,
  getShopInfo,
  getProductsBySku,
  updateInventoryLevels,
  adjustInventoryLevelQuantity,
  inventoryBulkAdjustQuantityAtLocation,
  createProduct
};
