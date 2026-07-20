import { renderHook, act } from '@testing-library/react';
import useExport from './useExport';

// Top-level mocks for dynamic imports used inside the export handlers
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(function () {
    return {
      splitTextToSize: vi.fn(() => ['line1', 'line2']),
      text: vi.fn(),
      save: vi.fn(),
    };
  }),
}));

vi.mock('docx', () => ({
  Document: vi.fn(function (opts) {
    return opts;
  }),
  Paragraph: vi.fn(function (opts) {
    return opts;
  }),
  TextRun: vi.fn(function (t) {
    return t;
  }),
  Packer: {
    toBlob: vi.fn(
      async () =>
        new Blob(['docx'], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
    ),
  },
}));

describe('useExport', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let setLoading: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showAlert: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreateObjectURL: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockRevokeObjectURL: any;

  beforeEach(() => {
    vi.clearAllMocks();
    setLoading = vi.fn();
    showAlert = vi.fn();
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:url');
    mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;
  });

  const renderExp = () => renderHook(() => useExport(setLoading, showAlert));

  it('setOutputText stores text in ref', () => {
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('my text');
    });
    // Verify by downloading — triggers blob creation with stored text
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValueOnce({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLElement);
    act(() => {
      result.current.handleDownloadTxt();
    });
    expect(mockCreateObjectURL).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('handleDownloadTxt creates txt blob and triggers download', () => {
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('hello');
    });
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValueOnce({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLElement);
    act(() => {
      result.current.handleDownloadTxt();
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');
    expect(showAlert).toHaveBeenCalledWith('Downloaded as TXT', 'success');
    vi.restoreAllMocks();
  });

  it('handleDownloadJson creates json blob', () => {
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('test');
    });
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValueOnce({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLElement);
    act(() => {
      result.current.handleDownloadJson();
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith('Downloaded as JSON', 'success');
    vi.restoreAllMocks();
  });

  it('handleDownloadCsv creates csv blob', () => {
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('a,b,c');
    });
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValueOnce({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLElement);
    act(() => {
      result.current.handleDownloadCsv();
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith('Downloaded as CSV', 'success');
    vi.restoreAllMocks();
  });

  it('handleDownloadMd creates markdown blob', () => {
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('# Title');
    });
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValueOnce({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLElement);
    act(() => {
      result.current.handleDownloadMd();
    });
    expect(clickSpy).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith('Downloaded as Markdown', 'success');
    vi.restoreAllMocks();
  });

  it('handleDownloadPdf sets loading and handles dynamic import failure', async () => {
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('pdf content');
    });
    await act(async () => {
      await result.current.handleDownloadPdf();
    });
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
    // jsPDF may not be available in test env - either success or error handled
    expect(showAlert).toHaveBeenCalled();
  });

  it('handleDownloadDocx sets loading and handles dynamic import', async () => {
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('docx content');
    });
    await act(async () => {
      await result.current.handleDownloadDocx();
    });
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(showAlert).toHaveBeenCalled();
  });

  it('handleDownloadPdf succeeds with mocked jsPDF', async () => {
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('pdf content here');
    });
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLElement);
    await act(async () => {
      await result.current.handleDownloadPdf();
    });
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(showAlert).toHaveBeenCalledWith('Downloaded as PDF', 'success');
    vi.restoreAllMocks();
  });

  it('handleDownloadPdf shows danger when jsPDF throws', async () => {
    const jspdfMod = await import('jspdf');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (jspdfMod.jsPDF as unknown as any).mockImplementationOnce(() => {
      throw new Error('PDF fail');
    });
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('text');
    });
    await act(async () => {
      await result.current.handleDownloadPdf();
    });
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(showAlert).toHaveBeenCalledWith('PDF export failed', 'danger');
  });

  it('handleDownloadDocx succeeds with mocked docx', async () => {
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('line one\nline two');
    });
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
    } as unknown as HTMLElement);
    await act(async () => {
      await result.current.handleDownloadDocx();
    });
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(showAlert).toHaveBeenCalledWith('Downloaded as DOCX', 'success');
    vi.restoreAllMocks();
  });

  it('handleDownloadDocx shows danger when Packer.toBlob throws', async () => {
    const docxMod = await import('docx');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (docxMod.Packer.toBlob as unknown as any).mockRejectedValueOnce(new Error('DOCX fail'));
    const { result } = renderExp();
    act(() => {
      result.current.setOutputText('text');
    });
    await act(async () => {
      await result.current.handleDownloadDocx();
    });
    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(showAlert).toHaveBeenCalledWith('DOCX export failed', 'danger');
  });
});
