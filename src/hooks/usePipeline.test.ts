import { renderHook, act } from '@testing-library/react';
import usePipeline from './usePipeline';

describe('usePipeline', () => {
  it('starts with empty steps', () => {
    const { result } = renderHook(() => usePipeline());
    expect(result.current.steps).toEqual([]);
  });

  it('addStep appends a step', () => {
    const { result } = renderHook(() => usePipeline());
    act(() => {
      result.current.addStep('upper', 'Uppercase', 'HELLO');
    });
    expect(result.current.steps).toHaveLength(1);
    expect(result.current.steps[0].toolId).toBe('upper');
    expect(result.current.steps[0].label).toBe('Uppercase');
    expect(result.current.steps[0].result).toBe('HELLO');
    expect(result.current.steps[0].timestamp).toBeDefined();
  });

  it('addStep appends multiple steps', () => {
    const { result } = renderHook(() => usePipeline());
    act(() => {
      result.current.addStep('a', 'A', 'r1');
    });
    act(() => {
      result.current.addStep('b', 'B', 'r2');
    });
    expect(result.current.steps).toHaveLength(2);
  });

  it('clearPipeline removes all steps', () => {
    const { result } = renderHook(() => usePipeline());
    act(() => {
      result.current.addStep('a', 'A', 'r1');
    });
    act(() => {
      result.current.clearPipeline();
    });
    expect(result.current.steps).toEqual([]);
  });
});
