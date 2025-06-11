import { Router } from 'express';
import Transaction from '../models/transaction';
import Category from '../models/category';
import Account from '../models/account';

const router = Router();

// Pull changes from server
router.get('/pull', async (req, res) => {
  try {
    const { lastPulledAt = 0, schemaVersion = 1 } = req.query;
    const lastPulledTimestamp = new Date(Number(lastPulledAt));

    // Get all records updated after lastPulledAt
    const [transactions, categories, accounts] = await Promise.all([
      Transaction.find({
        updatedAt: { $gt: lastPulledTimestamp }
      }).populate('fromAccount toAccount category'),
      
      Category.find({
        updatedAt: { $gt: lastPulledTimestamp }
      }),
      
      Account.find({
        updatedAt: { $gt: lastPulledTimestamp }
      })
    ]);

    // Convert to WatermelonDB format
    const changes = {
      transactions: {
        created: transactions.map(convertTransactionToWatermelon),
        updated: [],
        deleted: []
      },
      categories: {
        created: categories.map(convertCategoryToWatermelon),
        updated: [],
        deleted: []
      },
      accounts: {
        created: accounts.map(convertAccountToWatermelon),
        updated: [],
        deleted: []
      }
    };

    res.json({
      changes,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Pull sync error:', error);
    res.status(500).json({ error: 'Failed to pull changes' });
  }
});

// Push changes to server
router.post('/push', async (req, res) => {
  try {
    const { changes } = req.body;

    // Process each table
    for (const [tableName, tableChanges] of Object.entries(changes)) {
      const { created = [], updated = [], deleted = [] } = tableChanges as any;

      // Handle created records
      for (const record of created) {
        await handleCreateRecord(tableName, record);
      }

      // Handle updated records
      for (const record of updated) {
        await handleUpdateRecord(tableName, record);
      }

      // Handle deleted records
      for (const recordId of deleted) {
        await handleDeleteRecord(tableName, recordId);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Push sync error:', error);
    res.status(500).json({ error: 'Failed to push changes' });
  }
});

// Helper functions to convert between formats
function convertTransactionToWatermelon(transaction: any) {
  return {
    id: transaction._id.toString(),
    transaction_date: transaction.transactionDate.getTime(),
    from_account: transaction.fromAccount?.toString(),
    to_account: transaction.toAccount?.toString(),
    category: transaction.category?.toString(),
    amount: transaction.amount,
    _status: 'created',
    _changed: ''
  };
}

function convertCategoryToWatermelon(category: any) {
  return {
    id: category._id.toString(),
    name: category.name,
    description: category.description,
    icon: category.icon,
    parent: category.parent?.toString(),
    created_at: category.createdAt.getTime(),
    updated_at: category.updatedAt.getTime(),
    _status: 'created',
    _changed: ''
  };
}

function convertAccountToWatermelon(account: any) {
  return {
    id: account._id.toString(),
    name: account.name,
    description: account.description,
    created_at: account.createdAt.getTime(),
    updated_at: account.updatedAt.getTime(),
    _status: 'created',
    _changed: ''
  };
}

async function handleCreateRecord(tableName: string, record: any) {
  switch (tableName) {
    case 'transactions':
      const transaction = new Transaction({
        _id: record.id,
        transactionDate: new Date(record.transaction_date),
        fromAccount: record.from_account,
        toAccount: record.to_account,
        category: record.category,
        amount: record.amount
      });
      await transaction.save();
      break;

    case 'categories':
      const category = new Category({
        _id: record.id,
        name: record.name,
        description: record.description,
        icon: record.icon,
        parent: record.parent
      });
      await category.save();
      break;

    case 'accounts':
      const account = new Account({
        _id: record.id,
        name: record.name,
        description: record.description
      });
      await account.save();
      break;
  }
}

async function handleUpdateRecord(tableName: string, record: any) {
  switch (tableName) {
    case 'transactions':
      await Transaction.findByIdAndUpdate(record.id, {
        transactionDate: new Date(record.transaction_date),
        fromAccount: record.from_account,
        toAccount: record.to_account,
        category: record.category,
        amount: record.amount
      });
      break;

    case 'categories':
      await Category.findByIdAndUpdate(record.id, {
        name: record.name,
        description: record.description,
        icon: record.icon,
        parent: record.parent
      });
      break;

    case 'accounts':
      await Account.findByIdAndUpdate(record.id, {
        name: record.name,
        description: record.description
      });
      break;
  }
}

async function handleDeleteRecord(tableName: string, recordId: string) {
  switch (tableName) {
    case 'transactions':
      await Transaction.findByIdAndDelete(recordId);
      break;
    case 'categories':
      await Category.findByIdAndDelete(recordId);
      break;
    case 'accounts':
      await Account.findByIdAndDelete(recordId);
      break;
  }
}

export default router; 