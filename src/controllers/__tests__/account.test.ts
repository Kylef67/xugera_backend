import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import accountController from '../account';
import Account from '../../models/account';

jest.mock('../../models/account');

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
    it('should return an account when found', async () => {
      const mockAccount = { _id: '123', name: 'Test Account', description: 'Test Description' };
      req.params = { id: '123' };
      
      (Account.findById as jest.MockedFunction<any>).mockResolvedValue(mockAccount);
      
      await accountController.get(req as Request, res as Response);
      
      expect(Account.findById).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith(mockAccount);
    });

    it('should return 404 when account is not found', async () => {
      req.params = { id: '123' };
      
      (Account.findById as jest.MockedFunction<any>).mockResolvedValue(null);
      
      await accountController.get(req as Request, res as Response);
      
      expect(Account.findById).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
    });

    it('should return 500 when there is a server error', async () => {
      req.params = { id: '123' };
      const errorMessage = 'Server error';
      
      (Account.findById as jest.MockedFunction<any>).mockRejectedValue(new Error(errorMessage));
      
      await accountController.get(req as Request, res as Response);
      
      expect(Account.findById).toHaveBeenCalledWith('123');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });

  describe('all', () => {
    it('should return all accounts', async () => {
      const mockAccounts = [
        { _id: '123', name: 'Account 1', description: 'Description 1' },
        { _id: '456', name: 'Account 2', description: 'Description 2' }
      ];
      
      (Account.find as jest.MockedFunction<any>).mockResolvedValue(mockAccounts);
      
      await accountController.all(req as Request, res as Response);
      
      expect(Account.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockAccounts);
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
      expect(res.json).toHaveBeenCalledWith({ message: 'Account deleted' });
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
}); 