/**
 * HTTP 402 routing in useAiTools: a server-side "daily quota exhausted"
 * response must open the pass-purchase upsell via onBlocked instead of a
 * generic error toast - and fall back to a warning toast when no onBlocked
 * is wired (e.g. anonymous users).
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTransformText, mockUseOidcAuth } = vi.hoisted(() => ({
  mockTransformText: vi.fn(),
  mockUseOidcAuth: vi.fn(),
}));

vi.mock('@velobits/app-core/store/api/textApi', () => ({
  useTransformTextMutation: () => [mockTransformText, { isLoading: false }],
}));

vi.mock('@velobits/app-core/auth/useOidcAuth', () => ({
  useOidcAuth: mockUseOidcAuth,
}));

import useAiTools from './useAiTools';

const err402 = {
  status: 402,
  data: { detail: { code: 'blocked', message: 'Daily limit reached for this tool (3 uses).' } },
};

function renderAi({ onBlocked }: { onBlocked?: (toolId: string) => void } = {}) {
  const showAlert = vi.fn();
  const { result } = renderHook(() =>
    useAiTools('some text', vi.fn(), vi.fn(), vi.fn(), showAlert, undefined, onBlocked)
  );
  return { result, showAlert };
}

describe('useAiTools 402 handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOidcAuth.mockReturnValue({ isAuthenticated: true });
    mockTransformText.mockReturnValue({ unwrap: () => Promise.reject(err402) });
  });

  it('routes 402 to onBlocked with the tool id instead of toasting', async () => {
    const onBlocked = vi.fn();
    const { result, showAlert } = renderAi({ onBlocked });

    await act(async () => {
      await result.current.handleTranslate();
    });

    expect(onBlocked).toHaveBeenCalledWith('translate');
    expect(showAlert).not.toHaveBeenCalledWith(expect.any(String), 'danger');
  });

  it('falls back to a warning toast when onBlocked is not wired', async () => {
    const { result, showAlert } = renderAi();

    await act(async () => {
      await result.current.handleTranslate();
    });

    expect(showAlert).toHaveBeenCalledWith(
      'Daily limit reached for this tool (3 uses).',
      'warning'
    );
  });

  it('still toasts non-402 errors as danger', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ status: 500, data: { detail: 'boom' } }),
    });
    const onBlocked = vi.fn();
    const { result, showAlert } = renderAi({ onBlocked });

    await act(async () => {
      await result.current.handleTranslate();
    });

    expect(onBlocked).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith('boom', 'danger');
  });
});
