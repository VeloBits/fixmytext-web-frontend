import { renderHook } from '@testing-library/react';
import useHashTools from './useHashTools';

// ---- Dynamic import mocks ----

vi.mock('blueimp-md5', () => ({
  default: vi.fn((t) => `md5-of-${t}`),
}));

vi.mock('js-sha256', () => ({
  sha224: vi.fn((t) => `sha224-of-${t}`),
}));

vi.mock('js-sha512', () => ({
  sha512_224: vi.fn((t) => `sha512_224-of-${t}`),
  sha512_256: vi.fn((t) => `sha512_256-of-${t}`),
}));

vi.mock('js-sha3', () => ({
  sha3_224: vi.fn((t) => `sha3_224-of-${t}`),
  sha3_256: vi.fn((t) => `sha3_256-of-${t}`),
  sha3_384: vi.fn((t) => `sha3_384-of-${t}`),
  sha3_512: vi.fn((t) => `sha3_512-of-${t}`),
  keccak256: vi.fn((t) => `keccak256-of-${t}`),
}));

vi.mock('../utils/ripemd160', () => ({
  default: vi.fn((t) => `ripemd160-of-${t}`),
}));

vi.mock('blakejs', () => ({
  blake2bHex: vi.fn(() => 'blake2b-hex'),
  blake2sHex: vi.fn(() => 'blake2s-hex'),
}));

vi.mock('whirlpool-hash', () => {
  const finalize = vi.fn(() => 'whirlpool-bytes');
  const update = vi.fn();
  return {
    default: {
      Whirlpool: vi.fn(() => ({ update, finalize })),
      encoders: { toHex: vi.fn(() => 'whirlpool-hex') },
    },
  };
});

vi.mock('xxhashjs', () => ({
  h32: vi.fn(() => ({ toString: () => 'aabbccdd' })),
}));

vi.mock('murmurhash3js', () => ({
  default: {
    x86: { hash32: vi.fn(() => 0x12345678) },
  },
}));

// ---- Web Crypto mock ----

const fakeDigest = vi.fn(async () => new Uint8Array([0xab, 0xcd, 0xef, 0x01]).buffer);

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      subtle: { digest: fakeDigest },
    },
    writable: true,
  });
});

// ---- Helpers ----

function makeDeps(textValue = 'hello') {
  return {
    textRef: { current: textValue },
    setLocalLoading: vi.fn(),
    setAiResult: vi.fn(),
    setPreviewMode: vi.fn(),
    pushHistory: vi.fn(),
    showAlert: vi.fn(),
  };
}

// ---- Tests ----

describe('useHashTools', () => {
  const EXPECTED_KEYS = [
    'handleMd5',
    'handleSha1',
    'handleSha224',
    'handleSha256',
    'handleSha384',
    'handleSha512',
    'handleSha512_224',
    'handleSha512_256',
    'handleSha3_224',
    'handleSha3_256',
    'handleSha3_384',
    'handleSha3_512',
    'handleKeccak256',
    'handleRipemd160',
    'handleBlake2b',
    'handleBlake2s',
    'handleWhirlpool',
    'handleCrc32',
    'handleAdler32',
    'handleFnv1a',
    'handleXxhash',
    'handleMurmurHash3',
  ];

  it('returns all expected handler keys', () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useHashTools(deps));

    expect(Object.keys(result.current).sort()).toEqual([...EXPECTED_KEYS].sort());
    for (const key of EXPECTED_KEYS) {
      expect(typeof result.current[key]).toBe('function');
    }
  });

  // --- Happy-path tests for representative handlers ---

  describe('handleMd5 (dynamic import handler)', () => {
    it('calls the full success flow', async () => {
      const deps = makeDeps('test input');
      const { result } = renderHook(() => useHashTools(deps));

      await result.current.handleMd5();

      expect(deps.setLocalLoading).toHaveBeenCalledWith(true);
      expect(deps.setAiResult).toHaveBeenCalledWith({
        label: 'MD5 Hash',
        result: 'md5-of-test input',
      });
      expect(deps.setPreviewMode).toHaveBeenCalledWith('result');
      expect(deps.pushHistory).toHaveBeenCalledWith('MD5 Hash', 'test input', 'md5-of-test input', {
        toolId: 'md5',
        toolType: 'local',
      });
      expect(deps.showAlert).toHaveBeenCalledWith('MD5 Hash generated', 'success');
      expect(deps.setLocalLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('handleSha256 (Web Crypto handler)', () => {
    it('calls crypto.subtle.digest and the full success flow', async () => {
      const deps = makeDeps('crypto text');
      const { result } = renderHook(() => useHashTools(deps));

      await result.current.handleSha256();

      expect(fakeDigest).toHaveBeenCalled();
      expect(fakeDigest.mock.calls[0][0]).toBe('SHA-256');
      expect(fakeDigest.mock.calls[0][1].constructor.name).toBe('Uint8Array');
      expect(deps.setLocalLoading).toHaveBeenCalledWith(true);
      expect(deps.setAiResult).toHaveBeenCalledWith({
        label: 'SHA-256 Hash',
        result: 'abcdef01',
      });
      expect(deps.setPreviewMode).toHaveBeenCalledWith('result');
      expect(deps.pushHistory).toHaveBeenCalledWith('SHA-256 Hash', 'crypto text', 'abcdef01', {
        toolId: 'sha256',
        toolType: 'local',
      });
      expect(deps.showAlert).toHaveBeenCalledWith('SHA-256 Hash generated', 'success');
      expect(deps.setLocalLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('handleCrc32 (pure JS handler)', () => {
    it('computes CRC32 and calls the full success flow', async () => {
      const deps = makeDeps('abc');
      const { result } = renderHook(() => useHashTools(deps));

      await result.current.handleCrc32();

      expect(deps.setLocalLoading).toHaveBeenCalledWith(true);
      expect(deps.setAiResult).toHaveBeenCalledWith({
        label: 'CRC32 Checksum',
        result: expect.stringMatching(/^[0-9a-f]{8}$/),
      });
      expect(deps.setPreviewMode).toHaveBeenCalledWith('result');
      expect(deps.pushHistory).toHaveBeenCalledWith(
        'CRC32 Checksum',
        'abc',
        expect.stringMatching(/^[0-9a-f]{8}$/),
        { toolId: 'crc32', toolType: 'local' }
      );
      expect(deps.showAlert).toHaveBeenCalledWith('CRC32 Checksum generated', 'success');
      expect(deps.setLocalLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('handleAdler32 (pure JS handler)', () => {
    it('computes Adler-32 and calls the full success flow', async () => {
      const deps = makeDeps('abc');
      const { result } = renderHook(() => useHashTools(deps));

      await result.current.handleAdler32();

      expect(deps.setLocalLoading).toHaveBeenCalledWith(true);
      expect(deps.setAiResult).toHaveBeenCalledWith({
        label: 'Adler-32 Checksum',
        result: expect.stringMatching(/^[0-9a-f]{8}$/),
      });
      expect(deps.showAlert).toHaveBeenCalledWith('Adler-32 Checksum generated', 'success');
      expect(deps.setLocalLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('handleFnv1a (pure JS handler)', () => {
    it('computes FNV-1a and calls the full success flow', async () => {
      const deps = makeDeps('abc');
      const { result } = renderHook(() => useHashTools(deps));

      await result.current.handleFnv1a();

      expect(deps.setLocalLoading).toHaveBeenCalledWith(true);
      expect(deps.setAiResult).toHaveBeenCalledWith({
        label: 'FNV-1a Hash',
        result: expect.stringMatching(/^[0-9a-f]{8}$/),
      });
      expect(deps.showAlert).toHaveBeenCalledWith('FNV-1a Hash generated', 'success');
      expect(deps.setLocalLoading).toHaveBeenCalledWith(false);
    });
  });

  // --- Empty text guard ---

  describe('empty text guard', () => {
    it.each([['handleMd5'], ['handleSha256'], ['handleCrc32'], ['handleAdler32'], ['handleFnv1a']])(
      '%s does nothing when textRef.current is empty',
      async (handlerName) => {
        const deps = makeDeps('');
        const { result } = renderHook(() => useHashTools(deps));

        await result.current[handlerName]();

        expect(deps.setLocalLoading).not.toHaveBeenCalled();
        expect(deps.setAiResult).not.toHaveBeenCalled();
        expect(deps.setPreviewMode).not.toHaveBeenCalled();
        expect(deps.pushHistory).not.toHaveBeenCalled();
        expect(deps.showAlert).not.toHaveBeenCalled();
      }
    );
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('handleMd5 calls showAlert with danger when the hash function throws', async () => {
      // Temporarily make the md5 mock throw
      const md5Module = await import('blueimp-md5');
      md5Module.default.mockImplementationOnce(() => {
        throw new Error('hash failed');
      });

      const deps = makeDeps('will fail');
      const { result } = renderHook(() => useHashTools(deps));

      await result.current.handleMd5();

      expect(deps.setLocalLoading).toHaveBeenCalledWith(true);
      expect(deps.showAlert).toHaveBeenCalledWith('MD5 Hash failed', 'danger');
      expect(deps.setLocalLoading).toHaveBeenCalledWith(false);
      // Should NOT have called success-path callbacks
      expect(deps.setAiResult).not.toHaveBeenCalled();
      expect(deps.setPreviewMode).not.toHaveBeenCalled();
      expect(deps.pushHistory).not.toHaveBeenCalled();
    });

    it('handleSha256 calls showAlert with danger when crypto.subtle.digest rejects', async () => {
      fakeDigest.mockRejectedValueOnce(new Error('crypto error'));

      const deps = makeDeps('will fail');
      const { result } = renderHook(() => useHashTools(deps));

      await result.current.handleSha256();

      expect(deps.setLocalLoading).toHaveBeenCalledWith(true);
      expect(deps.showAlert).toHaveBeenCalledWith('SHA-256 Hash failed', 'danger');
      expect(deps.setLocalLoading).toHaveBeenCalledWith(false);
      expect(deps.setAiResult).not.toHaveBeenCalled();
    });
  });

  // --- setLocalLoading(false) is always called (finally block) ---

  describe('setLocalLoading(false) is always called', () => {
    it('on success path', async () => {
      const deps = makeDeps('text');
      const { result } = renderHook(() => useHashTools(deps));

      await result.current.handleCrc32();

      const calls = deps.setLocalLoading.mock.calls;
      expect(calls[0]).toEqual([true]);
      expect(calls[calls.length - 1]).toEqual([false]);
    });

    it('on error path', async () => {
      fakeDigest.mockRejectedValueOnce(new Error('fail'));

      const deps = makeDeps('text');
      const { result } = renderHook(() => useHashTools(deps));

      await result.current.handleSha1();

      const calls = deps.setLocalLoading.mock.calls;
      expect(calls[0]).toEqual([true]);
      expect(calls[calls.length - 1]).toEqual([false]);
    });
  });
});
