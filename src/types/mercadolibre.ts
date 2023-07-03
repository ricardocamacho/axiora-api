import { MercadoLibreApi } from '../api/mercadolibre';

export type Notification = {
  _id: string,
  topic: string,
  resource: string,
  user_id: number,
  application_id: number,
  sent: string,
  attempts: string,
  received: string
};

export type Profile = {
  nickname: string
};

export type Store = {
  access_token: string,
  refresh_token: string,
  user_id: number,
  api?: MercadoLibreApi
};

export type OAuthTokenResponse = {
  access_token: string,
  refresh_token: string
};

type Attribute = {
  id: string,
  value_name: string
};

type Variation = {
  catalog_product_id?: string,
  inventory_id?: string,
  attributes: Attribute[],
  available_quantity: number
};

export type Shipping = {
  logistic_type: 'fulfillment' | 'xd_drop_off' | 'self_service'
};

export type Item = {
  available_quantity?: number,
  variations?: Variation[],
  shipping: Shipping
};

export type UpdatedItem = Item & {
  id: string,
  error?: any
};

export type VariationResponse = {
  availableQuantity?: number,
  sku?: string,
  updated?: boolean
};

export type UpdatedItemResponse = {
  id: string,
  availableQuantity?: number,
  updated?: boolean,
  reason?: string,
  variations?: VariationResponse[]
};

type OrderItemDetail = {
  id: string,
  seller_sku: string
};

type OrderItem = {
  item: OrderItemDetail,
  quantity: number
};

export type Order = {
  id: number,
  seller: { id: number },
  order_items: OrderItem[],
  date_created: string,
  status: string,
  tags: string[],
  shipping: {
    id: number
  }
};
