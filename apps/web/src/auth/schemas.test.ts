import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema, magicLinkSchema } from './schemas';

describe('auth schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid email + password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('signupSchema', () => {
    it('accepts valid signup data', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'Password1',
        display_name: 'Test User',
      });
      expect(result.success).toBe(true);
    });

    it('rejects password shorter than 8 chars', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'Pass1',
        display_name: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password with no uppercase', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'password1',
        display_name: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password with no number', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'Password',
        display_name: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty display_name', () => {
      const result = signupSchema.safeParse({
        email: 'user@example.com',
        password: 'Password1',
        display_name: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('magicLinkSchema', () => {
    it('accepts valid email', () => {
      const result = magicLinkSchema.safeParse({ email: 'user@example.com' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = magicLinkSchema.safeParse({ email: 'not-valid' });
      expect(result.success).toBe(false);
    });
  });
});
