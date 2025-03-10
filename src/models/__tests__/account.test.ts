
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Account from '../account';

interface IAccountDocument extends mongoose.Document {
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

describe('Account Model', () => {
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

  afterEach(async () => {
    await Account.deleteMany({});
  });

  it('should create and save an account successfully', async () => {
    const accountData = {
      name: 'Test Account',
      description: 'Test Description'
    };
    const account = new Account(accountData);

    const savedAccount = await account.save() as IAccountDocument;

    expect(savedAccount._id).toBeDefined();
    expect(savedAccount.name).toBe(accountData.name);
    expect(savedAccount.description).toBe(accountData.description);
    expect(savedAccount.createdAt).toBeDefined();
    expect(savedAccount.updatedAt).toBeDefined();
  });

  it('should fail to save an account without required fields', async () => {
    const accountWithoutName = new Account({ description: 'Test Description' });
    const accountWithoutDescription = new Account({ name: 'Test Account' });
    
    await expect(accountWithoutName.save()).rejects.toThrow();
    await expect(accountWithoutDescription.save()).rejects.toThrow();
  });

  it('should find an account by id', async () => {
    const account = new Account({
      name: 'Test Account',
      description: 'Test Description'
    });
    const savedAccount = await account.save();

    const foundAccount = await Account.findById(savedAccount._id);

    expect(foundAccount).toBeDefined();
    expect(foundAccount?.name).toBe(savedAccount.name);
    expect(foundAccount?.description).toBe(savedAccount.description);
  });

  it('should update an account', async () => {
    const account = new Account({
      name: 'Test Account',
      description: 'Test Description'
    });
    const savedAccount = await account.save();
    
    const updatedAccount = await Account.findByIdAndUpdate(
      savedAccount._id,
      { name: 'Updated Account', description: 'Updated Description' },
      { new: true }
    );

    expect(updatedAccount).toBeDefined();
    expect(updatedAccount?.name).toBe('Updated Account');
    expect(updatedAccount?.description).toBe('Updated Description');
  });

  it('should delete an account', async () => {
    const account = new Account({
      name: 'Test Account',
      description: 'Test Description'
    });
    const savedAccount = await account.save();
    
    await Account.findByIdAndDelete(savedAccount._id);
    const deletedAccount = await Account.findById(savedAccount._id);

    expect(deletedAccount).toBeNull();
  });
}); 