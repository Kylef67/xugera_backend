const express = require('express');
const mongoose = require('mongoose');
const accountRoutes = require('./routes/account');
const app = express();

app.use(express.json());
app.use('/api', accountRoutes);

// MongoDB connection
const mongoUri = process.env.MONGO_URI;
console.log(mongoUri)
mongoose.connect(mongoUri).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

module.exports = app;
