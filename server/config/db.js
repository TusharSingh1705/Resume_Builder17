
const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      console.log('  ⏳ No MONGODB_URI found. Starting in-memory MongoDB (this takes a moment)...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      mongoURI = mongoMemoryServer.getUri();
      console.log('  ✨ In-memory MongoDB started successfully!');
    }

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`  📦 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('  ❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('  ⚠️  MongoDB disconnected. Attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('  🔄 MongoDB reconnected successfully.');
    });

  } catch (error) {
    console.error(`  ❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
