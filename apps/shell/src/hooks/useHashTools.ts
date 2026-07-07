import { useMemo } from 'react';
import type React from 'react';
import type { AiResult } from './useAiTools';
import type { AlertType } from './useAlert';

/**
 * useHashTools
 *
 * Extracts all hashing handler functions from TextForm.
 * Accepts a deps object and returns memoized hash handler functions.
 */

interface HashToolsDeps {
  textRef: React.RefObject<string>;
  setLocalLoading: (v: boolean) => void;
  setAiResult: (r: AiResult) => void;
  setPreviewMode: (mode: string) => void;
  pushHistory: (label: string, orig: string, result: string, meta: Record<string, string>) => void;
  showAlert: (msg: string, type: AlertType) => void;
}

const useHashTools = ({
  textRef,
  setLocalLoading,
  setAiResult,
  setPreviewMode,
  pushHistory,
  showAlert,
}: HashToolsDeps) => {
  return useMemo(() => {
    // Factory for all hash handlers
    const createHashHandler = (
      toolId: string,
      label: string,
      hashFn: (t: string) => Promise<string>
    ) => async (): Promise<void> => {
      const t = textRef.current;
      if (!t) return;
      const original = t;
      setLocalLoading(true);
      try {
        const hash = t.includes('\n')
          ? (await Promise.all(t.split('\n').map((line) => hashFn(line)))).join('\n')
          : await hashFn(t);
        setAiResult({ label, result: hash });
        setPreviewMode('result');
        pushHistory(label, original, hash, { toolId, toolType: 'local' });
        showAlert(`${label} generated`, 'success');
      } catch {
        showAlert(`${label} failed`, 'danger');
      } finally {
        setLocalLoading(false);
      }
    };

    // Helper: Web Crypto API digest
    const webCryptoHash = (algo: string) => async (text: string): Promise<string> => {
      const data = new TextEncoder().encode(text);
      const buf = await crypto.subtle.digest(algo, data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    };

    // Helper: CRC32 (pure JS)
    const crc32Fn = (text: string): string => {
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[i] = c;
      }
      const bytes = new TextEncoder().encode(text);
      let crc = 0xffffffff;
      for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
      return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
    };

    // Helper: Adler-32 (pure JS)
    const adler32Fn = (text: string): string => {
      const bytes = new TextEncoder().encode(text);
      let a = 1,
        b = 0;
      for (let i = 0; i < bytes.length; i++) {
        a = (a + bytes[i]!) % 65521;
        b = (b + a) % 65521;
      }
      return ((b << 16) | a).toString(16).padStart(8, '0');
    };

    // Helper: FNV-1a 32-bit (pure JS)
    const fnv1aFn = (text: string): string => {
      const bytes = new TextEncoder().encode(text);
      let hash = 0x811c9dc5;
      for (let i = 0; i < bytes.length; i++) {
        hash ^= bytes[i]!;
        hash = Math.imul(hash, 0x01000193);
      }
      return (hash >>> 0).toString(16).padStart(8, '0');
    };

    // Individual hash handlers
    const handleMd5 = createHashHandler('md5', 'MD5 Hash', async (t) => {
      const m = await import('blueimp-md5');
      return m.default(t);
    });
    const handleSha1 = createHashHandler('sha1', 'SHA-1 Hash', webCryptoHash('SHA-1'));
    const handleSha224 = createHashHandler('sha224', 'SHA-224 Hash', async (t) => {
      const m = await import('js-sha256');
      return m.sha224(t);
    });
    const handleSha256 = createHashHandler('sha256', 'SHA-256 Hash', webCryptoHash('SHA-256'));
    const handleSha384 = createHashHandler('sha384', 'SHA-384 Hash', webCryptoHash('SHA-384'));
    const handleSha512 = createHashHandler('sha512', 'SHA-512 Hash', webCryptoHash('SHA-512'));
    const handleSha512_224 = createHashHandler('sha512_224', 'SHA-512/224 Hash', async (t) => {
      const m = await import('js-sha512');
      return m.sha512_224(t);
    });
    const handleSha512_256 = createHashHandler('sha512_256', 'SHA-512/256 Hash', async (t) => {
      const m = await import('js-sha512');
      return m.sha512_256(t);
    });
    const handleSha3_224 = createHashHandler('sha3_224', 'SHA3-224 Hash', async (t) => {
      const m = await import('js-sha3');
      return m.sha3_224(t);
    });
    const handleSha3_256 = createHashHandler('sha3_256', 'SHA3-256 Hash', async (t) => {
      const m = await import('js-sha3');
      return m.sha3_256(t);
    });
    const handleSha3_384 = createHashHandler('sha3_384', 'SHA3-384 Hash', async (t) => {
      const m = await import('js-sha3');
      return m.sha3_384(t);
    });
    const handleSha3_512 = createHashHandler('sha3_512', 'SHA3-512 Hash', async (t) => {
      const m = await import('js-sha3');
      return m.sha3_512(t);
    });
    const handleKeccak256 = createHashHandler('keccak256', 'Keccak-256 Hash', async (t) => {
      const m = await import('js-sha3');
      return m.keccak256(t);
    });
    const handleRipemd160 = createHashHandler('ripemd160', 'RIPEMD-160 Hash', async (t) => {
      const { default: ripemd160 } = await import('../utils/ripemd160');
      return ripemd160(t);
    });
    const handleBlake2b = createHashHandler('blake2b', 'BLAKE2b Hash', async (t) => {
      const m = await import('blakejs');
      const bytes = new TextEncoder().encode(t);
      return m.blake2bHex(bytes);
    });
    const handleBlake2s = createHashHandler('blake2s', 'BLAKE2s Hash', async (t) => {
      const m = await import('blakejs');
      const bytes = new TextEncoder().encode(t);
      return m.blake2sHex(bytes);
    });
    const handleWhirlpool = createHashHandler('whirlpool', 'Whirlpool Hash', async (t) => {
      const m = await import('whirlpool-hash');
      const w = new m.default.Whirlpool();
      w.update(Buffer.from(t));
      return m.default.encoders.toHex(w.finalize());
    });
    const handleCrc32 = createHashHandler('crc32', 'CRC32 Checksum', async (t) => crc32Fn(t));
    const handleAdler32 = createHashHandler('adler32', 'Adler-32 Checksum', async (t) =>
      adler32Fn(t)
    );
    const handleFnv1a = createHashHandler('fnv1a', 'FNV-1a Hash', async (t) => fnv1aFn(t));
    const handleXxhash = createHashHandler('xxhash', 'xxHash Hash', async (t) => {
      const m = await import('xxhashjs');
      return m.h32(t, 0).toString(16).padStart(8, '0');
    });
    const handleMurmurHash3 = createHashHandler('murmurhash3', 'MurmurHash3 Hash', async (t) => {
      const m = await import('murmurhash3js');
      return m.default.x86.hash32(t).toString(16).padStart(8, '0');
    });

    return {
      handleMd5,
      handleSha1,
      handleSha224,
      handleSha256,
      handleSha384,
      handleSha512,
      handleSha512_224,
      handleSha512_256,
      handleSha3_224,
      handleSha3_256,
      handleSha3_384,
      handleSha3_512,
      handleKeccak256,
      handleRipemd160,
      handleBlake2b,
      handleBlake2s,
      handleWhirlpool,
      handleCrc32,
      handleAdler32,
      handleFnv1a,
      handleXxhash,
      handleMurmurHash3,
    };
  }, [textRef, setLocalLoading, setAiResult, setPreviewMode, pushHistory, showAlert]);
};

export default useHashTools;
