import { ROUTES } from './index';

describe('ROUTES', () => {
  it('is a non-empty object', () => {
    expect(typeof ROUTES).toBe('object');
    expect(Object.keys(ROUTES).length).toBeGreaterThan(0);
  });

  it('contains expected route keys', () => {
    expect(ROUTES).toHaveProperty('HOME');
    expect(ROUTES).toHaveProperty('ABOUT');
    expect(ROUTES).toHaveProperty('LOGIN');
    expect(ROUTES).toHaveProperty('SIGNUP');
    expect(ROUTES).toHaveProperty('DASHBOARD');
    expect(ROUTES).toHaveProperty('PRICING');
    expect(ROUTES).toHaveProperty('SHARE');
  });

  it('all values are strings starting with /', () => {
    for (const value of Object.values(ROUTES)) {
      expect(typeof value).toBe('string');
      expect(value.startsWith('/')).toBe(true);
    }
  });

  it('has correct path values', () => {
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.ABOUT).toBe('/about');
    expect(ROUTES.LOGIN).toBe('/login');
    expect(ROUTES.SIGNUP).toBe('/signup');
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
    expect(ROUTES.PRICING).toBe('/pricing');
    expect(ROUTES.SHARE).toBe('/share/:id');
  });
});
