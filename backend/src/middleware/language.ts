import { Request, Response, NextFunction } from "express";

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      lang: string;
    }
  }
}

/**
 * Middleware to extract the preferred language from request headers
 * and attach it to the request object
 */
export const languageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  req.lang = req.headers['accept-language']?.split(',')[0] || 'en';
  next();
}; 