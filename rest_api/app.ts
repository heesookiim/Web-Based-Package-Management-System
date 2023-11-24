// app.ts
import * as dotenv from 'dotenv';
import * as express from 'express';
import post_package from './routes/post_package';
import post_packages from './routes/post_packages';
import * as path from 'path';
import { initializeDatabase } from './db';
import { logger } from '../logger_cfg';

// Load environment variables from .env file
dotenv.config();
const PORT = process.env.PORT || 3000;

async function checkDatabase() {
  try {
    await initializeDatabase();
  } catch (error) {
    logger.error('Failed to intialize Database due to an error:', error);
    process.exit(1);
  }
}

checkDatabase();

const app = express();
app.use(express.json());

// Start the server
app.listen(PORT, () => {
  logger.info(`API running on port ${PORT}`);
});

// Setup the routes
app.use('/package', post_package);
app.use('/packages', post_packages);

app.get('/', (req, res)=> {
  res.sendFile(path.join(__dirname, '../web', 'add.html'));
});

export default app;