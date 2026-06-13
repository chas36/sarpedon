import { describe, it, expect, vi } from 'vitest';
import { generateLogin, validateLogin, generateUniqueLogin } from '../loginGenerator';

describe('loginGenerator', () => {
  describe('generateLogin', () => {
    it('should generate login with word and 3 digits', () => {
      const login = generateLogin();

      expect(login).toMatch(/^[А-ЯЁ]+\d{3}$/);
      expect(login.length).toBeGreaterThanOrEqual(5);
      expect(login.length).toBeLessThanOrEqual(15);
    });

    it('should generate different logins on multiple calls', () => {
      const logins = new Set();
      for (let i = 0; i < 10; i++) {
        logins.add(generateLogin());
      }

      expect(logins.size).toBeGreaterThan(1);
    });
  });

  describe('validateLogin', () => {
    it('should accept valid cyrillic login', () => {
      expect(validateLogin('ОКРУГ460')).toBeNull();
      expect(validateLogin('ВОЛГА123')).toBeNull();
    });

    it('should reject login with latin characters', () => {
      expect(validateLogin('OKRUG460')).toBe('Логин должен содержать только заглавные русские буквы и цифры');
    });

    it('should reject too short login', () => {
      expect(validateLogin('АБ12')).toBe('Логин должен быть от 5 до 15 символов');
    });

    it('should reject too long login', () => {
      expect(validateLogin('АБВГДЕЖЗИКЛМНОП1234')).toBe('Логин должен быть от 5 до 15 символов');
    });

    it('should reject login with lowercase', () => {
      expect(validateLogin('округ460')).toBe('Логин должен содержать только заглавные русские буквы и цифры');
    });

    it('should reject empty login', () => {
      expect(validateLogin('')).toBe('Логин должен быть от 5 до 15 символов');
    });
  });
});
