import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

import app from './app';
import express from 'express';

const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '';

// If API_PREFIX is defined, mount the app under that prefix
const server = express();
if (API_PREFIX) {
  server.use(API_PREFIX, app);
  console.log(`Using API prefix: ${API_PREFIX}`);
} else {
  server.use(app);
}

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}${API_PREFIX}/api`);
});