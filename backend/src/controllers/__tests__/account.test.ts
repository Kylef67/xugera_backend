import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import accountController from '../account';
import Account from '../../models/account';
import Transaction from '../../models/transaction';

jest.mock('../../models/account');
jest.mock('../../models/transaction');

describe('Account Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('post', () => {
    it('should create a new account and return 201 status', async () => {
      req.body = { name: 'Test Account', description: 'Test Description' };
      
      const mockSave = jest.fn().mockResolvedValue(req.body);
      (Account as jest.MockedFunction<any>).mockImplementation(() => {
        return {
          save: mockSave
        };
      });
      
      await accountController.post(req as Request, res as Response);
      
      expect(Account).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 status when there is an error', async () => {
      req.body = { name: 'Test Account', description: 'Test Description' };
      const errorMessage = 'Validation error';
      
      const mockSave = jest.fn().mockRejectedValue(new Error(errorMessage));
      (Account as jest.MockedFunction<any>).mockImplementation(() => {
        return {
          save: mockSave
        };
      });
      
      await accountController.post(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('get', () => {
    let validObjectId: string;

    beforeEach(() => {
      validObjectId = new mongoose.Types.ObjectId().toString();
      req = {
        params: { id: validObjectId },
        query: {},
        lang: 'en'
      };
      
      // Reset Transaction.aggregate mock for each test
      jest.clearAllMocks();
      (Transaction.aggregate as jest.MockedFunction<any>).mockResolvedValue([]);
    });

    it('should return an account with transaction data when found', async () => {
      const mockAccount = { _id: validObjectId, name: 'Test Account', description: 'Test Description' };
      
      (Account.findById as jest.MockedFunction<any>).mockResolvedValue(mockAccount);
      
      await accountController.get(req as Request, res as Response);
      
      expect(Account.findById).toHaveBeenCalledWith(validObjectId);
      expect(res.json).toHaveBeenCalledWith({
        account: mockAccount,
        transactions: {
          balance: 0,
          totalIncoming: 0,
          totalOutgoing: 0
        }
      });
    });

    it('should return 404 when account is not found', async () => {
      (Account.findById as jest.MockedFunction<any>).mockResolvedValue(null);
      
      await accountController.get(req as Request, res as Response);
      
      expect(Account.findById).toHaveBeenCalledWith(validObjectId);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
      // Transaction.aggregate should not be called when account is not found
      expect(Transaction.aggregate).not.toHaveBeenCalled();
    });

    it('should return 500 when there is a server error', async () => {
      const errorMessage = 'Server error';
      
      (Account.findById as jest.MockedFunction<any>).mockRejectedValue(new Error(errorMessage));
      
      await accountController.get(req as Request, res as Response);
      
      expect(Account.findById).toHaveBeenCalledWith(validObjectId);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('all', () => {
    beforeEach(() => {
      req = {
        query: {},
        lang: 'en'
      };
      jest.clearAllMocks();
      
      // Reset Transaction.aggregate mock for each test
      (Transaction.aggregate as jest.MockedFunction<any>).mockReset();
    });

    it('should return all accounts with transaction balances', async () => {
      const mockAccounts = [
        { 
          _id: new mongoose.Types.ObjectId('123456789012345678901234'),
          name: 'Account 1', 
          description: 'Description 1',
          toObject: jest.fn().mockReturnValue({ 
            _id: '123456789012345678901234', 
            name: 'Account 1', 
            description: 'Description 1' 
          })
        },
        { 
          _id: new mongoose.Types.ObjectId('123456789012345678901235'),
          name: 'Account 2', 
          description: 'Description 2',
          toObject: jest.fn().mockReturnValue({ 
            _id: '123456789012345678901235', 
            name: 'Account 2', 
            description: 'Description 2' 
          })
        }
      ];
      
      (Account.find as jest.MockedFunction<any>).mockResolvedValue(mockAccounts);
      
      // Setup Transaction.aggregate mock
      (Transaction.aggregate as jest.MockedFunction<any>)
        .mockResolvedValueOnce([{ _id: null, total: 500 }]) // First call: incoming for account 1
        .mockResolvedValueOnce([{ _id: null, total: 300 }]) // Second call: outgoing for account 1
        .mockResolvedValueOnce([{ _id: null, total: 800 }]) // Third call: incoming for account 2
        .mockResolvedValueOnce([{ _id: null, total: 400 }]); // Fourth call: outgoing for account 2
      
      await accountController.all(req as Request, res as Response);
      
      expect(Account.find).toHaveBeenCalled();
      expect(Transaction.aggregate).toHaveBeenCalledTimes(4); // 2 calls per account
      
      const expectedResponse = [
        {
          _id: '123456789012345678901234',
          name: 'Account 1',
          description: 'Description 1',
          transactions: {
            balance: 200,
            totalIncoming: 500,
            totalOutgoing: 300
          }
        },
        {
          _id: '123456789012345678901235',
          name: 'Account 2',
          description: 'Description 2',
          transactions: {
            balance: 400,
            totalIncoming: 800,
            totalOutgoing: 400
          }
        }
      ];
      
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should handle date filtering for all accounts', async () => {
      // Setup request with date filters
      req.query = {
        fromDate: '2023-01-01',
        toDate: '2023-01-31'
      };
      
      const mockAccount = { 
        _id: new mongoose.Types.ObjectId('123456789012345678901234'),
        name: 'Account 1', 
        description: 'Description 1',
        toObject: jest.fn().mockReturnValue({ 
          _id: '123456789012345678901234', 
          name: 'Account 1', 
          description: 'Description 1' 
        })
      };
      
      (Account.find as jest.MockedFunction<any>).mockResolvedValue([mockAccount]);
      
      // Setup Transaction.aggregate mock
      (Transaction.aggregate as jest.MockedFunction<any>)
        .mockResolvedValueOnce([{ _id: null, total: 200 }]) // Incoming transactions
        .mockResolvedValueOnce([{ _id: null, total: 100 }]); // Outgoing transactions
      
      await accountController.all(req as Request, res as Response);
      
      expect(Account.find).toHaveBeenCalled();
      expect(Transaction.aggregate).toHaveBeenCalledTimes(2);
      
      // Verify the aggregate calls used proper date filtering
      const calls = (Transaction.aggregate as jest.MockedFunction<any>).mock.calls;
      expect(calls.length).toBe(2);
      
      // Check date filters are present
      calls.forEach((call: any[]) => {
        const matchStage = call[0][0].$match;
        if (matchStage.transactionDate) {
          expect(matchStage.transactionDate.$gte instanceof Date).toBe(true);
          expect(matchStage.transactionDate.$lte instanceof Date).toBe(true);
          
          const fromDate = matchStage.transactionDate.$gte;
          const toDate = matchStage.transactionDate.$lte;
          
          expect(fromDate.toISOString().substring(0, 10)).toBe('2023-01-01');
          expect(toDate.getHours()).toBe(23);
          expect(toDate.getMinutes()).toBe(59);
          expect(toDate.getSeconds()).toBe(59);
        }
      });
      
      const expectedResponse = [
        {
          _id: '123456789012345678901234',
          name: 'Account 1',
          description: 'Description 1',
          transactions: {
            balance: 100,
            totalIncoming: 200,
            totalOutgoing: 100
          }
        }
      ];
      
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });

    it('should return 500 when there is a server error', async () => {
      const errorMessage = 'Server error';
      
      (Account.find as jest.MockedFunction<any>).mockRejectedValue(new Error(errorMessage));
      
      await accountController.all(req as Request, res as Response);
      
      expect(Account.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('update', () => {
    it('should update an account and return it', async () => {
      const mockAccount = { _id: '123', name: 'Updated Account', description: 'Updated Description' };
      req.params = { id: '123' };
      req.body = { name: 'Updated Account', description: 'Updated Description' };
      
      (Account.findByIdAndUpdate as jest.MockedFunction<any>).mockResolvedValue(mockAccount);
      
      await accountController.update(req as Request, res as Response);
      
      expect(Account.findByIdAndUpdate).toHaveBeenCalledWith('123', req.body, { new: true });
      expect(res.json).toHaveBeenCalledWith(mockAccount);
    });

    it('should return 404 when account is not found', async () => {
      req.params = { id: '123' };
      req.body = { name: 'Updated Account', description: 'Updated Description' };
      
      (Account.findByIdAndUpdate as jest.MockedFunction<any>).mockResolvedValue(null);
      
      await accountController.update(req as Request, res as Response);
      
      expect(Account.findByIdAndUpdate).toHaveBeenCalledWith('123', req.body, { new: true });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
    });

    it('should return 400 when there is an error', async () => {
      req.params = { id: '123' };
      req.body = { name: 'Updated Account', description: 'Updated Description' };
      const errorMessage = 'Validation error';
      
      (Account.findByIdAndUpdate as jest.MockedFunction<any>).mockRejectedValue(new Error(errorMessage));
      
      await accountController.update(req as Request, res as Response);
      
      expect(Account.findByIdAndUpdate).toHaveBeenCalledWith('123', req.body, { new: true });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('delete', () => {
    it('should delete an account and return success message', async () => {
      const mockAccount = { _id: '123', name: 'Test Account', description: 'Test Description' };
      req.params = { id: '123' };
      
      (Account.findByIdAndDelete as jest.MockedFunction<any>).mockResolvedValue(mockAccount);
      
      await accountController.delete(req as Request, res as Response);
      
      expect(Account.findByIdAndDelete).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith({ message: 'Account deleted successfully' });
    });

    it('should return 404 when account is not found', async () => {
      req.params = { id: '123' };
      
      (Account.findByIdAndDelete as jest.MockedFunction<any>).mockResolvedValue(null);
      
      await accountController.delete(req as Request, res as Response);
      
      expect(Account.findByIdAndDelete).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
    });

    it('should return 500 when there is a server error', async () => {
      req.params = { id: '123' };
      const errorMessage = 'Server error';
      
      (Account.findByIdAndDelete as jest.MockedFunction<any>).mockRejectedValue(new Error(errorMessage));
      
      await accountController.delete(req as Request, res as Response);
      
      expect(Account.findByIdAndDelete).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('get with transaction sum', () => {
    let mockAccountId: string;

    beforeEach(() => {
      mockAccountId = new mongoose.Types.ObjectId().toString();
      req = {
        params: { id: mockAccountId },
        query: {},
        lang: 'en'
      };
      
      // Reset mocks for each test
      jest.clearAllMocks();
    });

    it('should return account with transaction sum', async () => {
      // Mock the account
      const mockAccount = { 
        _id: mockAccountId, 
        name: 'Test Account', 
        description: 'Test Description' 
      };
      (Account.findById as jest.MockedFunction<any>).mockResolvedValue(mockAccount);
      
      // Mock the transaction aggregation results
      const mockIncomingSum = [{ _id: null, total: 500 }];
      const mockOutgoingSum = [{ _id: null, total: 300 }];
      
      // Setup Transaction.aggregate to return different values based on the match condition
      (Transaction.aggregate as jest.MockedFunction<any>).mockImplementation((pipeline: any[]) => {
        const matchStage = pipeline[0].$match;
        
        if (matchStage.toAccount) {
          return Promise.resolve(mockIncomingSum);
        } else if (matchStage.fromAccount) {
          return Promise.resolve(mockOutgoingSum);
        }
        return Promise.resolve([]);
      });
      
      await accountController.get(req as Request, res as Response);
      
      expect(Account.findById).toHaveBeenCalledWith(mockAccountId);
      expect(Transaction.aggregate).toHaveBeenCalledTimes(2);
      
      expect(res.json).toHaveBeenCalledWith({
        account: mockAccount,
        transactions: {
          balance: 200,  // 500 - 300
          totalIncoming: 500,
          totalOutgoing: 300
        }
      });
    });

    it('should handle date filtering correctly', async () => {
      // Setup request with date filters
      req.query = {
        fromDate: '2023-01-01',
        toDate: '2023-01-31'
      };
      
      // Mock the account
      const mockAccount = { 
        _id: mockAccountId, 
        name: 'Test Account', 
        description: 'Test Description' 
      };
      (Account.findById as jest.MockedFunction<any>).mockResolvedValue(mockAccount);
      
      // Mock the transaction aggregation
      const mockIncomingSum = [{ _id: null, total: 200 }];
      const mockOutgoingSum = [{ _id: null, total: 100 }];
      
      // Setup Transaction.aggregate to return different values and verify date filters
      (Transaction.aggregate as jest.MockedFunction<any>).mockImplementation((pipeline: any[]) => {
        const matchStage = pipeline[0].$match;
        
        // Verify date range is applied correctly
        if (matchStage.transactionDate) {
          expect(matchStage.transactionDate.$gte instanceof Date).toBe(true);
          expect(matchStage.transactionDate.$lte instanceof Date).toBe(true);
          
          const fromDate = matchStage.transactionDate.$gte;
          const toDate = matchStage.transactionDate.$lte;
          
          expect(fromDate.toISOString().startsWith('2023-01-01')).toBe(true);
          expect(toDate.getHours()).toBe(23);
          expect(toDate.getMinutes()).toBe(59);
          expect(toDate.getSeconds()).toBe(59);
        }
        
        if (matchStage.toAccount) {
          return Promise.resolve(mockIncomingSum);
        } else if (matchStage.fromAccount) {
          return Promise.resolve(mockOutgoingSum);
        }
        return Promise.resolve([]);
      });
      
      await accountController.get(req as Request, res as Response);
      
      expect(res.json).toHaveBeenCalledWith({
        account: mockAccount,
        transactions: {
          balance: 100,  // 200 - 100
          totalIncoming: 200,
          totalOutgoing: 100
        }
      });
    });

    it('should handle empty transaction results', async () => {
      // Mock the account
      const mockAccount = { 
        _id: mockAccountId, 
        name: 'Test Account', 
        description: 'Test Description' 
      };
      (Account.findById as jest.MockedFunction<any>).mockResolvedValue(mockAccount);
      
      // Mock empty transaction results
      (Transaction.aggregate as jest.MockedFunction<any>).mockResolvedValue([]);
      
      await accountController.get(req as Request, res as Response);
      
      expect(res.json).toHaveBeenCalledWith({
        account: mockAccount,
        transactions: {
          balance: 0,
          totalIncoming: 0,
          totalOutgoing: 0
        }
      });
    });
  });
}); 