'use strict';

module.exports.handler = async event => {
  return {
    statusCode: 200,
    pathParameters: event.pathParameters,
    body: event.body
  };
};
