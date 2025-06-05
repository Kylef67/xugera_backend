import { Request, Response, NextFunction } from 'express';
import { languageMiddleware } from '../language';

describe('Language Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  it('should set default language to "en" when no accept-language header is present', () => {
    mockRequest.headers = {};
    
    languageMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.lang).toBe('en');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should extract language from accept-language header', () => {
    mockRequest.headers = {
      'accept-language': 'fr,en-US;q=0.9,en;q=0.8'
    };
    
    languageMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.lang).toBe('fr');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should handle empty accept-language header and use default', () => {
    mockRequest.headers = {
      'accept-language': ''
    };
    
    languageMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.lang).toBe('en');
    expect(nextFunction).toHaveBeenCalled();
  });
}); 