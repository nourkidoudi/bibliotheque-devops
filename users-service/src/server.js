require('dotenv').config();

const app = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync models with database
    const syncOptions = process.env.NODE_ENV === 'production'
      ? {}
      : { alter: true };

    await db.sequelize.sync(syncOptions);
    console.log('✅ Database models synchronized.');

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Users service is running on port ${PORT}`);
      console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
      console.log(`❤️  Health check at http://localhost:${PORT}/health`);
      console.log(`🌐 API base URL: http://localhost:${PORT}/api`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Unable to start the server:', error);
    process.exit(1);
  }
};

startServer();
