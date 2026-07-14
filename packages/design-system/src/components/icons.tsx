import type { ReactNode, SVGProps } from 'react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Width and height in px — icons are square. */
  size?: number | string;
}

/**
 * Stroke-based icon set (Feather/Lucide-style, 24×24 grid, currentColor).
 * Replaces emoji glyphs so icons render consistently across platforms and
 * inherit text color. Icons are decorative by default (aria-hidden) — pass
 * `aria-hidden={undefined}` plus an `aria-label` for semantic use.
 */
function createIcon(displayName: string, children: ReactNode) {
  function Icon({ size = 16, ...props }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {children}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

export const AlertTriangleIcon = createIcon(
  'AlertTriangleIcon',
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>
);

export const ArrowRightIcon = createIcon(
  'ArrowRightIcon',
  <>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </>
);

export const BarChart3Icon = createIcon(
  'BarChart3Icon',
  <>
    <path d="M3 3v18h18" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </>
);

export const BotIcon = createIcon(
  'BotIcon',
  <>
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </>
);

export const CheckIcon = createIcon('CheckIcon', <path d="M20 6 9 17l-5-5" />);

export const ChevronDownIcon = createIcon('ChevronDownIcon', <path d="m6 9 6 6 6-6" />);

export const ChevronUpIcon = createIcon('ChevronUpIcon', <path d="m18 15-6-6-6 6" />);

export const ClockIcon = createIcon(
  'ClockIcon',
  <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>
);

export const CodeIcon = createIcon(
  'CodeIcon',
  <>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </>
);

export const CommandIcon = createIcon(
  'CommandIcon',
  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
);

export const CornerUpLeftIcon = createIcon(
  'CornerUpLeftIcon',
  <>
    <polyline points="9 14 4 9 9 4" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </>
);

export const CornerUpRightIcon = createIcon(
  'CornerUpRightIcon',
  <>
    <polyline points="15 14 20 9 15 4" />
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </>
);

export const DownloadIcon = createIcon(
  'DownloadIcon',
  <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </>
);

export const DropletIcon = createIcon(
  'DropletIcon',
  <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
);

export const FileTextIcon = createIcon(
  'FileTextIcon',
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </>
);

export const FlameIcon = createIcon(
  'FlameIcon',
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
);

export const Gamepad2Icon = createIcon(
  'Gamepad2Icon',
  <>
    <line x1="6" x2="10" y1="11" y2="11" />
    <line x1="8" x2="8" y1="9" y2="13" />
    <line x1="15" x2="15.01" y1="12" y2="12" />
    <line x1="18" x2="18.01" y1="10" y2="10" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  </>
);

export const GemIcon = createIcon(
  'GemIcon',
  <>
    <path d="M6 3h12l4 6-10 13L2 9Z" />
    <path d="M11 3 8 9l4 13 4-13-3-6" />
    <path d="M2 9h20" />
  </>
);

export const GiftIcon = createIcon(
  'GiftIcon',
  <>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
  </>
);

export const GraduationCapIcon = createIcon(
  'GraduationCapIcon',
  <>
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
    <path d="M22 10v6" />
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
  </>
);

export const HeartIcon = createIcon(
  'HeartIcon',
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
);

export const HistoryIcon = createIcon(
  'HistoryIcon',
  <>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </>
);

export const KeyboardIcon = createIcon(
  'KeyboardIcon',
  <>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="M6 8h.01" />
    <path d="M10 8h.01" />
    <path d="M14 8h.01" />
    <path d="M18 8h.01" />
    <path d="M8 12h.01" />
    <path d="M12 12h.01" />
    <path d="M16 12h.01" />
    <path d="M7 16h10" />
  </>
);

export const LayoutGridIcon = createIcon(
  'LayoutGridIcon',
  <>
    <rect width="7" height="7" x="3" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="3" rx="1" />
    <rect width="7" height="7" x="14" y="14" rx="1" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
  </>
);

export const LayoutTemplateIcon = createIcon(
  'LayoutTemplateIcon',
  <>
    <rect width="18" height="7" x="3" y="3" rx="1" />
    <rect width="9" height="7" x="3" y="14" rx="1" />
    <rect width="5" height="7" x="16" y="14" rx="1" />
  </>
);

export const LightbulbIcon = createIcon(
  'LightbulbIcon',
  <>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </>
);

export const LinkIcon = createIcon(
  'LinkIcon',
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>
);

export const LockIcon = createIcon(
  'LockIcon',
  <>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>
);

export const LockOpenIcon = createIcon(
  'LockOpenIcon',
  <>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </>
);

export const LogInIcon = createIcon(
  'LogInIcon',
  <>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" x2="3" y1="12" y2="12" />
  </>
);

export const LogOutIcon = createIcon(
  'LogOutIcon',
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </>
);

export const MenuIcon = createIcon(
  'MenuIcon',
  <>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </>
);

export const MoonIcon = createIcon('MoonIcon', <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />);

export const PenLineIcon = createIcon(
  'PenLineIcon',
  <>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </>
);

export const PlayIcon = createIcon('PlayIcon', <polygon points="6 3 20 12 6 21 6 3" />);

export const RotateCcwIcon = createIcon(
  'RotateCcwIcon',
  <>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </>
);

export const ShieldIcon = createIcon(
  'ShieldIcon',
  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
);

export const SmartphoneIcon = createIcon(
  'SmartphoneIcon',
  <>
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </>
);

export const SmileIcon = createIcon(
  'SmileIcon',
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" x2="9.01" y1="9" y2="9" />
    <line x1="15" x2="15.01" y1="9" y2="9" />
  </>
);

export const SparklesIcon = createIcon(
  'SparklesIcon',
  <>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </>
);

export const StarIcon = createIcon(
  'StarIcon',
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
);

export const SunIcon = createIcon(
  'SunIcon',
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </>
);

export const TargetIcon = createIcon(
  'TargetIcon',
  <>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </>
);

export const TrendingUpIcon = createIcon(
  'TrendingUpIcon',
  <>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </>
);

export const TrophyIcon = createIcon(
  'TrophyIcon',
  <>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </>
);

export const UserIcon = createIcon(
  'UserIcon',
  <>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>
);

export const WrenchIcon = createIcon(
  'WrenchIcon',
  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
);

export const XIcon = createIcon(
  'XIcon',
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>
);

export const ZapIcon = createIcon(
  'ZapIcon',
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
);
