'use strict';

const mercadolibre = require('./src/mercadolibre');

module.exports.handler = async event => {
  console.log('Procesando notificación de Mercadolibre');
  const notificationResponse = await mercadolibre.handleNotification(
    event.body
  );
  return notificationResponse;
};
