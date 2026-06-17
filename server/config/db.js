
const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set. Please add it to your Vercel project settings.');
    }

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`  📦 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('  ❌ MongoDB connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('  ⚠️  MongoDB disconnected.');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('  🔄 MongoDB reconnected successfully.');
      isConnected = true;
    });

  } catch (error) {
    console.error(`  ❌ MongoDB connection failed: ${error.message}`);
    isConnected = false;
    throw error;
  }
};

module.exports = connectDB;
