const database = require('./database');
const mercadolibreApi = require('./api/mercadolibre');

const getStores = async email => {
  const stores = await database.getStores(email);
  await Promise.all(
    stores.map(async store => {
      if (store.channel === 'mercadolibre') {
        const meliStore = mercadolibreApi.stores.find(
          meliStore => meliStore.user_id === store.data.user_id
        );
        try {
          const meliStoreData = await meliStore.api.getUser();
          store.data.name = meliStoreData.nickname;
        } catch (error) {
          store.data.name = `Cuenta bloqueada: ${meliStore.user_id}`;
        }
      }
    })
  );
  return stores;
};

const axiora = {
  getStores
};

module.exports = axiora;
