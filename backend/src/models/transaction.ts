import mongoose, { Document, Schema } from "mongoose";

interface ITransaction extends Document {
    transactionDate: Date;
    fromAccount: string;
    toAccount: string;
    category: string;
    amount: number;
}

const transactionSchema: Schema = new mongoose.Schema({
    transactionDate: {
        type: Date,
        required: true
    },
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: false
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: false
    },
    amount: {
        type: Number,
        required: true
    }
})

// Create indexes for frequently queried fields
transactionSchema.index({ fromAccount: 1 });
transactionSchema.index({ toAccount: 1 });
transactionSchema.index({ transactionDate: 1 });
transactionSchema.index({ category: 1 });
// Compound indexes for common query patterns
transactionSchema.index({ fromAccount: 1, transactionDate: 1 });
transactionSchema.index({ toAccount: 1, transactionDate: 1 });
transactionSchema.index({ category: 1, transactionDate: 1 });


const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction