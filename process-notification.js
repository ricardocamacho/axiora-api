'use strict';

const mercadolibre = require('./src/mercadolibre');

module.exports.handler = async event => {
  const notification = JSON.parse(event.Records[0].Sns.Message);
  console.log('Processing notification', notification);
  await mercadolibre.handleNotification(notification);
};
