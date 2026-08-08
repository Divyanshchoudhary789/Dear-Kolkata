const mongoose = require('mongoose');

const connectDatabase = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('MONGO_URI not set. Please configure .env');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      bufferCommands: false  // Fail fast instead of buffering when not connected
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB error: ${err.message}`);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);

    if (error.message.includes('Authentication failed') || error.message.includes('bad auth')) {
      console.error('');
      console.error('─────────────────────────────────────────────────────────');
      console.error('  FIX: MongoDB Atlas Authentication Failed');
      console.error('');
      console.error('  1. Go to https://cloud.mongodb.com');
      console.error('  2. Select your project → Security → Database Access');
      console.error('  3. Check your database user credentials');
      console.error('  4. Make sure the password in MONGO_URI matches');
      console.error('  5. Verify the user has readWriteAnyDatabase role');
      console.error('─────────────────────────────────────────────────────────');
      console.error('');
    }

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('Server running WITHOUT database. Routes will return 500 until DB is connected.');
    }
  }
};

module.exports = connectDatabase;
