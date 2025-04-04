import mongoose, { Document, Schema } from "mongoose";

interface ITransaction extends Document {
    transactionDate: Date;
    account: string;
}

const transactionSchema: Schema = new mongoose.Schema({
    transactionDate: {
        type: Date,
        required: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    }
})

// Create indexes for frequently queried fields
transactionSchema.index({ account: 1 });
transactionSchema.index({ transactionDate: 1 });
// Compound index for queries that filter by both account and date
transactionSchema.index({ account: 1, transactionDate: 1 });

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction