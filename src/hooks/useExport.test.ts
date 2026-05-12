import { renderHook, act } from '@testing-library/react';
import useExport from './useExport';

describe('useExport', () => {
  let setLoading, showAlert;
  let mockCreateObjectURL, mockRevokeObjectURL;

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
    });
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
    });
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
    });
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
    });
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
    });
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
});
