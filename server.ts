import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import app from './app';

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Axiora app running on port ${PORT} env ${process.env.STAGE}`);
});
