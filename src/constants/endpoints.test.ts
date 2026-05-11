import { ENDPOINTS } from './endpoints';

describe('ENDPOINTS', () => {
  it('is a non-empty object', () => {
    expect(typeof ENDPOINTS).toBe('object');
    expect(Object.keys(ENDPOINTS).length).toBeGreaterThan(0);
  });

  it('all values are strings starting with /api/v1/text/', () => {
    for (const [key, value] of Object.entries(ENDPOINTS)) {
      expect(typeof value).toBe('string');
      expect(value).toMatch(/^\/api\/v1\/text\//);
    }
  });

  it('has no duplicate endpoint paths', () => {
    const values = Object.values(ENDPOINTS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('contains expected transform endpoints', () => {
    expect(ENDPOINTS.UPPERCASE).toBe('/api/v1/text/uppercase');
    expect(ENDPOINTS.LOWERCASE).toBe('/api/v1/text/lowercase');
    expect(ENDPOINTS.SENTENCE_CASE).toBe('/api/v1/text/sentencecase');
    expect(ENDPOINTS.TITLE_CASE).toBe('/api/v1/text/titlecase');
    expect(ENDPOINTS.SNAKE_CASE).toBe('/api/v1/text/snake-case');
    expect(ENDPOINTS.KEBAB_CASE).toBe('/api/v1/text/kebab-case');
  });

  it('contains encoding endpoints', () => {
    expect(ENDPOINTS.BASE64_ENCODE).toBe('/api/v1/text/base64-encode');
    expect(ENDPOINTS.BASE64_DECODE).toBe('/api/v1/text/base64-decode');
    expect(ENDPOINTS.URL_ENCODE).toBe('/api/v1/text/url-encode');
    expect(ENDPOINTS.HEX_ENCODE).toBe('/api/v1/text/hex-encode');
  });

  it('contains AI endpoints', () => {
    expect(ENDPOINTS.SUMMARIZE).toBe('/api/v1/text/summarize');
    expect(ENDPOINTS.FIX_GRAMMAR).toBe('/api/v1/text/fix-grammar');
    expect(ENDPOINTS.PARAPHRASE).toBe('/api/v1/text/paraphrase');
    expect(ENDPOINTS.TRANSLATE).toBe('/api/v1/text/translate');
  });

  it('contains cipher endpoints', () => {
    expect(ENDPOINTS.ATBASH).toBe('/api/v1/text/atbash');
    expect(ENDPOINTS.ROT13).toBe('/api/v1/text/rot13');
    expect(ENDPOINTS.CAESAR_CIPHER).toBe('/api/v1/text/caesar-cipher');
  });
});
