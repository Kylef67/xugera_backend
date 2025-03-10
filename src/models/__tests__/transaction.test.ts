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
}); 