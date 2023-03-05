const database = require('./database');
const auth = require('./auth');
const shopify = require('./shopify');
const mercadolibreApi = require('./api/mercadolibre');
const slackApi = require('./api/slack');

const addStore = async (email, meliUserId, code, redirectUri) => {
  const stores = await database.getStores(email);
  const isAlreadyAdded = stores.find(
    store => store.SK === `STORE#${meliUserId}`
  );
  if (isAlreadyAdded) {
    throw Error('Store is already added');
  }
  const { access_token, refresh_token } = await mercadolibreApi.getTokens(
    code,
    redirectUri
  );
  const created = await database.addStore(email, 'mercadolibre', meliUserId, {
    user_id: meliUserId,
    access_token,
    refresh_token
  });
  await database.updateUserLastIntegrationDate(email, created.created_at);
  return created;
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

const handleInventory = async (storeApi, order) => {
  const isOrderFromCurrentStore = storeApi.meliUserId === order.seller.id;
  // Only process items with SKU
  const items = order.order_items.filter(item => {
    return item.item.seller_sku;
  });
  // Loop over each item in the order
  const itemsResponses = await Promise.all(
    items.map(async item => {
      // Load all the meli items ids (MCO123) sharing this item sku
      const { results: itemIds } = await storeApi.getItemsBySKU(
        item.item.seller_sku
      );
      if (itemIds.length === 0) {
        return {
          updated: false,
          sku: item.item.seller_sku,
          message: `No se encontraron items con sku ${item.item.seller_sku}`
        };
      }
      // If it's the only item and it's from the order on the current store,
      // then don't update this item
      if (itemIds.length === 1 && isOrderFromCurrentStore) {
        return {
          updated: false,
          sku: item.item.seller_sku,
          itemId: itemIds[0],
          message: `Sólo hay un item con sku ${item.item.seller_sku} y es el de esta misma orden y tienda`
        };
      }
      // If itemIds length > 1 and the order is from the current store,
      // we need to filter out this item so is not updated
      if (itemIds.length > 1 && isOrderFromCurrentStore) {
        const indexOfItem = itemIds.indexOf(item.item.id);
        if (indexOfItem !== -1) {
          itemIds.splice(indexOfItem, 1);
        }
      }
      console.log('Listados por actualizar', itemIds);
      const updatedItems = await Promise.all(
        itemIds.map(async itemId => {
          try {
            await updateItemSkuQuantity(
              storeApi,
              itemId,
              item.item.seller_sku,
              null,
              item.quantity
            );
            return {
              updated: true,
              id: itemId,
              purchasedQuantity: item.quantity
            };
          } catch (error) {
            return error.response.data;
          }
        })
      );
      return {
        updated: true,
        sku: item.item.seller_sku,
        updatedItems
      };
    })
  );
  return {
    meliUserId: storeApi.meliUserId,
    itemsResponses
  };
};

const handleOrder = async (email, meliUserId, orderId) => {
  // Get the store api where original order was placed
  const storeApi = mercadolibreApi.stores.find(
    store => store.api.meliUserId === meliUserId
  ).api;
  // Get the order details
  const order = await storeApi.getOrder(orderId);
  const orderDate = new Date(order.date_created);
  const user = await database.getUser(email);
  const lastIntegrationDate = new Date(user.last_integration_date);
  if (orderDate < lastIntegrationDate) {
    return {
      message: `La orden ${orderId} ocurrió antes de la última integración`,
      order_created: order.date_created,
      last_integration_date: user.last_integration_date
    };
  }
  let mercadolibreResponse;
  let shopifyResponse;
  if (order.status === 'paid' && order.tags.includes('not_delivered')) {
    // Order was already added
    try {
      const existingOrder = await database.getOrder(meliUserId, orderId);
      if (existingOrder) {
        mercadolibreResponse = {
          orderId,
          updated: false,
          message: 'La orden ya fue procesada'
        };
      }
    } catch (error) {
      // Order does not exists

      // Mercadolibre
      // Logic to update inventory for each store
      const handleInventoriesResult = await Promise.all(
        mercadolibreApi.stores.map(async store => {
          return await handleInventory(store.api, order);
        })
      );
      await database.addOrder(
        meliUserId,
        orderId,
        'mercadolibre',
        order.date_created
      );
      mercadolibreResponse = handleInventoriesResult;

      const stores = await database.getStores(email);
      const shopifyStore = stores.find(store => store.channel === 'shopify');
      if (shopifyStore) {
        shopifyResponse = await Promise.all(
          order.order_items.map(async item => {
            const inventoryLevels = await shopify.adjustInventory(
              item.item.seller_sku,
              item.quantity
            );
            return inventoryLevels.map(inventoryLevel => inventoryLevel.id);
          })
        );
      }
    }
  } else {
    mercadolibreResponse = {
      meliUserId: storeApi.meliUserId,
      orderId: orderId,
      updated: false,
      message: `La orden ${order.id} aun no ha sido pagada o ya fue entregada`
    };
  }

  return {
    mercadolibre: mercadolibreResponse,
    shopify: shopifyResponse
  };
};

const handleNotification = async notification => {
  const { resource, user_id: meliUserId, topic } = notification;
  if (topic === 'orders_v2') {
    // Get store based on meli user id
    try {
      const store = await database.getStore(meliUserId);
      // Initialize each meli store api
      const email = store.PK.replace('USER#', '');
      await auth.channelsSetAuth(email);
      const orderId = resource.replace('/orders/', '');
      const orderResult = await handleOrder(email, meliUserId, orderId);
      const response = { ...notification, orderResult };
      await slackApi.sendMessage(
        '```' + JSON.stringify(response, null, 2) + '```'
      );
    } catch (error) {
      console.log(error);
    }
  } else {
    console.log('Not an order notification');
  }
};

const mercadolibre = {
  addStore,
  getQuestions,
  updateItemSkuQuantity,
  handleNotification
};

module.exports = mercadolibre;
