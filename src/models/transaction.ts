import mongoose, { Document, Schema } from "mongoose";

interface ITransaction extends Document {
    transactionDate: string;
    account: string;
}

const transactionSchema: Schema = new mongoose.Schema({
    transactionDate: {
        type: Date,
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    }

})

const Transaction = mongoose.model<ITransaction>('Transaction' , transactionSchema);

export default Transaction