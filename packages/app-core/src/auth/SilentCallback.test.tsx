import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SilentCallback } from './SilentCallback';

describe('SilentCallback', () => {
  it('calls signinSilentCallback on mount and renders nothing', async () => {
    const { userManager } = await import('../auth/userManager');
    const spy = vi.mocked(userManager.signinSilentCallback);

    const { container } = render(<SilentCallback />);

    expect(spy).toHaveBeenCalledOnce();
    expect(container.firstChild).toBeNull();
  });

  it('handles signinSilentCallback errors gracefully', async () => {
    const { userManager } = await import('../auth/userManager');
    vi.mocked(userManager.signinSilentCallback).mockRejectedValueOnce(
      new Error('iframe error')
    );
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Should not throw
    render(<SilentCallback />);

    // Allow the promise rejection to be caught
    await new Promise((r) => setTimeout(r, 0));

    consoleSpy.mockRestore();
  });
});
