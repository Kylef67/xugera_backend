import { Request, Response } from "express";
import Account from "../models/account";
import Transaction from "../models/transaction";
import mongoose from "mongoose";
import { translate } from "../localization";

// Helper function to generate a hash for account content comparison
function generateAccountHash(account: any): string {
  const accountData = {
    name: account.name,
    description: account.description,
    balance: account.balance,
    type: account.type,
    icon: account.icon,
    color: account.color,
    includeInTotal: account.includeInTotal,
    creditLimit: account.creditLimit,
    isDeleted: account.isDeleted
  };
  
  // Simple hash function for object comparison
  const str = JSON.stringify(accountData);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export default {
  post: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = new Account(req.body);
      await account.save();
      res.status(201).json({
        data: account,
        message: translate('accounts.created_success', req.lang)
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  get: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate } = req.query;
      const account = await Account.findById(req.params.id);
      if (!account) {
        res.status(404).json({ error: translate('accounts.not_found', req.lang) });
        return;
      }

      // Create date filter for transactions
      const dateFilter: any = {};
      
      if (fromDate) {
        dateFilter.$gte = new Date(fromDate as string);
      }
      
      if (toDate) {
        const toDateObj = new Date(toDate as string);
        toDateObj.setHours(23, 59, 59, 999);
        dateFilter.$lte = toDateObj;
      }

      // Convert ID to ObjectId
      const accountId = new mongoose.Types.ObjectId(req.params.id);

      // Query for transactions
      const query: any = { account: accountId };
      if (Object.keys(dateFilter).length > 0) {
        query.date = dateFilter;
      }

      const transactions = await Transaction.find(query).sort({ date: -1 });
      
      res.json({
        ...account.toObject(),
        transactions
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  all: async (req: Request, res: Response): Promise<void> => {
    try {
      const { fromDate, toDate } = req.query;
      
      // Create date filter for transactions
      const dateFilter: any = {};
      
      if (fromDate) {
        dateFilter.$gte = new Date(fromDate as string);
      }
      
      if (toDate) {
        const toDateObj = new Date(toDate as string);
        toDateObj.setHours(23, 59, 59, 999);
        dateFilter.$lte = toDateObj;
      }
      
      // Get all accounts
      const accounts = await Account.find({ isDeleted: false });
      
      // Calculate balances for each account
      const accountsWithBalances = await Promise.all(
        accounts.map(async (account) => {
          // Get the account ID as a mongoose ObjectId
          const accountId = account._id as mongoose.Types.ObjectId;
          
          // Query for transactions
          const query: any = { account: accountId };
          if (Object.keys(dateFilter).length > 0) {
            query.date = dateFilter;
          }
          
          const transactions = await Transaction.find(query);
          
          // Calculate balance
          let balance = account.balance || 0;
          let totalIncoming = 0;
          let totalOutgoing = 0;
          
          transactions.forEach(transaction => {
            if (transaction.amount > 0) {
              totalIncoming += transaction.amount;
            } else {
              totalOutgoing += Math.abs(transaction.amount);
            }
          });
          
          return {
            ...account.toObject(),
            transactions: {
              balance,
              totalIncoming,
              totalOutgoing
            }
          };
        })
      );
      
      res.json(accountsWithBalances);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  update: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await Account.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!account) {
        res.status(404).json({ error: translate('accounts.not_found', req.lang) });
        return;
      }
      res.json(account);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
  delete: async (req: Request, res: Response): Promise<void> => {
    try {
      const account = await Account.findByIdAndDelete(req.params.id);
      if (!account) {
        res.status(404).json({ error: translate('accounts.not_found', req.lang) });
        return;
      }
      res.json({ message: translate('accounts.deleted_success', req.lang) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  syncPull: async (req: Request, res: Response): Promise<void> => {
    try {
      const { lastSyncTimestamp, accountHashes } = req.body;
      const timestamp = lastSyncTimestamp || 0;
      
      // Get accounts updated since last sync
      const accounts = await Account.find({
        updatedAt: { $gt: timestamp }
      }).sort({ updatedAt: 1 });
      
      // If client provided account hashes, filter out accounts that haven't changed
      let filteredAccounts = accounts;
      if (accountHashes && typeof accountHashes === 'object') {
        filteredAccounts = accounts.filter(account => {
          const accountId = (account._id as mongoose.Types.ObjectId).toString();
          
          // If client doesn't have this account, include it
          if (!accountHashes[accountId]) {
            return true;
          }
          
          // Generate hash for server account
          const serverHash = generateAccountHash(account);
          
          // Include only if hash is different (content changed)
          return serverHash !== accountHashes[accountId];
        });
        
        console.log(`Delta sync: Filtered ${accounts.length - filteredAccounts.length} unchanged accounts`);
      }
      
      res.json({
        accounts: filteredAccounts.map(account => ({
          id: (account._id as mongoose.Types.ObjectId).toString(),
          name: account.name,
          description: account.description,
          balance: account.balance,
          type: account.type,
          icon: account.icon,
          color: account.color,
          includeInTotal: account.includeInTotal,
          creditLimit: account.creditLimit,
          updatedAt: account.updatedAt,
          isDeleted: account.isDeleted,
          hash: generateAccountHash(account) // Include hash for future comparisons
        })),
        timestamp: Date.now()
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
  
  syncPush: async (req: Request, res: Response): Promise<void> => {
    try {
      const { accounts } = req.body;
      const timestamp = Date.now();
      const acceptedAccounts: string[] = [];
      
      console.log(`Received ${accounts.length} accounts for sync push`);
      
      for (const accountData of accounts) {
        // Check if ID is a valid ObjectId format (24 character hex string)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(accountData.id);
        
        if (!isValidObjectId) {
          // Skip accounts with invalid ObjectId format to prevent casting errors
          console.warn(`Skipping account with invalid ObjectId: ${accountData.id}`);
          continue;
        }
        
        // Check if account exists and get its current hash if available
        const existingAccount = await Account.findById(accountData.id);
        
        // If account doesn't exist, create it
        if (!existingAccount) {
          console.log(`Creating new account: ${accountData.name} (${accountData.id})`);
          const newAccount = new Account({
            _id: accountData.id,
            name: accountData.name,
            description: accountData.description,
            balance: accountData.balance,
            type: accountData.type,
            icon: accountData.icon,
            color: accountData.color,
            includeInTotal: accountData.includeInTotal,
            creditLimit: accountData.creditLimit,
            updatedAt: accountData.updatedAt,
            isDeleted: accountData.isDeleted
          });
          await newAccount.save();
          acceptedAccounts.push(accountData.id);
          continue;
        }
        
        // If account exists, check if it needs updating
        const currentHash = accountData.hash;
        const existingHash = generateAccountHash(existingAccount);
        
        console.log(`Account ${accountData.name} (${accountData.id}):`);
        console.log(`- Client timestamp: ${accountData.updatedAt}, Server timestamp: ${existingAccount.updatedAt}`);
        console.log(`- Client hash: ${currentHash}, Server hash: ${existingHash}`);
        
        // Update if client's update is newer OR if hashes don't match but timestamps are equal
        if (accountData.updatedAt > existingAccount.updatedAt || 
            (currentHash !== existingHash && accountData.updatedAt === existingAccount.updatedAt)) {
          console.log(`Updating account: ${accountData.name} (${accountData.id})`);
          
          existingAccount.name = accountData.name;
          existingAccount.description = accountData.description;
          existingAccount.balance = accountData.balance;
          existingAccount.type = accountData.type;
          existingAccount.icon = accountData.icon;
          existingAccount.color = accountData.color;
          existingAccount.includeInTotal = accountData.includeInTotal;
          existingAccount.creditLimit = accountData.creditLimit;
          existingAccount.updatedAt = accountData.updatedAt;
          existingAccount.isDeleted = accountData.isDeleted;
          
          await existingAccount.save();
          acceptedAccounts.push(accountData.id);
        } else {
          console.log(`Skipping account update: ${accountData.name} (${accountData.id}) - No changes or older version`);
        }
      }
      
      console.log(`Accepted ${acceptedAccounts.length} accounts for update`);
      
      res.json({
        success: true,
        timestamp,
        acceptedAccounts
      });
    } catch (error) {
      console.error('Error in syncPush:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
};
