import mongoose, { Document, Schema } from 'mongoose';

interface IAccount extends Document {
    name: string;
    description: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const accountSchema: Schema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    order: { type: Number, default: 0 },
}, { timestamps: true });

const Account = mongoose.model<IAccount>('Account', accountSchema);

export default Account;
