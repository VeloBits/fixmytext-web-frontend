import { describe, it, expect } from 'vitest';
import { TOOLS, TOOL_GROUPS, USE_CASE_TABS, STARTER_KITS } from '../src/tools';
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

describe('STARTER_KITS', () => {
  it('every toolIds entry references a known tool', () => {
    const toolIds = new Set(TOOLS.map((t) => t.id));
    for (const kit of STARTER_KITS) {
      for (const id of kit.toolIds) {
        expect(toolIds.has(id), `${kit.id}: unknown kit tool '${id}'`).toBe(true);
      }
    }
  });

  it('every defaultTab is a valid use-case tab', () => {
    const tabIds = new Set<string>(USE_CASE_TABS.map((t) => t.id));
    for (const kit of STARTER_KITS) {
      expect(tabIds.has(kit.defaultTab), `${kit.id}: unknown tab '${kit.defaultTab}'`).toBe(true);
    }
  });

  it('every kit except explorer seeds a named, non-empty group', () => {
    for (const kit of STARTER_KITS) {
      if (kit.id === 'explorer') {
        // "Just Exploring" promises the whole catalog — creates no group
        expect(kit.toolIds).toEqual([]);
        expect(kit.groupName).toBe('');
      } else {
        expect(kit.toolIds.length, `${kit.id} seeds no tools`).toBeGreaterThan(0);
        expect(kit.groupName.length, `${kit.id} has no group name`).toBeGreaterThan(0);
      }
    }
  });

  it('kit ids and group names are unique', () => {
    expect(new Set(STARTER_KITS.map((k) => k.id)).size).toBe(STARTER_KITS.length);
    const names = STARTER_KITS.map((k) => k.groupName).filter(Boolean);
    expect(new Set(names).size).toBe(names.length);
  });

  it('tool ids are unique within each kit', () => {
    for (const kit of STARTER_KITS) {
      expect(new Set(kit.toolIds).size, `${kit.id} has duplicate ids`).toBe(kit.toolIds.length);
    }
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
