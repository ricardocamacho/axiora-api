import axios, { AxiosInstance } from 'axios';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: 'https://hooks.slack.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

const sendMessage = async (text: string) => {
  const response = await axiosInstance.post(
    '/services/T01HT0XHR4N/B01T9HMPC1H/2xEacB6GJrmG9bRJDPcpDxUu',
    {
      text
    }
  );
  return response.data;
};

export const slackApi = {
  sendMessage
};
