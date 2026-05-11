/**
 * Custom SVG icons used on the pricing and subscription pages.
 * Extracted for reusability and to reduce PricingPage.jsx size.
 */

/**
 * Base SVG icon wrapper. Renders a path or children inside a standardized SVG element.
 * @param {object} props - SVG attributes plus optional `d` for a single path.
 */
const I = ({
  d,
  size = 24,
  stroke = 'currentColor',
  fill = 'none',
  vb = '0 0 24 24',
  children,
}) => (
  <svg
    width={size}
    height={size}
    viewBox={vb}
    fill={fill}
    stroke={stroke}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d ? <path d={d} /> : children}
  </svg>
);

/**
 * Numeric badge icon rendered as a rounded rectangle with a centered number.
 * @param {object} props
 * @param {number} props.n - The number to display.
 * @param {number} [props.size=24] - Icon size in pixels.
 */
export const NumIcon = ({ n, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="4"
      stroke="#007ACC"
      strokeWidth="2"
      fill="#007ACC22"
    />
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fill="#007ACC"
      fontSize={n.toString().length > 1 ? '11' : '14'}
      fontWeight="bold"
      fontFamily="monospace"
    >
      {n}
    </text>
  </svg>
);

/** Water droplet icon. */
export const DropletIcon = (p) => <I {...p} d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />;

/** Sun icon with rays. */
export const SunIcon = (p) => (
  <I {...p}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </I>
);

/** Running person icon. */
export const RunnerIcon = (p) => (
  <I {...p}>
    <circle cx="17" cy="4" r="2" />
    <path d="M14 7l-2 2-3 1-1 4 3 2v4" />
    <path d="M9 9L6 12" />
    <path d="M12 9l4 4-2 4" />
  </I>
);

/** Calendar icon. */
export const CalendarIcon = (p) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </I>
);

/** Trophy icon. */
export const TrophyIcon = (p) => (
  <I {...p}>
    <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
    <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
    <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" />
    <path d="M9 21h6" />
    <path d="M12 16v5" />
  </I>
);

/** Wrench icon. */
export const WrenchIcon = (p) => (
  <I
    {...p}
    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
  />
);

/** "2x" badge icon. */
export const TwoIcon = (p) => (
  <I {...p}>
    <rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="4"
      stroke="#007ACC"
      strokeWidth="2"
      fill="#007ACC22"
    />
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fill="#007ACC"
      fontSize="11"
      fontWeight="bold"
      fontFamily="monospace"
    >
      2x
    </text>
  </I>
);

/** Star icon. */
export const StarIcon = (p) => (
  <I
    {...p}
    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
  />
);

/** Flag icon. */
export const FlagIcon = (p) => (
  <I {...p}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </I>
);

/** Clipboard icon. */
export const ClipboardIcon = (p) => (
  <I {...p}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
  </I>
);

/** Ruler / triangle icon. */
export const RulerIcon = (p) => (
  <I {...p}>
    <path d="M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z" />
    <line x1="12" y1="9" x2="12" y2="13" />
  </I>
);

/** Leaf icon. */
export const LeafIcon = (p) => (
  <I {...p}>
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-3.8 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </I>
);

/** Crown icon. */
export const CrownIcon = (p) => (
  <I {...p}>
    <path d="M2 20h20l-2-12-5 5-3-7-3 7-5-5-2 12z" />
    <rect x="2" y="20" width="20" height="2" rx="1" />
  </I>
);

/** Jar icon. */
export const JarIcon = (p) => (
  <I {...p}>
    <path d="M8 3h8v2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V3z" />
    <rect x="6" y="7" width="12" height="13" rx="2" />
    <line x1="6" y1="11" x2="18" y2="11" />
  </I>
);

/** Bucket icon. */
export const BucketIcon = (p) => (
  <I {...p}>
    <path d="M5 7h14l-1.5 13a2 2 0 0 1-2 1.75h-7A2 2 0 0 1 6.5 20L5 7z" />
    <path d="M4 7c0-2 3.6-4 8-4s8 2 8 4" />
  </I>
);

/** Barrel icon. */
export const BarrelIcon = (p) => (
  <I {...p}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
    <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
  </I>
);

/** Gift box icon. */
export const GiftIcon = (p) => (
  <I {...p}>
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </I>
);
