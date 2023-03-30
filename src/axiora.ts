import { DbMercadolibreData, DbShopifyData, DbStore } from './types/common';
import { database } from './database';
import { mercadolibreApi, MercadoLibreApi } from './api/mercadolibre';

const getStores = async (email: string) => {
  const stores: DbStore<DbMercadolibreData | DbShopifyData>[] = await database.getStores(email);
  const storesWithName = await Promise.all(
    stores.map(async store => {
      if (store.channel === 'mercadolibre') {
        const meliStore = mercadolibreApi.stores.find(
          meliStore => meliStore.user_id === (store as DbStore<DbMercadolibreData>).data.user_id
        );
        if (!meliStore) {
          return store;
        }
        try {
          const meliStoreData = await (meliStore.api as MercadoLibreApi).getUser();
          return {
            ...store,
            data: {
              ...store.data,
              name: meliStoreData.nickname
            }
          };
        } catch (error) {
          return {
            ...store,
            data: {
              ...store.data,
              name: `Cuenta bloqueada: ${meliStore.user_id}`
            }
          }
        }
      }
      return store;
    })
  );
  return storesWithName;
};

export const axiora = {
  getStores
};
