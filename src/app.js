const express = require('express');
const mongoose = require('mongoose');
const accountRoutes = require('./routes/account');
const transactionRoutes = require('./routes/transaction')
const app = express();

app.use(express.json());
app.use('/api', accountRoutes);
app.use('/api', transactionRoutes);

// MongoDB connection
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

module.exports = app;
