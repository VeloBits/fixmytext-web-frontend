import { renderHook } from '@testing-library/react';
import { useThemeContext } from './ThemeContext';

describe('useThemeContext', () => {
  it('throws when used outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useThemeContext())).toThrow(
      'useThemeContext must be used within a ThemeProvider'
    );
    spy.mockRestore();
  });
});
