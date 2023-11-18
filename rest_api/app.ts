// app.ts
import * as dotenv from 'dotenv';
import * as express from 'express';
// import post_package from './routes/post_package';
import post_packages from './routes/post_packages';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

// Retrieve the PORT from process.env with a fallback to 3000
const PORT = process.env.PORT || 3000;

const app = express();

// Start the server
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
app.use(express.json());

// Setup the routes
// app.use('/package', post_package);
app.use('/packages', post_packages);

app.get('/', (req, res)=> {
  res.sendFile(path.join(__dirname, 'web', 'add.html'));
});

export default app;