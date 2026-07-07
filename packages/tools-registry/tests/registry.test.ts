import { describe, it, expect } from 'vitest';
import { TOOLS, TOOL_GROUPS, USE_CASE_TABS } from '../src/tools';
import { getToolBySlug, getAllSlugs, getToolsByGroup, getAllGroups } from '../src/slugs';

describe('TOOLS registry', () => {
  it('contains exactly 254 tools', () => {
    expect(TOOLS).toHaveLength(254);
  });

  it('has 14 distinct groups', () => {
    const groups = new Set(TOOLS.map((t) => t.group));
    expect(groups.size).toBe(14);
  });

  it('all tool ids are unique', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all tool ids are URL-safe (alphanumeric + underscore)', () => {
    const urlSafe = /^[a-z0-9_]+$/;
    TOOLS.forEach((t) => {
      expect(t.id).toMatch(urlSafe);
    });
  });

  it('all api-type tools have an endpoint and successMsg', () => {
    TOOLS.filter((t) => t.type === 'api').forEach((t) => {
      expect(t.endpoint, `${t.id} missing endpoint`).toBeTruthy();
      expect(t.successMsg, `${t.id} missing successMsg`).toBeTruthy();
    });
  });
});

describe('TOOL_GROUPS', () => {
  it('has 14 groups', () => {
    expect(TOOL_GROUPS).toHaveLength(14);
  });

  it('every group has id and label', () => {
    TOOL_GROUPS.forEach((g) => {
      expect(typeof g.id).toBe('string');
      expect(typeof g.label).toBe('string');
    });
  });
});

describe('USE_CASE_TABS', () => {
  it('has 7 tabs', () => {
    expect(USE_CASE_TABS).toHaveLength(7);
  });
});

describe('getToolBySlug', () => {
  it('finds a known tool', () => {
    const tool = getToolBySlug('alternating_case');
    expect(tool).toBeDefined();
    expect(tool?.label).toBe('aLtErNaTiNg');
  });

  it('returns undefined for an unknown slug', () => {
    expect(getToolBySlug('does_not_exist')).toBeUndefined();
  });
});

describe('getAllSlugs', () => {
  it('returns 254 slugs', () => {
    expect(getAllSlugs()).toHaveLength(254);
  });

  it('slugs are unique strings', () => {
    const slugs = getAllSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('getToolsByGroup', () => {
  it('returns only tools from the specified group', () => {
    const caseTools = getToolsByGroup('case');
    expect(caseTools.length).toBeGreaterThan(0);
    caseTools.forEach((t) => expect(t.group).toBe('case'));
  });

  it('returns empty array for unknown group', () => {
    expect(getToolsByGroup('nonexistent')).toEqual([]);
  });
});

describe('getAllGroups', () => {
  it('returns 14 unique group ids', () => {
    const groups = getAllGroups();
    expect(new Set(groups).size).toBe(14);
  });
});
