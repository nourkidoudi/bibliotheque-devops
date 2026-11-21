require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3003;

const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Loans service connected to MongoDB successfully.');

    app.listen(PORT, () => {
      console.log(`🚀 Loans service is running on port ${PORT}`);
      console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
      console.log(`❤️  Health check at http://localhost:${PORT}/health`);
      console.log(`🌐 API base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Unable to start loans service:', error);
    process.exit(1);
  }
};

startServer();
