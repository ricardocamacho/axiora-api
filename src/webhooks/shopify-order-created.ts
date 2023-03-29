import { database } from '../database';
import { mercadolibreApi, MercadoLibreApi } from '../api/mercadolibre';
import { shopifyApi } from '../api/shopify';
import { slackApi } from '../api/slack';
import { mercadolibre } from '../mercadolibre';

import {
  UpdatedItem as MeliUpdatedItem,
  UpdatedItemResponse as MeliUpdatedItemResponse,
  VariationResponse as MeliVariationResponse
} from '../types/mercadolibre';
import { AdjustInventoryLevelQuantityResponse, Order } from '../types/shopify';

type AdjustedInventoryMercadolibre = {
  sku: string,
  adjustedItems: (MeliUpdatedItemResponse | MeliUpdatedItem)[]
}[];

type AdjustedInventoryShopify = {
  sku: string,
  adjustedItems: AdjustInventoryLevelQuantityResponse[]
};

type AdjustedInventories = {
  mercadolibre: AdjustedInventoryMercadolibre[] | null,
  shopify: AdjustedInventoryShopify[] | null
};

const adjustInventoryBySkuMercadolibre = async (
  storeApi: MercadoLibreApi,
  sku: string,
  purchasedQuantity: number
): Promise<(MeliUpdatedItemResponse | MeliUpdatedItem)[]> => {
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
          null,
          purchasedQuantity
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
          availableQuantity: variation.available_quantity,
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

const adjustInventoryBySkuShopify = async (
  variantId: number,
  sku: string,
  purchasedQuantity: number
): Promise<AdjustInventoryLevelQuantityResponse[]> => {
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

const orderCreated = async (email: string, order: Order) => {
  const adjustedInventories: AdjustedInventories = {
    mercadolibre: null,
    shopify: null
  };
  const { line_items: orderItems } = order;
  // MercadoLibre
  adjustedInventories.mercadolibre = await Promise.all(
    mercadolibreApi.stores.map(async store => {
      const adjustedInventoryMercadolibre: AdjustedInventoryMercadolibre = [];
      for (const item of orderItems) {
        const adjustedItems = await adjustInventoryBySkuMercadolibre(
          store.api as MercadoLibreApi,
          item.sku,
          item.quantity
        );
        adjustedInventoryMercadolibre.push({ sku: item.sku, adjustedItems });
      }
      return adjustedInventoryMercadolibre;
    })
  );

  const stores = await database.getStores(email);
  const shopifyStore = stores.find(store => store.channel === 'shopify');
  if (shopifyStore) {
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
  }
  const slackMessage = {
    channel: 'shopify',
    order: {
      id: order.id,
      number: order.number,
      items: orderItems.map(item => ({
        sku: item.sku,
        quantity: item.quantity
      }))
    }
  };
  await slackApi.sendMessage(
    '```' + JSON.stringify(slackMessage, null, 2) + '```'
  );
  return adjustedInventories;
};

export default orderCreated;
