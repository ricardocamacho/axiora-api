import config from './src/config';
import app from './src/app';

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Axiora app running on port ${PORT} env ${config.STAGE}`);
});
