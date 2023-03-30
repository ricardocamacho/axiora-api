import {
  UpdatedItem as MeliUpdatedItem,
  UpdatedItemResponse as MeliUpdatedItemResponse,
  VariationResponse as MeliVariationResponse
} from './types/mercadolibre';
import { database } from './database';
import { mercadolibreApi, MercadoLibreApi } from './api/mercadolibre';
import { shopifyApi } from './api/shopify';
import { mercadolibre } from './mercadolibre';

type UpdatedInventories = {
  mercadolibre: any,
  shopify: any
};

const updateInventoryMercadolibre = async (storeApi: MercadoLibreApi, sku: string, quantity: number) => {
  // Get item IDs having given SKU
  const { results: itemIds } = await storeApi.getItemsBySKU(sku, {
    // status: 'active'
  });
  // For each item ID
  const updatedItems: MeliUpdatedItem[] = await Promise.all(
    itemIds.map(async itemId => {
      try {
        const updatedItem = await mercadolibre.updateItemSkuQuantity(
          storeApi,
          itemId,
          sku,
          quantity
        );
        return { id: itemId, ...updatedItem };
      } catch (error: any) {
        return error.response.data;
      }
    })
  );
  // Format response for easier reading
  const updatedItemsResponse: (MeliUpdatedItemResponse | MeliUpdatedItem)[] = updatedItems.map(item => {
    if (item.error) return item;
    const updatedItem: MeliUpdatedItemResponse = { id: item.id };
    if (item.variations && item.variations.length) {
      updatedItem.variations = item.variations.map(variation => {
        const formattedVariation: MeliVariationResponse = {
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
  return updatedItemsResponse;
};

const updateInventoryShopify = async (sku: string, quantity: number) => {
  const {
    data: {
      productVariants: { edges: products }
    }
  } = await shopifyApi.getProductsBySku(sku);
  const inventoryItems = products.map(product => product.node.inventoryItem);
  const updatedIventoryLevels = await Promise.all(
    inventoryItems.map(async item => {
      const itemId = item.id.split('/').pop() as string;
      const updatedInventoryLevel = await shopifyApi.updateInventoryLevels(
        itemId,
        quantity
      );
      return updatedInventoryLevel;
    })
  );
  return updatedIventoryLevels;
};

export const updateInventory = async (email: string, sku: string, quantity: number) => {
  const updatedInventories: UpdatedInventories = {
    mercadolibre: null,
    shopify: null
  };

  // Mercadolibre
  console.log('Update inventory for MercadoLibre');
  updatedInventories.mercadolibre = await Promise.all(
    mercadolibreApi.stores.map(async store => {
      const updatedInventoryMercadolibre = await updateInventoryMercadolibre(
        store.api as MercadoLibreApi,
        sku,
        quantity
      );
      return updatedInventoryMercadolibre;
    })
  );

  // Shopify
  const stores = await database.getStores(email);
  const shopifyStore = stores.find(store => store.channel === 'shopify');
  if (shopifyStore) {
    console.log('Update inventory for Shopify');
    const shopifyUpdatedInventories = await updateInventoryShopify(
      sku,
      quantity
    );
    updatedInventories.shopify = shopifyUpdatedInventories;
  }

  return updatedInventories;
};
