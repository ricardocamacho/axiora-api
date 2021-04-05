'use strict';

const database = require('./database');
const mercadolibreApi = require('./api/mercadolibre');
const shopifyApi = require('./api/shopify');
const mercadolibre = require('./mercadolibre');

const updateInventoryMercadolibre = async (storeApi, sku, quantity) => {
  // Get item IDs having given SKU
  const { results: itemIds } = await storeApi.getItemsBySKU(sku, {
    // status: 'active'
  });
  // For each item ID
  let updatedItems = await Promise.all(
    itemIds.map(async itemId => {
      try {
        const updatedItem = await mercadolibre.updateItemSkuQuantity(
          storeApi,
          itemId,
          sku,
          quantity
        );
        return { id: itemId, ...updatedItem };
      } catch (error) {
        return error.response.data;
      }
    })
  );
  // Format response for easier reading
  updatedItems = updatedItems.map(item => {
    if (item.error) return item;
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

const updateInventoryShopify = async (sku, quantity) => {
  const {
    data: {
      productVariants: { edges: products }
    }
  } = await shopifyApi.getProductsBySku(sku);
  const inventoryItems = products.map(product => product.node.inventoryItem);
  const updatedIventoryLevels = await Promise.all(
    inventoryItems.map(async item => {
      const itemId = item.id.split('/').pop();
      const updatedInventoryLevel = await shopifyApi.updateInventoryLevels(
        itemId,
        quantity
      );
      return updatedInventoryLevel;
    })
  );
  return updatedIventoryLevels;
};

const updateInventory = async (userId, sku, quantity) => {
  const updatedInventories = {
    mercadolibre: null,
    shopify: null
  };

  // Mercadolibre
  console.log('Update inventory for MercadoLibre');
  updatedInventories.mercadolibre = await Promise.all(
    mercadolibreApi.stores.map(async store => {
      const updatedInventoryMercadolibre = await updateInventoryMercadolibre(
        store.api,
        sku,
        quantity
      );
      return updatedInventoryMercadolibre;
    })
  );

  // Shopify
  const { data: user } = await database.getUser(userId);
  if (user.shopify) {
    console.log('Update inventory for Shopify');
    const shopifyUpdatedInventories = await updateInventoryShopify(
      sku,
      quantity
    );
    updatedInventories.shopify = shopifyUpdatedInventories;
  }

  return updatedInventories;
};

module.exports = updateInventory;
