# @velobits/tools-registry

Single source of truth for all 254 FixMyText tool definitions.

Used by:
- `apps/web` — the Vite editor dispatches tools from this registry
- `apps/content` — Next.js generates 254 SSG pages via `getAllSlugs()`

## Usage

```ts
import { TOOLS, getToolBySlug, getAllSlugs, getToolsByGroup } from '@velobits/tools-registry';

// All tools
const allTools = TOOLS; // 254 ToolDefinition objects

// For Next.js generateStaticParams
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

// Look up a specific tool
const md5 = getToolBySlug('md5_hash');

// Tools in a category
const caseTools = getToolsByGroup('case');
```

## Tool shape

```ts
interface ToolDefinition {
  id: string;        // unique snake_case slug
  label: string;     // display name
  description: string;
  icon: string;      // 2-4 char icon text
  color: ToolColor;
  group: ToolGroup;  // one of 14 categories
  tabs: ToolTab[];
  type: 'api' | 'ai' | 'local' | 'drawer' | 'select';
  keywords: string[];
  endpoint?: string; // present when type === 'api' | 'ai'
  successMsg?: string;
  // ... select/drawer specific fields
}
```
