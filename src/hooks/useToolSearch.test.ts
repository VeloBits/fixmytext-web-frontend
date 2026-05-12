import { renderHook, act } from '@testing-library/react';
import useToolSearch from './useToolSearch';

// Mock TOOLS and SEARCH_INTENTS
vi.mock('../constants/tools', () => ({
  TOOLS: [
    {
      id: 'upper',
      label: 'Uppercase',
      description: 'Convert to uppercase',
      keywords: ['caps', 'upper'],
    },
    { id: 'lower', label: 'Lowercase', description: 'Convert to lowercase', keywords: ['lower'] },
    {
      id: 'trim',
      label: 'Trim Whitespace',
      description: 'Remove extra spaces',
      keywords: ['spaces', 'trim'],
    },
  ],
  SEARCH_INTENTS: [
    { phrases: ['make uppercase', 'capitalize'], toolIds: ['upper'] },
    { phrases: ['make lowercase'], toolIds: ['lower'] },
  ],
}));

describe('useToolSearch', () => {
  it('starts with empty query and closed', () => {
    const { result } = renderHook(() => useToolSearch());
    expect(result.current.query).toBe('');
    expect(result.current.isOpen).toBe(false);
    expect(result.current.results).toEqual([]);
  });

  it('returns no results for empty query', () => {
    const { result } = renderHook(() => useToolSearch());
    act(() => {
      result.current.setQuery('   ');
    });
    expect(result.current.results).toEqual([]);
  });

  it('finds tool by label', () => {
    const { result } = renderHook(() => useToolSearch());
    act(() => {
      result.current.setQuery('uppercase');
    });
    expect(result.current.results.length).toBeGreaterThan(0);
    expect(result.current.results[0].id).toBe('upper');
  });

  it('finds tool by keyword', () => {
    const { result } = renderHook(() => useToolSearch());
    act(() => {
      result.current.setQuery('caps');
    });
    expect(result.current.results.some((r) => r.id === 'upper')).toBe(true);
  });

  it('finds tool by description', () => {
    const { result } = renderHook(() => useToolSearch());
    act(() => {
      result.current.setQuery('extra spaces');
    });
    expect(result.current.results.some((r) => r.id === 'trim')).toBe(true);
  });

  it('matches search intents', () => {
    const { result } = renderHook(() => useToolSearch());
    act(() => {
      result.current.setQuery('make uppercase');
    });
    expect(result.current.results[0].id).toBe('upper');
  });

  it('open sets isOpen to true', () => {
    const { result } = renderHook(() => useToolSearch());
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('close resets state', () => {
    const { result } = renderHook(() => useToolSearch());
    act(() => {
      result.current.setQuery('test');
    });
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.query).toBe('');
  });

  it('exact label match scores higher', () => {
    const { result } = renderHook(() => useToolSearch());
    act(() => {
      result.current.setQuery('lowercase');
    });
    expect(result.current.results[0].id).toBe('lower');
  });

  it('limits results to 8', () => {
    const { result } = renderHook(() => useToolSearch());
    act(() => {
      result.current.setQuery('e');
    });
    expect(result.current.results.length).toBeLessThanOrEqual(8);
  });
});
