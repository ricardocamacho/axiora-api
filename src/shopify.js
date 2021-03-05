const shopifyApi = require('./api/shopify');

const createProduct = async productInput => {
  const createdProduct = await shopifyApi.createProduct(productInput);
  return createdProduct;
};

const shopify = {
  createProduct
};

module.exports = shopify;
