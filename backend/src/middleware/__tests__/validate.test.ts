import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../validate';
import { getTranslations } from '../../localization';

// Mock the localization module
jest.mock('../../localization', () => ({
  getTranslations: jest.fn().mockReturnValue({
    errors: {
      'Required': 'Translated Required',
      'Expected string, received number': 'Translated Type Error'
    }
  }),
  translate: jest.fn().mockImplementation((key) => key)
}));

describe('Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<NextFunction>;
  
  beforeEach(() => {
    req = {
      body: {},
      headers: { 'accept-language': 'en' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });
  
  it('should pass validation for valid data', () => {
    // Define a test schema
    const schema = z.object({
      name: z.string(),
      age: z.number()
    });
    
    // Valid data
    req.body = { name: 'Test User', age: 25 };
    
    // Call middleware
    const middleware = validate(schema, 'body');
    middleware(req as Request, res as Response, next);
    
    // Expect next to be called
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
  
  it('should return validation errors for invalid data', () => {
    // Define a test schema
    const schema = z.object({
      name: z.string(),
      age: z.number()
    });
    
    // Invalid data
    req.body = { name: 'Test User', age: 'twenty five' };
    
    // Call middleware
    const middleware = validate(schema, 'body');
    middleware(req as Request, res as Response, next);
    
    // Expect error response
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: expect.any(String),
          message: expect.any(String)
        })
      ])
    });
  });
  
  it('should use translations for error messages', () => {
    // Define a test schema with a custom error message
    const schema = z.object({
      name: z.string({ required_error: 'Required' })
    });
    
    // Missing required field
    req.body = {};
    
    // Call middleware
    const middleware = validate(schema, 'body');
    middleware(req as Request, res as Response, next);
    
    // Expect translated error message
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: expect.arrayContaining([
        expect.objectContaining({
          message: 'Translated Required'
        })
      ])
    });
  });
  
  it('should validate query parameters', () => {
    // Define a schema for query
    const schema = z.object({
      page: z.string().optional(),
      limit: z.string().optional()
    });
    
    // Set query params
    req.query = { page: '2', limit: 'abc' };
    
    // Call middleware
    const middleware = validate(schema, 'query');
    middleware(req as Request, res as Response, next);
    
    // Expect next to be called
    expect(next).toHaveBeenCalled();
  });
  
  it('should handle unexpected errors', () => {
    // Create a schema that throws a non-Zod error
    const schema = {
      parse: () => { throw new Error('Unexpected error'); }
    } as unknown as z.ZodTypeAny;
    
    // Call middleware
    const middleware = validate(schema, 'body');
    middleware(req as Request, res as Response, next);
    
    // Expect error to be passed to next
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
}); 