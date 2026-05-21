import { TOOLS } from './tools';
import type { ToolDefinition } from './types';

/** Return a tool by its id, or undefined if not found. */
export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === slug);
}

/** Return all tool ids. Useful for Next.js generateStaticParams(). */
export function getAllSlugs(): string[] {
  return TOOLS.map((t) => t.id);
}

/** Return all tools belonging to a group. */
export function getToolsByGroup(group: string): ToolDefinition[] {
  return TOOLS.filter((t) => t.group === group);
}

/** Return all unique group ids present in the registry. */
export function getAllGroups(): string[] {
  return [...new Set(TOOLS.map((t) => t.group))];
}
