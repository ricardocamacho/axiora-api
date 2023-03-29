export type Channel = 'mercadolibre' | 'shopify';

export type DbMercadolibreData = {
  access_token: string,
  refresh_token: string,
  user_id: number
};

export type DbShopifyData = {
  access_token: string,
  base_url: string,
  location_id: string,
};

export type DbStore<ChannelData> = {
  PK: string,
  SK: string,
  channel: Channel,
  data: ChannelData,
  status: string,
  created_at: string
};
