import { SIDEBAR_VIEWS, TOOL_GROUPS } from '@velobits/app-core/constants/tools';
import type { SidebarChip } from '@velobits/app-core/types/tools';
import type { ToolGroupView } from '@velobits/app-core/types/context';

/**
 * Display label for a chip — identical to the panel section headers by
 * design. Returns null for a dangling custom_group chip (its group is gone or
 * not hydrated yet); callers skip rendering those.
 */
export function chipLabel(chip: SidebarChip, customGroups: ToolGroupView[]): string | null {
  if (chip.type === 'view') {
    return SIDEBAR_VIEWS.find((v) => v.id === chip.id)?.label ?? null;
  }
  if (chip.type === 'group') {
    return TOOL_GROUPS.find((g) => g.id === chip.id)?.label ?? null;
  }
  return customGroups.find((g) => g.id === chip.id)?.name ?? null;
}

/** Two-letter monogram for group chips on the icon-only activity bar. */
export function chipInitials(label: string): string {
  const words = label.split(/[\s/&]+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0] ?? ''}${words[1]![0] ?? ''}`.toUpperCase();
  }
  return label.slice(0, 2);
}
