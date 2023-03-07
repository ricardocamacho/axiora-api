'use strict';

const mercadolibre = require('./src/mercadolibre');

module.exports.handler = async sqsEvent => {
  for(const message of sqsEvent.Records) {
    const notification = JSON.parse(message.body);
    console.log('Processing notification', notification);
    await mercadolibre.handleNotification(notification);
  }
};
