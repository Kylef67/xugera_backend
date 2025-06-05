import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getTranslations } from '../localization';

type ZodSchema = z.ZodTypeAny;

export const validate = (schema: ZodSchema, property: 'body' | 'query' | 'params') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req[property]);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Get user's preferred language
        const lang = req.headers['accept-language']?.split(',')[0] || 'en';
        const t = getTranslations(lang);
        
        // Format errors with translations
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: translateErrorMessage(err.message, t)
        }));
        
        res.status(400).json({ errors: formattedErrors });
        return;
      }
      next(error);
    }
  };
};

// Helper to translate error messages
function translateErrorMessage(message: string, translations: any): string {
  // Check if there's a direct translation for this error message
  if (translations.errors && translations.errors[message]) {
    return translations.errors[message];
  }
  
  // Fallback to the original message
  return message;
} 