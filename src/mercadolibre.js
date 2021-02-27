const mercadolibreApi = require('./api/mercadolibre');

const updateItemSkuQuantity = async (
  itemId,
  sku,
  quantity,
  purchasedQuantity
) => {
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
        variation.available_quantity = purchasedQuantity
          ? variation.available_quantity - purchasedQuantity
          : quantity;
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
      available_quantity: purchasedQuantity
        ? item.available_quantity - purchasedQuantity
        : quantity
    });
  }
  return updatedItem;
};

const mercadolibre = {
  updateItemSkuQuantity
};

module.exports = mercadolibre;
