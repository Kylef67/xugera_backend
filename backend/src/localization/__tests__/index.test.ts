import { getTranslations, translate, registerTranslation, clearTranslations, TranslationMap } from '../index';

jest.mock('../../localization/translations/en', () => ({
  default: {
    errors: {
      'Test error': 'English test error'
    },
    messages: {
      greeting: 'Hello, {{name}}!'
    }
  }
}), { virtual: true });

jest.mock('../../localization/translations/zh', () => ({
  default: {
    errors: {
      'Test error': '测试错误'
    },
    messages: {
      greeting: '你好，{{name}}！'
    }
  }
}), { virtual: true });

describe('Localization', () => {
  beforeEach(() => {
    clearTranslations();
    
    registerTranslation('en', {
      errors: {
        'Test error': 'English test error'
      },
      messages: {
        greeting: 'Hello, {{name}}!'
      }
    });
    
    registerTranslation('zh', {
      errors: {
        'Test error': '测试错误'
      },
      messages: {
        greeting: '你好，{{name}}！'
      }
    });
  });
  
  describe('getTranslations', () => {
    it('should load English translations by default', () => {
      const translations = getTranslations();
      expect(translations.errors).toBeDefined();
      expect((translations.errors as TranslationMap)['Test error']).toBe('English test error');
    });
    
    it('should load translations for a specific language', () => {
      const translations = getTranslations('zh');
      expect(translations.errors).toBeDefined();
      expect((translations.errors as TranslationMap)['Test error']).toBe('测试错误');
    });
    
    it('should fallback to base language if region-specific language is not found', () => {
      const translations = getTranslations('en-US');
      expect(translations.errors).toBeDefined();
      expect((translations.errors as TranslationMap)['Test error']).toBe('English test error');
    });
    
    it('should fallback to English if requested language is not found', () => {
      const translations = getTranslations('fr');
      expect(translations.errors).toBeDefined();
      expect((translations.errors as TranslationMap)['Test error']).toBe('English test error');
    });
    
    it('should cache translations for better performance', () => {
      const mockFrTranslations = {
        test: 'test value'
      };
      
      registerTranslation('fr', mockFrTranslations);
      const firstResult = getTranslations('fr');
      
      const updatedTranslations = {
        test: 'updated value'
      };
      
      registerTranslation('fr', updatedTranslations);
      
      const secondResult = getTranslations('fr');
      
      expect(secondResult).not.toBe(firstResult);
      expect(secondResult.test).toBe('updated value');
    });
  });
  
  describe('translate', () => {
    it('should translate a key using English by default', () => {
      const result = translate('messages.greeting', 'en', { name: 'World' });
      expect(result).toBe('Hello, World!');
    });
    
    it('should translate a key using a specific language', () => {
      const result = translate('messages.greeting', 'zh', { name: '世界' });
      expect(result).toBe('你好，世界！');
    });
    
    it('should return the key if translation is not found', () => {
      const result = translate('messages.unknown', 'en');
      expect(result).toBe('messages.unknown');
    });
    
    it('should navigate nested keys correctly', () => {
      const result = translate('errors.Test error', 'en');
      expect(result).toBe('English test error');
    });
    
    it('should register and use new translations', () => {
      registerTranslation('fr', {
        greetings: {
          hello: 'Bonjour, {{name}}!'
        }
      });
      
      const result = translate('greetings.hello', 'fr', { name: 'Monde' });
      expect(result).toBe('Bonjour, Monde!');
    });
  });
}); 