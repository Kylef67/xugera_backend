import mongoose, { Document, Schema } from 'mongoose';

interface IAccount extends Document {
    name: string;
    description: string;
}

const accountSchema: Schema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
}, { timestamps: true });

const Account = mongoose.model<IAccount>('Account', accountSchema);

export default Account;
