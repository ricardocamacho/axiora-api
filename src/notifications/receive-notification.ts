import { APIGatewayEvent, Handler, ProxyResult } from 'aws-lambda';

type ReceiveNotificationResponse = {
  statusCode: ProxyResult['statusCode'],
  pathParameters: APIGatewayEvent['pathParameters'],
  body: APIGatewayEvent['body']
};

export const handler: Handler = async (event: APIGatewayEvent): Promise<ReceiveNotificationResponse> => {
  return {
    statusCode: 200,
    pathParameters: event.pathParameters,
    body: event.body
  };
};
