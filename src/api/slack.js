const axios = require('axios');

const axiosInstance = axios.create({
  baseURL: 'https://hooks.slack.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

const sendMessage = async text => {
  const response = await axiosInstance.post(
    '/services/T01HT0XHR4N/B01T9HMPC1H/2xEacB6GJrmG9bRJDPcpDxUu',
    {
      text
    }
  );
  return response.data;
};

const slackApi = {
  sendMessage
};

module.exports = slackApi;
