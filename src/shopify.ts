import { InventoryLevel } from './types/shopify'
import { shopifyApi } from './api/shopify';

const createProduct = async (productInput: object) => {
  const createdProduct = await shopifyApi.createProduct(productInput);
  return createdProduct;
};

const adjustInventory = async (sku: string, purchasedQuantity: number): Promise<InventoryLevel[]> => {
  console.log(`Actualizando ${sku} cantidad comprada ${purchasedQuantity}`);
  const {
    data: {
      productVariants: { edges: products }
    }
  } = await shopifyApi.getProductsBySku(sku);
  const inventoryItemAdjustments = products.map(product => ({
    inventoryItemId: product.node.inventoryItem.id,
    availableDelta: purchasedQuantity * -1
  }));
  const {
    data: {
      inventoryBulkAdjustQuantityAtLocation: { inventoryLevels }
    }
  } = await shopifyApi.inventoryBulkAdjustQuantityAtLocation(
    inventoryItemAdjustments
  );
  return inventoryLevels;
};

export const shopify = {
  createProduct,
  adjustInventory
};

