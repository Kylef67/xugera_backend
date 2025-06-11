import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import Transaction from './models/Transaction';
import Category from './models/Category';
import Account from './models/Account';

// Configure the SQLite adapter for Expo compatibility
const adapter = new SQLiteAdapter({
  schema,
  // Disable JSI for Expo compatibility
  jsi: false,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  }
});

// Create the database instance
export const database = new Database({
  adapter,
  modelClasses: [
    Transaction,
    Category,
    Account,
  ],
});

// Export collections for easy access
export const collections = {
  transactions: database.get('transactions'),
  categories: database.get('categories'),
  accounts: database.get('accounts'),
};

export default database; 