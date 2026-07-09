import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SpinHistoryItem {
  spin_date: string;
  reward_type: string;
  reward_ref: string | number;
  iso_week?: string;
}

export interface SpinResult {
  reward_type?: string;
  amount?: number;
  pass_name?: string;
  pass_id?: string;
  message?: string;
  error?: string;
}

export interface SpinWheelSubscription {
  handleSpin?: () => Promise<SpinResult | void>;
  spinLoading?: boolean;
  spinHistory?: SpinHistoryItem[];
}

export interface SpinWheelProps {
  subscription: SpinWheelSubscription | null;
  isAuthenticated: boolean;
}

const WHEEL_SEGMENTS = [
  { label: '1 Credit', color: '#4a9eff', icon: '💧' },
  { label: '3 Credits', color: '#7c5cff', icon: '💎' },
  { label: 'Quick Fix', color: '#ff6b6b', icon: '🔧' },
  { label: 'Tinkerer', color: '#ffa726', icon: '⚡' },
  { label: 'Day Single', color: '#66bb6a', icon: '🎯' },
  { label: 'Day Triple', color: '#ec407a', icon: '🌟' },
];

const SEGMENT_ARC = 360 / WHEEL_SEGMENTS.length; // 60 degrees each

const CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '⭐', '🌟', '💫', '🏆', '🔥'];

interface ConfettiParticleProps {
  index: number;
}

function ConfettiParticle({ index }: ConfettiParticleProps) {
  const emoji = CONFETTI_EMOJIS[index % CONFETTI_EMOJIS.length];
  const { left, delay, duration, size } = useMemo(
    () => ({
      left: 10 + Math.random() * 80,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1.5,
      size: 0.8 + Math.random() * 0.7,
    }),
    []
  );

  return (
    <motion.span
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: 0,
        fontSize: `${size}rem`,
        pointerEvents: 'none',
        zIndex: 10,
      }}
      initial={{ opacity: 0, y: -20, rotate: 0 }}
      animate={{ opacity: [0, 1, 1, 0], y: [0, 80, 180, 260], rotate: [0, 180, 360] }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {emoji}
    </motion.span>
  );
}

function formatRewardLabel(item: SpinHistoryItem): string {
  if (item.reward_type === 'credits')
    return `${item.reward_ref} Credit${Number(item.reward_ref) > 1 ? 's' : ''}`;
  if (item.reward_type === 'pass') return String(item.reward_ref || 'Pass');
  return String(item.reward_ref || 'Reward');
}

function formatSpinDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function hasSpunThisWeek(spinHistory: SpinHistoryItem[] | undefined): boolean {
  if (!spinHistory || spinHistory.length === 0) return false;
  const now = new Date();
  // ISO week calculation: get the Monday of the current week
  const day = now.getDay() || 7; // convert Sunday (0) to 7
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);

  const latestSpin = new Date(spinHistory[0]!.spin_date);
  return latestSpin >= monday;
}

function resultLabel(result: SpinResult | null): string {
  if (!result) return '';
  return (
    result.message ||
    (result.reward_type === 'credits'
      ? `You won ${result.amount} credit${(result.amount ?? 0) > 1 ? 's' : ''}!`
      : `You won a ${result.pass_name || 'pass'}!`)
  );
}

/** Build an SVG path for a pie segment */
function segmentPath(index: number, radius: number): string {
  const startAngle = (index * SEGMENT_ARC - 90) * (Math.PI / 180);
  const endAngle = ((index + 1) * SEGMENT_ARC - 90) * (Math.PI / 180);
  const x1 = radius + radius * Math.cos(startAngle);
  const y1 = radius + radius * Math.sin(startAngle);
  const x2 = radius + radius * Math.cos(endAngle);
  const y2 = radius + radius * Math.sin(endAngle);
  return `M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`;
}

/** Label position at the midpoint of a segment */
function labelPos(index: number, radius: number): { x: number; y: number; rotate: number } {
  const midAngle = ((index + 0.5) * SEGMENT_ARC - 90) * (Math.PI / 180);
  const r = radius * 0.62;
  return {
    x: radius + r * Math.cos(midAngle),
    y: radius + r * Math.sin(midAngle),
    rotate: (index + 0.5) * SEGMENT_ARC,
  };
}

// Map API reward result to a WHEEL_SEGMENTS index
function rewardToSegmentIndex(res: SpinResult | null): number {
  if (!res) return 0;
  if (res.reward_type === 'credits') {
    return (res.amount ?? 0) >= 3 ? 1 : 0; // 3 Credits or 1 Credit
  }
  if (res.reward_type === 'pass') {
    const passMap: Record<string, number> = {
      quick_fix: 2,
      tinkerer: 3,
      day_single: 4,
      day_triple: 5,
    };
    return (res.pass_id != null ? passMap[res.pass_id] : undefined) ?? 2;
  }
  return 0;
}

export default function SpinWheel({ subscription, isAuthenticated }: SpinWheelProps) {
  const { handleSpin, spinLoading, spinHistory } = subscription || {};

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const alreadySpun = useMemo(() => hasSpunThisWeek(spinHistory), [spinHistory]);

  const disabled = !isAuthenticated || spinning || spinLoading || alreadySpun;

  const onSpin = useCallback(async () => {
    if (disabled || !handleSpin) return;
    setSpinning(true);
    setResult(null);
    setError(null);

    // Call the API and wait for animation in parallel
    const [res] = await Promise.all([
      handleSpin() as Promise<SpinResult>,
      new Promise<void>((resolve) => setTimeout(resolve, 4000)), // matches CSS transition duration
    ]);

    // Compute rotation to land on the correct segment
    const segIndex = rewardToSegmentIndex(res);
    const segCenter = segIndex * SEGMENT_ARC + SEGMENT_ARC / 2;
    const extraRotations = 3 + Math.floor(Math.random() * 6);
    // Wheel rotates clockwise; pointer is at top (0deg). To land pointer on segment,
    // we want (360 - segCenter) as the final offset within one full rotation.
    const targetOffset = (360 - segCenter + 360) % 360;
    const newRotation = rotation + extraRotations * 360 + targetOffset;
    setRotation(newRotation);

    // Wait for the CSS transition to finish after setting rotation
    await new Promise((resolve) => setTimeout(resolve, 4200));

    if (!isMounted.current) return;

    setSpinning(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setResult(res);
    }
  }, [disabled, handleSpin, rotation]);

  const dismissResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const RADIUS = 140;
  const SIZE = RADIUS * 2;

  return (
    <div
      className="tu-spin-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '1.5rem 0',
      }}
    >
      {/* Heading */}
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Weekly Reward Spin</h3>
        <p style={{ margin: '0.25rem 0 0', opacity: 0.7, fontSize: '0.85rem' }}>
          Spin the wheel once per week for a free reward!
        </p>
      </div>

      {/* Wheel area */}
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        {/* Pointer / indicator triangle at top */}
        <div
          style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: '18px solid var(--tu-accent, #7c5cff)',
            zIndex: 5,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        />

        {/* Spinning wheel */}
        <div
          className={`tu-spin-wheel ${alreadySpun ? 'tu-spin-disabled' : ''}`}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: '50%',
            overflow: 'hidden',
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 0 0 4px rgba(255,255,255,0.15)',
            opacity: alreadySpun ? 0.45 : 1,
            filter: alreadySpun ? 'grayscale(0.6)' : 'none',
          }}
        >
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            {WHEEL_SEGMENTS.map((seg, i) => {
              const pos = labelPos(i, RADIUS);
              return (
                <g key={i} className="tu-spin-segment">
                  <path
                    d={segmentPath(i, RADIUS)}
                    fill={seg.color}
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="2"
                  />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${pos.rotate}, ${pos.x}, ${pos.y})`}
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      fill: '#fff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    <tspan x={pos.x} dy="-0.5em">
                      {seg.icon}
                    </tspan>
                    <tspan x={pos.x} dy="1.2em">
                      {seg.label}
                    </tspan>
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Center button */}
        <button
          className="tu-spin-btn"
          onClick={onSpin}
          disabled={disabled}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.3)',
            background: disabled
              ? 'linear-gradient(135deg, #666, #888)'
              : 'linear-gradient(135deg, #7c5cff, #4a9eff)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            zIndex: 3,
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            letterSpacing: '0.05em',
            transition: 'background 0.2s',
          }}
        >
          {spinning || spinLoading ? '...' : 'SPIN'}
        </button>
      </div>

      {/* Not authenticated message */}
      {!isAuthenticated && (
        <p
          style={{
            color: 'var(--tu-warning, #ffa726)',
            fontWeight: 500,
            fontSize: '0.9rem',
            margin: 0,
          }}
        >
          Sign in to spin!
        </p>
      )}

      {/* Already spun message */}
      {isAuthenticated && alreadySpun && !result && (
        <p style={{ opacity: 0.65, fontWeight: 500, fontSize: '0.9rem', margin: 0 }}>
          Come back next week!
        </p>
      )}

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ color: '#ff6b6b', fontWeight: 500, fontSize: '0.9rem', margin: 0 }}
        >
          {error}
        </motion.p>
      )}

      {/* Result card with confetti */}
      <AnimatePresence>
        {result && (
          <motion.div
            className="tu-spin-result"
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={dismissResult}
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(124,92,255,0.15), rgba(74,158,255,0.15))',
              border: '1px solid rgba(124,92,255,0.3)',
              borderRadius: '1rem',
              padding: '1.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              minWidth: 240,
            }}
          >
            {/* Confetti burst */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
              }}
            >
              {Array.from({ length: 16 }, (_, i) => (
                <ConfettiParticle key={i} index={i} />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}
            >
              {result.reward_type === 'credits' ? '💎' : '🎁'}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              style={{ fontWeight: 600, fontSize: '1.1rem', margin: '0 0 0.25rem' }}
            >
              {resultLabel(result)}
            </motion.p>

            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.5 }}
              style={{ fontSize: '0.75rem' }}
            >
              Tap to dismiss
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Spins history */}
      {spinHistory && spinHistory.length > 0 && (
        <div
          className="tu-spin-history"
          style={{
            width: '100%',
            maxWidth: 340,
          }}
        >
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 600, opacity: 0.8 }}>
            Recent Spins
          </h4>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            {spinHistory.slice(0, 8).map((item, i) => (
              <div
                key={item.iso_week || i}
                className="tu-spin-history-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(255,255,255,0.04)',
                  fontSize: '0.82rem',
                }}
              >
                <span style={{ opacity: 0.65 }}>{formatSpinDate(item.spin_date)}</span>
                <span style={{ fontWeight: 500 }}>{formatRewardLabel(item)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
