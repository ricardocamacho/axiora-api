import axios, { AxiosInstance } from 'axios';
import config from '../config';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: 'https://hooks.slack.com',
  headers: {
    'Content-Type': 'application/json'
  }
});

const sendMessage = async (text: string) => {
  const response = await axiosInstance.post(
    `/services/${config.SLACK_WEBHOOK_PATH}`,
    {
      text
    }
  );
  return response.data;
};

export const slackApi = {
  sendMessage
};
