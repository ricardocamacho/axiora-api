const database = require('./database');

const getStores = async email => {
  const stores = await database.getStores(email);
  return stores;
};

const axiora = {
  getStores
};

module.exports = axiora;
