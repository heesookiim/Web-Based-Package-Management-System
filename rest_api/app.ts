// app.ts
import * as dotenv from 'dotenv';
import * as express from 'express';
// import packageRouter from './routes/post_package';
import packagesRouter from './routes/post_packages';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

// Retrieve the PORT from process.env with a fallback to 3000
const PORT = process.env.PORT || 3000;


const app: express.Application = express();

// Open the server
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
app.use(express.json());

// Setup the routes
// app.use('/package', packageRouter);
app.use('/packages', packagesRouter);

app.get('/', (req, res)=> {
  res.sendFile(path.join(__dirname, 'web', 'add.html'));
});

// Export the configured app to be used by server.ts
export default app;
