import mongoose, { Document, Schema } from 'mongoose';

interface ICategory extends Document {
    name: string;
    description: string;
    icon: string;
    parent: mongoose.Types.ObjectId | null;
    updatedAt?: number;
}

const categorySchema: Schema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: false },
    icon: { type: String, required: false },
    color: { type: String, required: false },
    type: { type: String, enum: ['Income', 'Expense'], required: false, default: 'Expense' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    order: { type: Number, default: 0 },
    updatedAt: { type: Number, default: Date.now }
}, { timestamps: true });

// Virtual for getting subcategories
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent'
});

// Method to get all subcategories (direct children)
categorySchema.methods.getSubcategories = async function() {
    return await mongoose.model('Category').find({ parent: this._id });
};

// Static method to get root categories (categories without parents)
categorySchema.statics.getRootCategories = async function() {
    return await this.find({ parent: null });
};

const Category = mongoose.model<ICategory>('Category', categorySchema);

export default Category; 