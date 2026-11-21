require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 3002;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Books database connection established successfully.');

    const syncOptions = process.env.NODE_ENV === 'production'
      ? {}
      : { alter: true };

    await db.sequelize.sync(syncOptions);
    console.log('✅ Books database models synchronized.');

    app.listen(PORT, () => {
      console.log(`🚀 Books service is running on port ${PORT}`);
      console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
      console.log(`❤️  Health check at http://localhost:${PORT}/health`);
      console.log(`🌐 API base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Unable to start books service:', error);
    process.exit(1);
  }
};

startServer();
