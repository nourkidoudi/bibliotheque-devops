const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/loans-service';

  try {
    await mongoose.connect(mongoURI);
    console.log('[Database] Connected to MongoDB successfully.');
  } catch (error) {
    console.error('[Database] Connection error:', error.message);
    process.exit(1);
  }

  mongoose.connection.on('connected', () => {
    console.log('[Database] Mongoose connected to MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[Database] Mongoose connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] Mongoose disconnected from MongoDB');
  });

  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('[Database] Connection closed due to application termination');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await mongoose.connection.close();
    console.log('[Database] Connection closed due to SIGTERM');
    process.exit(0);
  });
};

module.exports = connectDB;
