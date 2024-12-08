const { MongoClient, ServerApiVersion } = require('mongodb');
const {uri} = require('../config.json')

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const connectDB = async () => {
    try {
      await client.connect();
      
      return client.db('Finance').collection('Expense');
    } catch (err) {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    }
  };
  
module.exports = connectDB;