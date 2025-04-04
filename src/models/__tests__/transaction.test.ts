import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Transaction from '../transaction';

// Define the document interface for type safety
interface ITransactionDocument extends mongoose.Document {
  transactionDate: Date;
  account: mongoose.Types.ObjectId;
}

describe('Transaction Model', () => {
  let mongoServer: MongoMemoryServer;

  // Setup in-memory MongoDB server before tests
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  // Cleanup after all tests
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Clean the DB between tests to avoid test interference
  afterEach(async () => {
    await Transaction.deleteMany({});
  });

  it('should create and save a transaction successfully', async () => {
    // Create a mock account ID
    const accountId = new mongoose.Types.ObjectId();
    
    // Setup test data
    const transactionData = {
      transactionDate: new Date(),
      account: accountId
    };
    
    // Create a new transaction instance
    const transaction = new Transaction(transactionData);

    // Save to the DB and get the saved document
    const savedTransaction = await transaction.save();
    
    // Assertions to verify the save worked correctly
    expect(savedTransaction._id).toBeDefined();
    expect(savedTransaction.transactionDate).toEqual(transactionData.transactionDate);
    expect(savedTransaction.account.toString()).toBe(accountId.toString());
  });

  it('should fail to save a transaction without required fields', async () => {
    // Create a transaction missing the required account field
    const transaction = new Transaction({
      transactionDate: new Date()
      // Missing account field which is required
    });

    // Attempt to save and catch the validation error
    let error: any;
    try {
      await transaction.save();
    } catch (err) {
      error = err;
    }

    // Verify we got a validation error for the missing field
    expect(error).toBeDefined();
    expect(error.errors.account).toBeDefined(); // should have an error for the account field
  });

  it('should find transactions by account ID', async () => {
    // Create a mock account ID to associate multiple transactions with
    const accountId = new mongoose.Types.ObjectId();
    
    // Create multiple transactions for the same account
    const transaction1 = new Transaction({
      transactionDate: new Date('2023-01-01'),
      account: accountId
    });
    
    const transaction2 = new Transaction({
      transactionDate: new Date('2023-01-02'),
      account: accountId
    });
    
    // Save the transactions to the DB
    await transaction1.save();
    await transaction2.save();
    
    // Create a transaction for a diffrent account to ensure filtering works
    const otherAccountId = new mongoose.Types.ObjectId();
    const transaction3 = new Transaction({
      transactionDate: new Date('2023-01-03'),
      account: otherAccountId
    });
    await transaction3.save();
    
    // Find transactions by account
    const foundTransactions = await Transaction.find({ account: accountId });
    
    // Verify we got the right number of transactions and they have the correct account
    expect(foundTransactions.length).toBe(2);
    expect(foundTransactions[0].account.toString()).toBe(accountId.toString());
    expect(foundTransactions[1].account.toString()).toBe(accountId.toString());
  });

  it('should find transactions by date range', async () => {
    // Create a mock account ID
    const accountId = new mongoose.Types.ObjectId();
    
    // Create transactions with different dates
    await new Transaction({
      transactionDate: new Date('2023-01-01T10:00:00Z'),
      account: accountId
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-15T14:30:00Z'),
      account: accountId
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-31T23:00:00Z'),
      account: accountId
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-02-15T12:00:00Z'),
      account: accountId
    }).save();
    
    // Test query for January 2023
    const januaryTransactions = await Transaction.find({
      transactionDate: {
        $gte: new Date('2023-01-01T00:00:00Z'),
        $lte: new Date('2023-01-31T23:59:59.999Z')
      }
    });
    
    expect(januaryTransactions.length).toBe(3);
    
    // Test query for mid-January to mid-February
    const midMonthTransactions = await Transaction.find({
      transactionDate: {
        $gte: new Date('2023-01-10T00:00:00Z'),
        $lte: new Date('2023-02-10T23:59:59.999Z')
      }
    });
    
    expect(midMonthTransactions.length).toBe(2);
  });
  
  it('should find transactions by specific date with time', async () => {
    // Create a mock account ID
    const accountId = new mongoose.Types.ObjectId();
    
    // Create transactions at different times on the same day
    await new Transaction({
      transactionDate: new Date('2023-01-15T08:00:00Z'), // 8 AM
      account: accountId
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-15T12:30:00Z'), // 12:30 PM
      account: accountId
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-15T17:45:00Z'), // 5:45 PM
      account: accountId
    }).save();
    
    // Test morning transactions (before noon)
    const morningTransactions = await Transaction.find({
      transactionDate: {
        $gte: new Date('2023-01-15T08:00:00Z'),
        $lte: new Date('2023-01-15T11:59:59.999Z')
      }
    });
    
    expect(morningTransactions.length).toBe(1);
    
    // Test afternoon transactions (noon to 6 PM)
    const afternoonTransactions = await Transaction.find({
      transactionDate: {
        $gte: new Date('2023-01-15T12:00:00Z'),
        $lte: new Date('2023-01-15T17:59:59.999Z')
      }
    });
    
    expect(afternoonTransactions.length).toBe(2);
  });
  
  it('should find transactions by account and date range together', async () => {
    // Create two different account IDs
    const account1 = new mongoose.Types.ObjectId();
    const account2 = new mongoose.Types.ObjectId();
    
    // Add transactions for account1
    await new Transaction({
      transactionDate: new Date('2023-01-05T10:00:00Z'),
      account: account1
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-20T14:00:00Z'),
      account: account1
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-02-05T09:00:00Z'),
      account: account1
    }).save();
    
    // Add transactions for account2
    await new Transaction({
      transactionDate: new Date('2023-01-10T11:00:00Z'),
      account: account2
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-25T16:00:00Z'),
      account: account2
    }).save();
    
    // Query transactions for account1 in January
    const account1JanuaryTransactions = await Transaction.find({
      account: account1,
      transactionDate: {
        $gte: new Date('2023-01-01T00:00:00Z'),
        $lte: new Date('2023-01-31T23:59:59.999Z')
      }
    });
    
    expect(account1JanuaryTransactions.length).toBe(2);
    account1JanuaryTransactions.forEach(t => {
      expect(t.account.toString()).toBe(account1.toString());
      const transactionDate = new Date(t.transactionDate);
      expect(transactionDate.getMonth()).toBe(0); // January is month 0
      expect(transactionDate.getFullYear()).toBe(2023);
    });
    
    // Query transactions for account2 in January
    const account2JanuaryTransactions = await Transaction.find({
      account: account2,
      transactionDate: {
        $gte: new Date('2023-01-01T00:00:00Z'),
        $lte: new Date('2023-01-31T23:59:59.999Z')
      }
    });
    
    expect(account2JanuaryTransactions.length).toBe(2);
  });
}); 