'use strict';

module.exports.handler = async event => {
  return {
    statusCode: 200,
    body: {
      channel: event.pathParameters.channel,
      ...JSON.parse(event.body)
    }
  };
};
