import mongoose, { Document, Schema, Query, Model } from "mongoose";

interface ITransaction extends Document {
    transactionDate: Date;
    fromAccount: string;
    toAccount?: string;
    category?: string;
    amount: number;
    description?: string;
    notes?: string;
    type?: 'income' | 'expense' | 'transfer',
    isDeleted?: boolean;
    deletedAt?: Date;
    updatedAt?: number;
    softDelete(): Promise<ITransaction>;
}

interface ITransactionQuery extends Query<any, ITransaction> {
    notDeleted(): ITransactionQuery;
}

interface ITransactionModel extends Model<ITransaction> {
    findNotDeleted(filter?: any): ITransactionQuery;
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
    },
    description: {
        type: String,
        required: false
    },
    notes: {
        type: String,
        required: false
    },
    type: {
        type: String,
        enum: ['income', 'expense', 'transfer'],
        required: false
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true // Add index for efficient querying
    },
    deletedAt: {
        type: Date,
        required: false
    },
    updatedAt: {
        type: Number,
        default: Date.now
    }
}, { timestamps: true }) // Add automatic createdAt/updatedAt

// Create indexes for frequently queried fields
transactionSchema.index({ fromAccount: 1 });
transactionSchema.index({ toAccount: 1 });
transactionSchema.index({ transactionDate: 1 });
transactionSchema.index({ category: 1 });
// Compound indexes for common query patterns with soft delete filter
transactionSchema.index({ fromAccount: 1, isDeleted: 1, transactionDate: 1 });
transactionSchema.index({ toAccount: 1, isDeleted: 1, transactionDate: 1 });
transactionSchema.index({ category: 1, isDeleted: 1, transactionDate: 1 });
transactionSchema.index({ isDeleted: 1, transactionDate: 1 });

// Add instance method for soft delete
transactionSchema.methods.softDelete = function() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
};

// Add static method to find non-deleted documents
transactionSchema.statics.findNotDeleted = function(filter = {}) {
    return this.find({ ...filter, isDeleted: { $ne: true } });
};

const Transaction = mongoose.model<ITransaction, ITransactionModel>('Transaction', transactionSchema);

export default Transaction