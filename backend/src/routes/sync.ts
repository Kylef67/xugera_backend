import { Router } from 'express';
import Transaction from '../models/transaction';
import Category from '../models/category';
import Account from '../models/account';

const router = Router();

// Pull changes from server (simplified for AsyncStorage frontend)
router.get('/pull', async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(since as string) : new Date(0);
    
    console.log('📥 Pull request received, since:', sinceDate.toISOString());

    // For now, return ALL accounts and transactions, not just updated ones
    // This ensures we don't lose data during sync
    // TODO: Implement proper incremental sync with deletions tracking
    const [accounts, transactions, categories] = await Promise.all([
      Account.find({}), // Get ALL accounts
      
      Transaction.find({
        updatedAt: { $gt: sinceDate }
      }).populate('fromAccount toAccount category'),
      
      Category.find({
        updatedAt: { $gt: sinceDate }
      })
    ]);

    console.log('📦 Returning data:', {
      accountsCount: accounts.length,
      transactionsCount: transactions.length,
      categoriesCount: categories.length
    });

    // Return simple format for AsyncStorage frontend
    res.json({
      accounts: accounts.map(account => ({
        _id: (account as any)._id.toString(),
        name: account.name,
        description: account.description,
        createdAt: (account as any).createdAt,
        updatedAt: (account as any).updatedAt,
        order: (account as any).order || 0
      })),
      transactions: transactions.map(transaction => ({
        _id: (transaction as any)._id.toString(),
        fromAccount: (transaction as any).fromAccount?.toString(),
        toAccount: (transaction as any).toAccount?.toString(),
        category: (transaction as any).category?.toString(),
        amount: (transaction as any).amount,
        transactionDate: (transaction as any).transactionDate,
        description: (transaction as any).description || ''
      })),
      categories: categories.map(category => ({
        _id: (category as any)._id.toString(),
        name: (category as any).name,
        description: (category as any).description,
        icon: (category as any).icon,
        parent: (category as any).parent?.toString(),
        createdAt: (category as any).createdAt,
        updatedAt: (category as any).updatedAt
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pull sync error:', error);
    res.status(500).json({ error: 'Failed to pull changes' });
  }
});

// Push changes to server (simplified for AsyncStorage frontend)
router.post('/push', async (req, res) => {
  try {
    const { accounts = [], transactions = [] } = req.body;
    console.log('🔄 Backend received push request:', { 
      accountsCount: accounts.length, 
      transactionsCount: transactions.length,
      accounts: accounts.map((a: any) => ({ localId: a.localId, name: a.name, serverId: a.serverId }))
    });
    
    const results: {
      accounts: Array<{ localId: string; serverId: string; success: boolean }>;
      transactions: Array<{ localId: string; serverId: string; success: boolean }>;
      errors: Array<{ type: string; localId: string; error: string }>;
    } = {
      accounts: [],
      transactions: [],
      errors: []
    };

    // Process accounts
    for (const accountData of accounts) {
      try {
        console.log(`🏷️ Processing account: localId=${accountData.localId}, serverId=${accountData.serverId}, name=${accountData.name}`);
        let savedAccount;
        
        if (accountData.serverId) {
          console.log(`🔄 Updating existing account with serverId: ${accountData.serverId}`);
          // Update existing account
          const existingAccount = await Account.findById(accountData.serverId);
          if (existingAccount) {
            // Check for conflicts using updatedAt timestamp
            const clientUpdated = new Date(accountData.updatedAt);
            const serverUpdated = new Date((existingAccount as any).updatedAt || (existingAccount as any).createdAt);
            
            if (clientUpdated > serverUpdated) {
              // Client is newer, update server
              savedAccount = await Account.findByIdAndUpdate(
                accountData.serverId,
                {
                  name: accountData.name,
                  description: accountData.description,
                  order: accountData.order
                },
                { new: true }
              );
              console.log(`✅ Updated existing account: ${savedAccount?._id}`);
            } else {
              // Server is newer or same, return existing
              savedAccount = existingAccount;
              console.log(`📋 Using existing account (server newer): ${savedAccount._id}`);
            }
          } else {
            console.log(`❌ ServerId ${accountData.serverId} not found, creating new account`);
            // Server record doesn't exist, create new one
            savedAccount = new Account({
              name: accountData.name,
              description: accountData.description,
              order: accountData.order || 0
            });
            await savedAccount.save();
            console.log(`✅ Created new account: ${savedAccount._id}`);
          }
        } else {
          console.log(`➕ Creating new account (no serverId)`);
          // Create new account
          savedAccount = new Account({
            name: accountData.name,
            description: accountData.description,
            order: accountData.order || 0
          });
          await savedAccount.save();
          console.log(`✅ Created new account: ${savedAccount._id}`);
        }
        
        if (savedAccount) {
          const result = {
            localId: accountData.localId,
            serverId: savedAccount._id?.toString() || '',
            success: true
          };
          results.accounts.push(result);
          console.log(`✅ Account result:`, result);
        }
      } catch (error: any) {
        console.error(`❌ Error processing account ${accountData.localId}:`, error.message);
        results.errors.push({
          type: 'account',
          localId: accountData.localId,
          error: error.message
        });
      }
    }

    // Process transactions (similar logic)
    for (const transactionData of transactions) {
      try {
        let savedTransaction;
        
        if (transactionData.serverId) {
          // Update existing transaction
          savedTransaction = await Transaction.findByIdAndUpdate(
            transactionData.serverId,
            {
              fromAccount: transactionData.fromAccount,
              toAccount: transactionData.toAccount,
              category: transactionData.category,
              amount: transactionData.amount,
              transactionDate: new Date(transactionData.transactionDate),
              description: transactionData.description
            },
            { new: true }
          );
        } else {
          // Create new transaction
          savedTransaction = new Transaction({
            fromAccount: transactionData.fromAccount,
            toAccount: transactionData.toAccount,
            category: transactionData.category,
            amount: transactionData.amount,
            transactionDate: new Date(transactionData.transactionDate),
            description: transactionData.description
          });
          await savedTransaction.save();
        }
        
        if (savedTransaction) {
          results.transactions.push({
            localId: transactionData.localId,
            serverId: savedTransaction._id?.toString() || '',
            success: true
          });
        }
      } catch (error: any) {
        results.errors.push({
          type: 'transaction',
          localId: transactionData.localId,
          error: error.message
        });
      }
    }

    console.log('📤 Sending results:', results);
    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Push sync error:', error);
    res.status(500).json({ error: 'Failed to push changes' });
  }
});

export default router; 