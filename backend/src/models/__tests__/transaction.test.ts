import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Transaction from '../transaction';

// Define the document interface for type safety
interface ITransactionDocument extends mongoose.Document {
  transactionDate: Date;
  fromAccount: mongoose.Types.ObjectId;
  toAccount: mongoose.Types.ObjectId;
  amount: number;
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
    // Create mock account IDs
    const fromAccountId = new mongoose.Types.ObjectId();
    const toAccountId = new mongoose.Types.ObjectId();
    
    // Setup test data
    const transactionData = {
      transactionDate: new Date(),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 100.50
    };
    
    // Create a new transaction instance
    const transaction = new Transaction(transactionData);

    // Save to the DB and get the saved document
    const savedTransaction = await transaction.save();
    
    // Assertions to verify the save worked correctly
    expect(savedTransaction._id).toBeDefined();
    expect(savedTransaction.transactionDate).toEqual(transactionData.transactionDate);
    expect(savedTransaction.fromAccount.toString()).toBe(fromAccountId.toString());
    expect(savedTransaction.toAccount.toString()).toBe(toAccountId.toString());
    expect(savedTransaction.amount).toBe(100.50);
  });

  it('should fail to save a transaction without required fields', async () => {
    // Create a transaction missing required fields
    const transaction = new Transaction({
      transactionDate: new Date()
      // Missing fromAccount, toAccount, and amount fields which are required
    });

    // Attempt to save and catch the validation error
    let error: any;
    try {
      await transaction.save();
    } catch (err) {
      error = err;
    }

    // Verify we got a validation error for the missing fields
    expect(error).toBeDefined();
    expect(error.errors.fromAccount).toBeDefined();
    expect(error.errors.amount).toBeDefined();
  });

  it('should fail to save a transaction with invalid amount', async () => {
    // Create mock account IDs
    const fromAccountId = new mongoose.Types.ObjectId();
    const toAccountId = new mongoose.Types.ObjectId();
    
    // Setup test data with invalid amount (non-numeric)
    const transaction = new Transaction({
      transactionDate: new Date(),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 'not-a-number' // This should trigger a validation error
    });

    // Attempt to save and catch the validation error
    let error: any;
    try {
      await transaction.save();
    } catch (err) {
      error = err;
    }

    // Verify we got a validation error for the amount field
    expect(error).toBeDefined();
    expect(error.errors.amount).toBeDefined();
  });

  it('should find transactions by fromAccount ID', async () => {
    // Create mock account IDs
    const fromAccountId = new mongoose.Types.ObjectId();
    const toAccountId = new mongoose.Types.ObjectId();
    
    // Create multiple transactions for the same fromAccount
    const transaction1 = new Transaction({
      transactionDate: new Date('2023-01-01'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 200
    });
    
    const transaction2 = new Transaction({
      transactionDate: new Date('2023-01-02'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 300
    });
    
    // Save the transactions to the DB
    await transaction1.save();
    await transaction2.save();
    
    // Create a transaction for a different fromAccount to ensure filtering works
    const otherFromAccountId = new mongoose.Types.ObjectId();
    const transaction3 = new Transaction({
      transactionDate: new Date('2023-01-03'),
      fromAccount: otherFromAccountId,
      toAccount: toAccountId,
      amount: 150
    });
    await transaction3.save();
    
    // Find transactions by fromAccount
    const foundTransactions = await Transaction.find({ fromAccount: fromAccountId });
    
    // Verify we got the right number of transactions and they have the correct fromAccount
    expect(foundTransactions.length).toBe(2);
    expect(foundTransactions[0].fromAccount.toString()).toBe(fromAccountId.toString());
    expect(foundTransactions[1].fromAccount.toString()).toBe(fromAccountId.toString());
    
    // Verify the amounts are correct
    expect(foundTransactions.some(t => t.amount === 200)).toBe(true);
    expect(foundTransactions.some(t => t.amount === 300)).toBe(true);
  });

  it('should find transactions by toAccount ID', async () => {
    // Create mock account IDs
    const fromAccountId = new mongoose.Types.ObjectId();
    const toAccountId = new mongoose.Types.ObjectId();
    
    // Create multiple transactions for the same toAccount
    const transaction1 = new Transaction({
      transactionDate: new Date('2023-01-01'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 250
    });
    
    const transaction2 = new Transaction({
      transactionDate: new Date('2023-01-02'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 350
    });
    
    // Save the transactions to the DB
    await transaction1.save();
    await transaction2.save();
    
    // Create a transaction for a different toAccount to ensure filtering works
    const otherToAccountId = new mongoose.Types.ObjectId();
    const transaction3 = new Transaction({
      transactionDate: new Date('2023-01-03'),
      fromAccount: fromAccountId,
      toAccount: otherToAccountId,
      amount: 175
    });
    await transaction3.save();
    
    // Find transactions by toAccount
    const foundTransactions = await Transaction.find({ toAccount: toAccountId });
    
    // Verify we got the right number of transactions and they have the correct toAccount
    expect(foundTransactions.length).toBe(2);
    expect(foundTransactions[0].toAccount.toString()).toBe(toAccountId.toString());
    expect(foundTransactions[1].toAccount.toString()).toBe(toAccountId.toString());
    
    // Verify the amounts are correct
    expect(foundTransactions.some(t => t.amount === 250)).toBe(true);
    expect(foundTransactions.some(t => t.amount === 350)).toBe(true);
  });

  it('should find transactions by date range', async () => {
    // Create mock account IDs
    const fromAccountId = new mongoose.Types.ObjectId();
    const toAccountId = new mongoose.Types.ObjectId();
    
    // Create transactions with different dates
    await new Transaction({
      transactionDate: new Date('2023-01-01T10:00:00Z'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 100
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-15T14:30:00Z'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 200
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-31T23:00:00Z'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 300
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-02-15T12:00:00Z'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 400
    }).save();
    
    // Test query for January 2023
    const januaryTransactions = await Transaction.find({
      transactionDate: {
        $gte: new Date('2023-01-01T00:00:00Z'),
        $lte: new Date('2023-01-31T23:59:59.999Z')
      }
    });
    
    expect(januaryTransactions.length).toBe(3);
    expect(januaryTransactions.reduce((sum, t) => sum + t.amount, 0)).toBe(600); // 100 + 200 + 300
    
    // Test query for mid-January to mid-February
    const midMonthTransactions = await Transaction.find({
      transactionDate: {
        $gte: new Date('2023-01-10T00:00:00Z'),
        $lte: new Date('2023-02-10T23:59:59.999Z')
      }
    });
    
    expect(midMonthTransactions.length).toBe(2);
    expect(midMonthTransactions.reduce((sum, t) => sum + t.amount, 0)).toBe(500); // 200 + 300
  });
  
  it('should find transactions by specific date with time', async () => {
    // Create mock account IDs
    const fromAccountId = new mongoose.Types.ObjectId();
    const toAccountId = new mongoose.Types.ObjectId();
    
    // Create transactions at different times on the same day
    await new Transaction({
      transactionDate: new Date('2023-01-15T08:00:00Z'), // 8 AM
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 125
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-15T12:30:00Z'), // 12:30 PM
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 225
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-15T17:45:00Z'), // 5:45 PM
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 325
    }).save();
    
    // Test morning transactions (before noon)
    const morningTransactions = await Transaction.find({
      transactionDate: {
        $gte: new Date('2023-01-15T08:00:00Z'),
        $lte: new Date('2023-01-15T11:59:59.999Z')
      }
    });
    
    expect(morningTransactions.length).toBe(1);
    expect(morningTransactions[0].amount).toBe(125);
    
    // Test afternoon transactions (noon to 6 PM)
    const afternoonTransactions = await Transaction.find({
      transactionDate: {
        $gte: new Date('2023-01-15T12:00:00Z'),
        $lte: new Date('2023-01-15T17:59:59.999Z')
      }
    });
    
    expect(afternoonTransactions.length).toBe(2);
    expect(afternoonTransactions.reduce((sum, t) => sum + t.amount, 0)).toBe(550); // 225 + 325
  });
  
  it('should find transactions by fromAccount and date range together', async () => {
    // Create two different account IDs
    const fromAccount1 = new mongoose.Types.ObjectId();
    const fromAccount2 = new mongoose.Types.ObjectId();
    const toAccountId = new mongoose.Types.ObjectId();
    
    // Add transactions for fromAccount1
    await new Transaction({
      transactionDate: new Date('2023-01-05T10:00:00Z'),
      fromAccount: fromAccount1,
      toAccount: toAccountId,
      amount: 150
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-20T14:00:00Z'),
      fromAccount: fromAccount1,
      toAccount: toAccountId,
      amount: 250
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-02-05T09:00:00Z'),
      fromAccount: fromAccount1,
      toAccount: toAccountId,
      amount: 350
    }).save();
    
    // Add transactions for fromAccount2
    await new Transaction({
      transactionDate: new Date('2023-01-10T11:00:00Z'),
      fromAccount: fromAccount2,
      toAccount: toAccountId,
      amount: 175
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-25T16:00:00Z'),
      fromAccount: fromAccount2,
      toAccount: toAccountId,
      amount: 275
    }).save();
    
    // Query transactions for fromAccount1 in January
    const account1JanuaryTransactions = await Transaction.find({
      fromAccount: fromAccount1,
      transactionDate: {
        $gte: new Date('2023-01-01T00:00:00Z'),
        $lte: new Date('2023-01-31T23:59:59.999Z')
      }
    });
    
    expect(account1JanuaryTransactions.length).toBe(2);
    expect(account1JanuaryTransactions.reduce((sum, t) => sum + t.amount, 0)).toBe(400); // 150 + 250
    
    account1JanuaryTransactions.forEach(t => {
      expect(t.fromAccount.toString()).toBe(fromAccount1.toString());
      const transactionDate = new Date(t.transactionDate);
      expect(transactionDate.getMonth()).toBe(0); // January is month 0
      expect(transactionDate.getFullYear()).toBe(2023);
    });
    
    // Query transactions for fromAccount2 in January
    const account2JanuaryTransactions = await Transaction.find({
      fromAccount: fromAccount2,
      transactionDate: {
        $gte: new Date('2023-01-01T00:00:00Z'),
        $lte: new Date('2023-01-31T23:59:59.999Z')
      }
    });
    
    expect(account2JanuaryTransactions.length).toBe(2);
    expect(account2JanuaryTransactions.reduce((sum, t) => sum + t.amount, 0)).toBe(450); // 175 + 275
  });

  it('should find transactions by toAccount and date range together', async () => {
    // Create two different account IDs
    const fromAccountId = new mongoose.Types.ObjectId();
    const toAccount1 = new mongoose.Types.ObjectId();
    const toAccount2 = new mongoose.Types.ObjectId();
    
    // Add transactions for toAccount1
    await new Transaction({
      transactionDate: new Date('2023-01-05T10:00:00Z'),
      fromAccount: fromAccountId,
      toAccount: toAccount1,
      amount: 180
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-20T14:00:00Z'),
      fromAccount: fromAccountId,
      toAccount: toAccount1,
      amount: 280
    }).save();
    
    // Add transactions for toAccount2
    await new Transaction({
      transactionDate: new Date('2023-01-10T11:00:00Z'),
      fromAccount: fromAccountId,
      toAccount: toAccount2,
      amount: 190
    }).save();
    
    // Query transactions for toAccount1 in January
    const toAccount1Transactions = await Transaction.find({
      toAccount: toAccount1,
      transactionDate: {
        $gte: new Date('2023-01-01T00:00:00Z'),
        $lte: new Date('2023-01-31T23:59:59.999Z')
      }
    });
    
    expect(toAccount1Transactions.length).toBe(2);
    expect(toAccount1Transactions.reduce((sum, t) => sum + t.amount, 0)).toBe(460); // 180 + 280
    
    toAccount1Transactions.forEach(t => {
      expect(t.toAccount.toString()).toBe(toAccount1.toString());
    });
  });

  it('should calculate total amount for transactions', async () => {
    // Create mock account IDs
    const fromAccountId = new mongoose.Types.ObjectId();
    const toAccountId = new mongoose.Types.ObjectId();
    
    // Add several transactions with different amounts
    await new Transaction({
      transactionDate: new Date('2023-01-05'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 100
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-10'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 200
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-15'),
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      amount: 300
    }).save();
    
    // Use MongoDB's aggregation to sum the amounts
    const result = await Transaction.aggregate([
      { $match: { fromAccount: fromAccountId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    expect(result.length).toBe(1);
    expect(result[0].total).toBe(600); // 100 + 200 + 300
  });

  it('should calculate totals by account', async () => {
    // Create different account IDs
    const fromAccount1 = new mongoose.Types.ObjectId();
    const fromAccount2 = new mongoose.Types.ObjectId();
    const toAccount1 = new mongoose.Types.ObjectId();
    const toAccount2 = new mongoose.Types.ObjectId();
    
    // Add transactions for different accounts
    await new Transaction({
      transactionDate: new Date('2023-01-05'),
      fromAccount: fromAccount1,
      toAccount: toAccount1,
      amount: 100
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-10'),
      fromAccount: fromAccount1,
      toAccount: toAccount2,
      amount: 200
    }).save();
    
    await new Transaction({
      transactionDate: new Date('2023-01-15'),
      fromAccount: fromAccount2,
      toAccount: toAccount1,
      amount: 300
    }).save();
    
    // Calculate total outgoing for fromAccount1
    const outgoingResult = await Transaction.aggregate([
      { $match: { fromAccount: fromAccount1 } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    expect(outgoingResult[0].total).toBe(300); // 100 + 200
    
    // Calculate total incoming for toAccount1
    const incomingResult = await Transaction.aggregate([
      { $match: { toAccount: toAccount1 } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    
    expect(incomingResult[0].total).toBe(400); // 100 + 300
    
    // Calculate balance for account1 (incoming - outgoing)
    const [incoming, outgoing] = await Promise.all([
      Transaction.aggregate([
        { $match: { toAccount: toAccount1 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { fromAccount: toAccount1 } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);
    
    const incomingTotal = incoming.length > 0 ? incoming[0].total : 0;
    const outgoingTotal = outgoing.length > 0 ? outgoing[0].total : 0;
    const balance = incomingTotal - outgoingTotal;
    
    expect(balance).toBe(400); // 400 - 0
  });
}); 