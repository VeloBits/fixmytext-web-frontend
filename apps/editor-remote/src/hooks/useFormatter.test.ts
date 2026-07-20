import { renderHook, act } from '@testing-library/react';
import useFormatter from './useFormatter';

// Mock prettier imports
vi.mock('prettier/standalone', () => ({
  default: {
    format: vi.fn((code) => `formatted:${code}`),
  },
}));
vi.mock('prettier/parser-babel', () => ({ default: {} }));
vi.mock('prettier/parser-typescript', () => ({ default: {} }));
vi.mock('prettier/parser-html', () => ({ default: {} }));
vi.mock('prettier/parser-postcss', () => ({ default: {} }));

describe('useFormatter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let setLoading: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showAlert: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onResult: any;

  beforeEach(() => {
    setLoading = vi.fn();
    showAlert = vi.fn();
    onResult = vi.fn();
  });

  it('returns format config and handlers', () => {
    const { result } = renderHook(() => useFormatter('code', setLoading, showAlert, onResult));
    expect(result.current.fmtCfg).toBeDefined();
    expect(result.current.fmtCfg.tabWidth).toBe(2);
    expect(typeof result.current.handleFormatHtml).toBe('function');
    expect(typeof result.current.handleFormatCss).toBe('function');
    expect(typeof result.current.handleFormatJs).toBe('function');
    expect(typeof result.current.handleFormatTs).toBe('function');
  });

  it('does nothing when text is empty', async () => {
    const { result } = renderHook(() => useFormatter('', setLoading, showAlert, onResult));
    await act(async () => {
      await result.current.handleFormatJs();
    });
    expect(setLoading).not.toHaveBeenCalled();
  });

  it('formats JS successfully', async () => {
    const { result } = renderHook(() =>
      useFormatter('const x = 1', setLoading, showAlert, onResult)
    );
    await act(async () => {
      await result.current.handleFormatJs();
    });
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(onResult).toHaveBeenCalledWith('JS / JSX formatted', expect.any(String));
    expect(showAlert).toHaveBeenCalledWith('JS / JSX formatted', 'success');
  });

  it('formats HTML successfully', async () => {
    const { result } = renderHook(() =>
      useFormatter('<div></div>', setLoading, showAlert, onResult)
    );
    await act(async () => {
      await result.current.handleFormatHtml();
    });
    expect(onResult).toHaveBeenCalledWith('HTML formatted', expect.any(String));
  });

  it('formats CSS successfully', async () => {
    const { result } = renderHook(() => useFormatter('body { }', setLoading, showAlert, onResult));
    await act(async () => {
      await result.current.handleFormatCss();
    });
    expect(onResult).toHaveBeenCalledWith('CSS formatted', expect.any(String));
  });

  it('formats TypeScript successfully', async () => {
    const { result } = renderHook(() =>
      useFormatter('const x: number = 1', setLoading, showAlert, onResult)
    );
    await act(async () => {
      await result.current.handleFormatTs();
    });
    expect(onResult).toHaveBeenCalledWith('TypeScript formatted', expect.any(String));
  });

  it('handles format error', async () => {
    const prettier = await import('prettier/standalone');
    // vi.mock replaces format with a mock — cast for access to mock methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFormat = prettier.default.format as unknown as any;
    mockFormat.mockImplementationOnce(() => {
      throw new Error('Parse error\ndetails');
    });
    const { result } = renderHook(() => useFormatter('bad code', setLoading, showAlert, onResult));
    await act(async () => {
      await result.current.handleFormatJs();
    });
    expect(showAlert).toHaveBeenCalledWith('Parse error', 'danger');
    expect(setLoading).toHaveBeenCalledWith(false);
  });

  it('allows updating format config', () => {
    const { result } = renderHook(() => useFormatter('code', setLoading, showAlert, onResult));
    act(() => {
      result.current.setFmtCfg({ ...result.current.fmtCfg, tabWidth: 4 });
    });
    expect(result.current.fmtCfg.tabWidth).toBe(4);
  });

  it('sorts imports for babel parser when enabled', async () => {
    const code = `import b from 'b'\nimport a from 'a'\nconst x = 1`;
    const { result } = renderHook(() => useFormatter(code, setLoading, showAlert, onResult));
    await act(async () => {
      await result.current.handleFormatJs();
    });
    // Prettier mock receives sorted code
    const prettier = await import('prettier/standalone');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockFmt = prettier.default.format as unknown as any;
    const callArg = mockFmt.mock.calls[mockFmt.mock.calls.length - 1]![0]!;
    expect(callArg.indexOf("import a from 'a'")).toBeLessThan(callArg.indexOf("import b from 'b'"));
  });
});
