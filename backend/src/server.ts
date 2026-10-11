import app from './app';
import { env } from './config/env';
import { testConnection } from './database/pool';

async function start() {
  try {
    await testConnection();

    app.listen(env.PORT, () => {
      console.log(`[SERVER] ShopNest API running at http://localhost:${env.PORT}`);
      console.log(`[SERVER] Health: http://localhost:${env.PORT}/api/health`);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

start();