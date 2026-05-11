import { detectBrowserRegion } from './region';

describe('detectBrowserRegion', () => {
  const origIntl = globalThis.Intl;
  const origNavigator = globalThis.navigator;

  function mockTimezone(tz: string): void {
    globalThis.Intl = {
      DateTimeFormat: () => ({
        resolvedOptions: () => ({ timeZone: tz }),
      }),
    } as unknown as typeof Intl;
  }

  function mockLanguage(lang: string): void {
    Object.defineProperty(globalThis, 'navigator', {
      value: { language: lang },
      writable: true,
      configurable: true,
    });
  }

  afterEach(() => {
    globalThis.Intl = origIntl;
    Object.defineProperty(globalThis, 'navigator', {
      value: origNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('returns IN for Asia/Kolkata', () => {
    mockTimezone('Asia/Kolkata');
    expect(detectBrowserRegion()).toBe('IN');
  });

  it('returns IN for Asia/Calcutta', () => {
    mockTimezone('Asia/Calcutta');
    expect(detectBrowserRegion()).toBe('IN');
  });

  it('returns GB for Europe/London', () => {
    mockTimezone('Europe/London');
    expect(detectBrowserRegion()).toBe('GB');
  });

  it('returns EU for Europe/Berlin', () => {
    mockTimezone('Europe/Berlin');
    expect(detectBrowserRegion()).toBe('EU');
  });

  it('returns US for America/New_York', () => {
    mockTimezone('America/New_York');
    expect(detectBrowserRegion()).toBe('US');
  });

  it('returns US for America/Chicago', () => {
    mockTimezone('America/Chicago');
    expect(detectBrowserRegion()).toBe('US');
  });

  it('returns US for America/Denver', () => {
    mockTimezone('America/Denver');
    expect(detectBrowserRegion()).toBe('US');
  });

  it('returns US for America/Los_Angeles', () => {
    mockTimezone('America/Los_Angeles');
    expect(detectBrowserRegion()).toBe('US');
  });

  it('returns US for America/Phoenix', () => {
    mockTimezone('America/Phoenix');
    expect(detectBrowserRegion()).toBe('US');
  });

  it('returns US for US/ timezones', () => {
    mockTimezone('US/Eastern');
    expect(detectBrowserRegion()).toBe('US');
  });

  it('falls back to navigator.language for IN', () => {
    mockTimezone('Asia/Tokyo');
    mockLanguage('hi-IN');
    expect(detectBrowserRegion()).toBe('IN');
  });

  it('falls back to navigator.language hi', () => {
    mockTimezone('Asia/Tokyo');
    mockLanguage('hi');
    expect(detectBrowserRegion()).toBe('IN');
  });

  it('falls back to navigator.language for GB', () => {
    mockTimezone('Asia/Tokyo');
    mockLanguage('en-GB');
    expect(detectBrowserRegion()).toBe('GB');
  });

  it('falls back to navigator.language for US', () => {
    mockTimezone('Asia/Tokyo');
    mockLanguage('en-US');
    expect(detectBrowserRegion()).toBe('US');
  });

  it('falls back to navigator.language en as US', () => {
    mockTimezone('Asia/Tokyo');
    mockLanguage('en');
    expect(detectBrowserRegion()).toBe('US');
  });

  it('returns empty string when nothing matches', () => {
    mockTimezone('Pacific/Auckland');
    mockLanguage('ja');
    expect(detectBrowserRegion()).toBe('');
  });

  it('returns empty string when Intl throws', () => {
    globalThis.Intl = {
      DateTimeFormat: () => {
        throw new Error('no');
      },
    } as unknown as typeof Intl;
    expect(detectBrowserRegion()).toBe('');
  });
});
