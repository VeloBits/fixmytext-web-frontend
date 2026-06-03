// Type stubs for libraries that do not ship type definitions.
declare module 'blakejs';
declare module 'whirlpool-hash';
declare module 'xxhashjs';
declare module 'murmurhash3js';
declare module 'blueimp-md5';
declare module 'qrcode' {
  export function toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
}
