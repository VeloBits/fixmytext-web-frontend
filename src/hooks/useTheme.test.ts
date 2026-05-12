import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

const mockUpdatePrefs = vi.fn(() => ({ unwrap: () => Promise.resolve() }));

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: { accessToken: null } })),
}));

vi.mock('../store/api/userDataApi', () => ({
  useGetPreferencesQuery: vi.fn(() => ({ data: undefined })),
  useUpdatePreferencesMutation: () => [mockUpdatePrefs],
}));

import { useSelector } from 'react-redux';
import { useGetPreferencesQuery } from '../store/api/userDataApi';

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.classList.remove('dark');
    useSelector.mockImplementation((fn) => fn({ auth: { accessToken: null } }));
    useGetPreferencesQuery.mockReturnValue({ data: undefined });
  });

  it('defaults to dark mode', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('reads saved mode from localStorage', () => {
    localStorage.setItem('fmx_theme_mode', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('light');
  });

  it('setMode updates mode and localStorage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setMode('light');
    });
    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem('fmx_theme_mode')).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  it('setMode to dark adds class', () => {
    localStorage.setItem('fmx_theme_mode', 'light');
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setMode('dark');
    });
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('syncs to backend when authenticated', () => {
    useSelector.mockImplementation((fn) => fn({ auth: { accessToken: 'tok' } }));
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setMode('light');
    });
    expect(mockUpdatePrefs).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('does not sync to backend when unauthenticated', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setMode('light');
    });
    expect(mockUpdatePrefs).not.toHaveBeenCalled();
  });

  it('hydrates from DB preferences when authenticated', () => {
    useSelector.mockImplementation((fn) => fn({ auth: { accessToken: 'tok' } }));
    useGetPreferencesQuery.mockReturnValue({ data: { theme: 'light' } });
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem('fmx_theme_mode')).toBe('light');
  });
});
