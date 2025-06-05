import express from 'express';
import mongoose from 'mongoose';
import accountRoutes from './routes/account';
import transactionRoutes from './routes/transaction';
import categoryRoutes from './routes/category';
import { languageMiddleware } from './middleware/language';

const app = express();

app.use(express.json());
app.use(languageMiddleware);
app.use('/api', accountRoutes);
app.use('/api', transactionRoutes);
app.use('/api', categoryRoutes);

// MongoDB connection
const mongoUri = process.env.MONGO_URI as string;  // Type assertion for environment variable
mongoose.connect(mongoUri)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

export default app;
