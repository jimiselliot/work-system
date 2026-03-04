// server.js
const path = require('path');

// ✅ Load environment variables from correct location
// .env file is in the same directory as server.js
require('dotenv').config({
  path: path.join(__dirname, '.env')  // Changed from '../../.env'
});

// Debug: Confirm env loading
console.log('=== Environment Variables Loaded ===');
console.log('Current directory:', __dirname);
console.log('PORT:', process.env.PORT);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('===================================');

// Load app from src folder
const app = require('./src/app');
const { testConnection, initializeDatabase } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('🔄 Starting server...');

    // 🔹 Initialize DB (create DB / tables if needed)
    console.log('🗄️  Initializing database...');
    const dbReady = await initializeDatabase();

    if (!dbReady) {
      throw new Error('Database initialization failed');
    }

    // 🔹 Test DB connection
    console.log('🔌 Testing database connection...');
    await testConnection();

    // 🔹 Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌍 Server URL: http://localhost:${PORT}`);
      console.log(`🗄️  Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
      console.log(`👤 DB User: ${process.env.DB_USER}`);
      console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`📁 App loaded from: ${__dirname}/src/app.js`);
      console.log('\n📌 Available API Endpoints:');
      console.log('   GET    /api/health            - Health check');
      console.log('   GET    /api/dashboard/stats   - Dashboard stats (authenticated)');
      console.log('   POST   /api/auth/login        - User login');
      console.log('   GET    /api/users             - List users (admin)');
      console.log('   GET    /api/projects          - List projects');
      console.log('   GET    /api/tasks             - List tasks');
      console.log('\n🔒 Note: Most endpoints require JWT authentication');
    });

  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    console.error('Error details:', err);
    process.exit(1);
  }
}

startServer();