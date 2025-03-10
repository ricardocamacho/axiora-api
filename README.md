# axiora-api

Axiora is a SaaS that helps Latam e-commerce store owners to sell across different e-commerce marketplace and platforms, such as Shopify and Mercadolibre, synchronizing their sales & inventory to help them focus on their business needs, letting Axiora take care of the integration challenges.

The backend is (by default) a NodeJS REST API exposed on an AWS API Gateway that invokes the Lambdas. For processing notifications from external platforms (Mercadolibre, Shopify) I used AWS SNS, SQS, and Step Functions. The data from notifications is processed and saved on DynamoDB. All the resources were coded and deployed using Serverless framework.

The frontend is a SPA based in React, Redux, Tailwind CSS, and was deployed to AWS S3. Also used AWS CloudFront, Route 53, and SSL certificate.

Note: Code meets the business needs, however, there's a lot of room for improvement & refactoring.

https://axiora.co/

## Serverless high level architecture
![image](https://github.com/user-attachments/assets/d108e3e5-d98b-460c-9bb9-fea1e0b0ff74)

## Infrastructure

The Axiora API infrastructure was created using the Serverless framework, all the back-end resources are deployed through Serverless and connected to an AWS account. You need a Serverless account, and an AWS account running in your machine/server before executing the deploy commands.

Useful commands:
```
npm install
npm run sls-local
npm run sls-deploy:dev
npm run sls-deploy:prod
```

### Run API as a server/container (optional)

You can optionally have the API running in a server/container on EC2 (instead of lambda)

Server/container high level architecture
![image](https://github.com/user-attachments/assets/d29b1ec3-f0b9-4f43-9024-93fb2e9e289b)

I only set up one EC2 for saving AWS costs, but if the app starts getting traffic, you can have two or more instances, then the load balancer makes more sense.

Run the server locally:
```
npm install
npm run watch
npm run local
```

You can dockerize it:
```
npm run docker-build:dev
npm run docker-build:prod
docker run -p 8080:3000 axiora-api
```

## Environment Variables

You will need a `.env.dev` and `.env.prod` files in the root and should contain the following ENV variables:

```
STAGE=dev|prod
AWS_ACCOUNT_ID=your-aws-account-id
AWS_ACCOUNT_REGION=your-region
DYNAMODB_AXIORA_TABLE=your-dynamodb-table
JWT_SECRET_KEY=some-jwt-secret-key
MELI_CLIENT_ID=some-mercadolibre-client-id
MELI_CLIENT_SECRET=some-mercadolibre-secret-id
SLACK_WEBHOOK_PATH=your-slack-webhook-path
```
