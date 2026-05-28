import { renderHook } from '@testing-library/react';
import { useAlertContext } from './AlertContext';

describe('useAlertContext', () => {
  it('throws when used outside AlertProvider', () => {
    // Suppress the expected React error boundary console output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAlertContext())).toThrow(
      'useAlertContext must be used within an AlertProvider'
    );
    spy.mockRestore();
  });
});
