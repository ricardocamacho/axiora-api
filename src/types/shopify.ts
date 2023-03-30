type ProductVariantNode = {
  node: {
    id: string,
    sku: string,
    title: string,
    inventoryQuantity: number,
    legacyResourceId: string,
    displayName: string,
    inventoryItem: {
      id: string,
      legacyResourceId: string,
      inventoryLevel: {
        id: string
      }
    }
  }
};

export type GetProductsBySkuResponse = {
  data: {
    productVariants: {
      edges: ProductVariantNode[]
    }
  }
};

export type InventoryLevel = {
  id: string,
  available: number
};

export type AdjustInventoryLevelQuantityResponse = {
  data: {
    inventoryAdjustQuantity: {
      inventoryLevel: InventoryLevel
    }
  }
};

export type InventoryBulkAdjustQuantityAtLocation = {
  data: {
    inventoryBulkAdjustQuantityAtLocation: {
      inventoryLevels: InventoryLevel[]
    }
  }
};

export type CreateProductResponse = {
  data: {
    productCreate: {
      product: {
        id: string,
        title: string
      }
    }
  }
};

type LineItem = {
  variant_id: number,
  sku: string,
  quantity: number
};

export type Order = {
  id: number,
  number: number,
  line_items: LineItem[]
};
