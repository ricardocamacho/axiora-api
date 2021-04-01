const database = require('./database');
const mercadolibreApi = require('./api/mercadolibre');

const addStore = async (userId, meliUserId, code, redirectUri) => {
  const user = await database.getUser(userId);
  const { access_token, refresh_token } = await mercadolibreApi.getTokens(
    code,
    redirectUri
  );
  user.mercadolibre.push({
    user_id: meliUserId,
    access_token,
    refresh_token
  });
  const updatedUser = await database.updateMercadolibreStores(
    userId,
    user.mercadolibre
  );
  return updatedUser;
};

const getStoreQuestions = async store => {
  const storeQuestions = await store.api.getQuestions();
  return storeQuestions;
};

const getQuestions = async () => {
  if (!mercadolibreApi.stores) throw Error('No stores found');
  const questions = await Promise.all(
    mercadolibreApi.stores.map(async store => {
      const storeQuestions = await getStoreQuestions(store);
      return storeQuestions;
    })
  );
  return questions;
};

const updateItemSkuQuantity = async (
  storeApi,
  itemId,
  sku,
  quantity,
  purchasedQuantity
) => {
  let updatedItem;
  // Get the item
  const item = await storeApi.getItem(itemId, {
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
    updatedItem = await storeApi.updateItem(itemId, {
      variations
    });
  }
  // If the item does not have variations
  else {
    updatedItem = await storeApi.updateItem(itemId, {
      available_quantity: purchasedQuantity
        ? item.available_quantity - purchasedQuantity
        : quantity
    });
  }
  return updatedItem;
};

const mercadolibre = {
  addStore,
  getQuestions,
  updateItemSkuQuantity
};

module.exports = mercadolibre;
