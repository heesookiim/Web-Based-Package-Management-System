// app.ts
import * as express from 'express';
import packageRouter from './packageRouter';

const app = express();
app.use(express.json());

// Setup the routes
app.use('/package', packageRouter);

// Export the configured app to be used by server.ts
export default app;
