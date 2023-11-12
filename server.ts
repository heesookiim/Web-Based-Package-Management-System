// server.ts
import dotenv from 'dotenv';
import app from './app'; // Import the express app

// Load environment variables from .env file
dotenv.config();

// Retrieve the PORT from process.env with a fallback to 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});