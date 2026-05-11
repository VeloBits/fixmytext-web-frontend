vi.mock('../../hooks/useFingerprint', () => ({
  getVisitorId: vi.fn(() => 'test-visitor-id'),
}));

import { textApi, useTransformTextMutation } from './textApi';

describe('textApi', () => {
  it('has reducerPath "textApi"', () => {
    expect(textApi.reducerPath).toBe('textApi');
  });

  it('has a reducer function', () => {
    expect(typeof textApi.reducer).toBe('function');
  });

  it('has middleware function', () => {
    expect(typeof textApi.middleware).toBe('function');
  });

  it('defines transformText endpoint', () => {
    expect(textApi.endpoints).toHaveProperty('transformText');
  });

  it('exports useTransformTextMutation hook', () => {
    expect(typeof useTransformTextMutation).toBe('function');
  });
});
