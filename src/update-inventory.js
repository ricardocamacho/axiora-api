'use strict';

const mercadolibreApi = require('./api/mercadolibre');

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
          const variationSkuAttr =
            variation.attributes &&
            variation.attributes.find(
              attr => attr.id === 'SELLER_SKU' && attr.value_name === sku
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
        }
        if (variationSkuAttr.value_name === sku) {
          formattedVariation.updated = true;
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

const updateInventory = async (sku, quantity) => {
  console.log('Update inventory from MercadoLibre and Shopify');
  const mercadolibreUpdatedItems = await updateInventoryMercadolibre(
    sku,
    quantity
  );
  return {
    mercadolibre: mercadolibreUpdatedItems
  };
};

module.exports = updateInventory;
