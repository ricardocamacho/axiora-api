'use strict';

const database = require('../database');
const mercadolibreApi = require('../api/mercadolibre');
const shopifyApi = require('../api/shopify');
const mercadolibre = require('../mercadolibre');

const adjustInventoryBySkuMercadolibre = async (sku, purchasedQuantity) => {
  // Get item IDs having given SKU
  const { results: itemIds } = await mercadolibreApi.getItemsBySKU(sku, {
    status: 'active'
  });
  // For each item ID
  let updatedItems = await Promise.all(
    itemIds.map(async itemId => {
      const updatedItem = await mercadolibre.updateItemSkuQuantity(
        itemId,
        sku,
        null,
        purchasedQuantity
      );
      return { id: itemId, ...updatedItem };
    })
  );
  // Format response for easier reading
  updatedItems = updatedItems.map(item => {
    const updatedItem = { id: item.id };
    if (item.variations && item.variations.length) {
      updatedItem.variations = item.variations.map(variation => {
        const formattedVariation = {
          availableQuantity: variation.available_quantity
        };
        const variationSkuAttr =
          variation.attributes &&
          variation.attributes.find(
            attr => attr.id === 'SELLER_SKU' && attr.value_name
          );
        if (variationSkuAttr) {
          formattedVariation.sku = variationSkuAttr.value_name;
          if (
            variationSkuAttr.value_name &&
            variationSkuAttr.value_name === sku
          ) {
            formattedVariation.updated = true;
          }
        }
        return formattedVariation;
      });
    } else {
      updatedItem.availableQuantity = item.available_quantity;
      updatedItem.updated = true;
    }
    return updatedItem;
  });
  return updatedItems;
};

const tryAdjustInventoryBySkuMercadoLibre = async (sku, purchasedQuantity) => {
  try {
    const mercadolibreAdjustedItems = await adjustInventoryBySkuMercadolibre(
      sku,
      purchasedQuantity
    );
    return mercadolibreAdjustedItems;
  } catch (error) {
    // If token expired, refresh token
    if (error.response.status === 401) {
      console.log('Refreshing token...');
      mercadolibreApi.setToken(null);
      const refreshToken = await mercadolibreApi.refreshToken();
      await database.updateToken(
        '1',
        refreshToken.access_token,
        refreshToken.refresh_token
      );
      mercadolibreApi.setToken(refreshToken.access_token);
      mercadolibreApi.setRefreshToken(refreshToken.refresh_token);
      return await tryAdjustInventoryBySkuMercadoLibre(sku, purchasedQuantity);
    }
  }
};

const adjustInventoryBySkuShopify = async (
  variantId,
  sku,
  purchasedQuantity
) => {
  const {
    data: {
      productVariants: { edges: products }
    }
  } = await shopifyApi.getProductsBySku(sku);
  const allExceptPurchased = products.filter(product => {
    return Number(product.node.legacyResourceId) !== variantId;
  });
  const inventoryLevelsIds = allExceptPurchased.map(
    product => product.node.inventoryItem.inventoryLevel.id
  );
  const inventoryLevelsIdsUpdated = await Promise.all(
    inventoryLevelsIds.map(async inventoryLevelId => {
      const inventoryLevelAdjusted = await shopifyApi.adjustInventoryLevelQuantity(
        inventoryLevelId,
        purchasedQuantity * -1
      );
      return inventoryLevelAdjusted;
    })
  );
  return inventoryLevelsIdsUpdated;
};

const orderCreated = async orderItems => {
  const adjustedInventories = {
    mercadolibre: null,
    shopify: null
  };
  // MercadoLibre
  adjustedInventories.mercadolibre = await Promise.all(
    orderItems.map(async item => {
      const adjustedItems = await tryAdjustInventoryBySkuMercadoLibre(
        item.sku,
        item.quantity
      );
      return { sku: item.sku, adjustedItems };
    })
  );
  // Shopify (adjust all SKU inventories except the one being purchased)
  adjustedInventories.shopify = await Promise.all(
    orderItems.map(async item => {
      const adjustedItems = await adjustInventoryBySkuShopify(
        item.variant_id,
        item.sku,
        item.quantity
      );
      return { sku: item.sku, adjustedItems };
    })
  );
  return adjustedInventories;
};

module.exports = orderCreated;
