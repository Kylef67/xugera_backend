import { TranslationMap } from '../index';

const translations: TranslationMap = {
  errors: {
    "Name is required": "Name is required",
    "Description is required": "Description is required",
    "Image is required": "Image is required",
    "Invalid parent ID": "Invalid parent ID format",
    "Invalid date format": "Please provide a valid date",
    "Invalid account ID": "Invalid account ID format",
    "Invalid from date format": "From date has an invalid format",
    "Invalid to date format": "To date has an invalid format",
    "At least one field must be provided": "You must update at least one field"
  },
  validations: {
    required: "{{field}} is required",
    min_length: "{{field}} must be at least {{length}} characters long",
    invalid_format: "{{field}} format is invalid"
  },
  transactions: {
    created_success: "Transaction created successfully",
    updated_success: "Transaction updated successfully",
    deleted_success: "Transaction deleted successfully",
    not_found: "Transaction not found"
  },
  accounts: {
    created_success: "Account created successfully",
    updated_success: "Account updated successfully",
    deleted_success: "Account deleted successfully",
    not_found: "Account not found"
  },
  categories: {
    created_success: "Category created successfully",
    updated_success: "Category updated successfully",
    deleted_success: "Category deleted successfully",
    not_found: "Category not found",
    cannot_delete_with_subcategories: "Cannot delete category with subcategories. Delete subcategories first or reassign them."
  }
};

export default translations; 