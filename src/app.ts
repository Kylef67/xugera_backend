import express from 'express';
import mongoose from 'mongoose';
import accountRoutes from './routes/account';
import transactionRoutes from './routes/transaction';

const app = express();

app.use(express.json());
app.use('/api', accountRoutes);
app.use('/api', transactionRoutes);

// MongoDB connection
const mongoUri = process.env.MONGO_URI as string;  // Type assertion for environment variable
mongoose.connect(mongoUri)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

export default app;
