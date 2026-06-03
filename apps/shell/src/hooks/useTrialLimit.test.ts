import { renderHook, act } from '@testing-library/react';
import useTrialLimit from './useTrialLimit';

describe('useTrialLimit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with 0 trial count and 3 remaining', () => {
    const { result } = renderHook(() => useTrialLimit(false));
    expect(result.current.trialCount).toBe(0);
    expect(result.current.remaining).toBe(3);
    expect(result.current.showSignInGate).toBe(false);
  });

  it('checkTrial always returns true when authenticated', () => {
    const { result } = renderHook(() => useTrialLimit(true));
    let allowed;
    act(() => {
      allowed = result.current.checkTrial();
    });
    expect(allowed).toBe(true);
  });

  it('checkTrial increments count for unauthenticated user', () => {
    const { result } = renderHook(() => useTrialLimit(false));
    let allowed;
    act(() => {
      allowed = result.current.checkTrial();
    });
    expect(allowed).toBe(true);
    expect(result.current.trialCount).toBe(1);
    expect(result.current.remaining).toBe(2);
    expect(localStorage.getItem('fmx_trial_uses')).toBe('1');
  });

  it('blocks after 3 uses and shows sign-in gate', () => {
    localStorage.setItem('fmx_trial_uses', '3');
    const { result } = renderHook(() => useTrialLimit(false));
    let allowed;
    act(() => {
      allowed = result.current.checkTrial();
    });
    expect(allowed).toBe(false);
    expect(result.current.showSignInGate).toBe(true);
  });

  it('dismissGate hides sign-in gate', () => {
    localStorage.setItem('fmx_trial_uses', '3');
    const { result } = renderHook(() => useTrialLimit(false));
    act(() => {
      result.current.checkTrial();
    });
    expect(result.current.showSignInGate).toBe(true);
    act(() => {
      result.current.dismissGate();
    });
    expect(result.current.showSignInGate).toBe(false);
  });

  it('reads initial count from localStorage', () => {
    localStorage.setItem('fmx_trial_uses', '2');
    const { result } = renderHook(() => useTrialLimit(false));
    expect(result.current.trialCount).toBe(2);
    expect(result.current.remaining).toBe(1);
  });

  it('remaining never goes below 0', () => {
    localStorage.setItem('fmx_trial_uses', '10');
    const { result } = renderHook(() => useTrialLimit(false));
    expect(result.current.remaining).toBe(0);
  });

  it('handles invalid localStorage value', () => {
    localStorage.setItem('fmx_trial_uses', 'abc');
    const { result } = renderHook(() => useTrialLimit(false));
    expect(result.current.trialCount).toBe(0);
  });
});
