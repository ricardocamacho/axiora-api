'use strict';

const database = require('./database');
const mercadolibreApi = require('./api/mercadolibre');
const shopifyApi = require('./api/shopify');

const updateInventoryMercadolibre = async (sku, quantity) => {
  // Get item IDs having given SKU
  const { results: itemIds } = await mercadolibreApi.getItemsBySKU(sku, {
    status: 'active'
  });
  // For each item ID
  let updatedItems = await Promise.all(
    itemIds.map(async itemId => {
      let updatedItem;
      // Get the item
      const item = await mercadolibreApi.getItem(itemId, {
        include_attributes: 'all'
      });
      // If the item has variations
      if (item.variations && item.variations.length > 0) {
        const { variations } = item;
        // Iterate variations and update available quantity for selected SKU
        variations.forEach(variation => {
          delete variation.catalog_product_id;
          delete variation.inventory_id;
          const variationSkuAttr =
            variation.attributes &&
            variation.attributes.find(
              attr =>
                attr.id === 'SELLER_SKU' &&
                attr.value_name &&
                attr.value_name === sku
            );
          if (variationSkuAttr) {
            variation.available_quantity = quantity;
          }
        });
        // Save the item variations
        updatedItem = await mercadolibreApi.updateItem(itemId, {
          variations
        });
      }
      // If the item does not have variations
      else {
        updatedItem = await mercadolibreApi.updateItem(itemId, {
          available_quantity: quantity
        });
      }
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

const updateInventory = async (sku, quantity) => {
  const updatedInventories = {
    mercadolibre: null,
    shopify: null
  };
  // Mercadolibre
  console.log('Update inventory for MercadoLibre');
  try {
    const mercadolibreUpdatedItems = await updateInventoryMercadolibre(
      sku,
      quantity
    );
    updatedInventories.mercadolibre = mercadolibreUpdatedItems;
  } catch (error) {
    console.log('HEY', error);
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
      return await updateInventory(sku, quantity);
    }
  }

  // Shopify
  console.log('Update inventory for Shopify');
  const shopifyUpdatedInventories = await updateInventoryShopify(sku, quantity);
  updatedInventories.shopify = shopifyUpdatedInventories;

  return updatedInventories;
};

module.exports = updateInventory;
