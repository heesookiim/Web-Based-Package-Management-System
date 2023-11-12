// app.ts
import express from 'express';
import packageRouter from './route/packageRouter';

const app = express();

app.use(express.json());

// You could set up other global middleware here

// Setup the routes
app.use('/package', packageRouter);

// Export the configured app to be used by server.ts
export default app;