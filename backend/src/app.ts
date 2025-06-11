import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import accountRoutes from './routes/account';
import transactionRoutes from './routes/transaction';
import categoryRoutes from './routes/category';
import syncRoutes from './routes/sync';
import { languageMiddleware } from './middleware/language';

const app = express();

app.use(cors());
app.use(express.json());
app.use(languageMiddleware);
app.use('/api', accountRoutes);
app.use('/api', transactionRoutes);
app.use('/api', categoryRoutes);
app.use('/sync', syncRoutes);

// MongoDB connection
const mongoUri = process.env.MONGO_URI as string;  // Type assertion for environment variable
mongoose.connect(mongoUri)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

export default app;
