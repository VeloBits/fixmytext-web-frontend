import { useMemo } from 'react';

/* ── Password strength calculator ── */
function getStrength(len, opts) {
  let poolSize = 0;
  if (opts.upper) poolSize += 26;
  if (opts.lower) poolSize += 26;
  if (opts.numbers) poolSize += 10;
  if (opts.symbols) poolSize += 26;
  if (poolSize === 0) return { label: 'None', color: 'var(--text-3)', pct: 0 };
  const entropy = len * Math.log2(poolSize);
  if (entropy < 28) return { label: 'Very Weak', color: 'var(--rose)', pct: 15 };
  if (entropy < 36) return { label: 'Weak', color: '#E57373', pct: 30 };
  if (entropy < 60) return { label: 'Fair', color: 'var(--amber)', pct: 50 };
  if (entropy < 80) return { label: 'Strong', color: 'var(--emerald)', pct: 75 };
  return { label: 'Very Strong', color: '#4CAF50', pct: 100 };
}

export function RandomTextDrawer({
  textGenType,
  setTextGenType,
  textGenCount,
  setTextGenCount,
  handleGenerateText,
  onResult,
}) {
  const presets = [
    { label: '10', val: 10 },
    { label: '50', val: 50 },
    { label: '100', val: 100 },
    { label: '500', val: 500 },
  ];
  const handleClick = () => {
    const result = handleGenerateText();
    if (result && onResult) onResult(result);
  };
  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field tu-fr-field--segmented">
          <span className="tu-fr-seg-label">Type</span>
          {['words', 'sentences', 'paragraphs'].map((type) => (
            <button
              key={type}
              className={`tu-fr-seg${textGenType === type ? ' tu-fr-seg--on' : ''}`}
              onClick={() => setTextGenType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="tu-fr-row">
        <div className="tu-fr-field tu-fr-field--segmented">
          <span className="tu-fr-seg-label">Count</span>
          {presets.map((p) => (
            <button
              key={p.val}
              className={`tu-fr-seg${textGenCount === p.val ? ' tu-fr-seg--on' : ''}`}
              onClick={() => setTextGenCount(p.val)}
            >
              {p.label}
            </button>
          ))}
          <input
            type="number"
            className="tu-fr-num"
            min="1"
            max="10000"
            value={textGenCount}
            onChange={(e) =>
              setTextGenCount(Math.min(10000, Math.max(1, Number(e.target.value))))
            }
          />
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action tu-fr-action--text"
            onClick={handleClick}
            title="Generate"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

export function PasswordDrawer({
  pwdLen,
  setPwdLen,
  pwdOpts,
  setPwdOpts,
  handleGeneratePassword,
  onResult,
}) {
  const charsets = [
    ['upper', 'A–Z', 'Uppercase letters (A-Z)', 26],
    ['lower', 'a–z', 'Lowercase letters (a-z)', 26],
    ['numbers', '0–9', 'Digits (0-9)', 10],
    ['symbols', '!@#', 'Special characters (!@#...)', 26],
  ];

  const strength = useMemo(() => getStrength(pwdLen, pwdOpts), [pwdLen, pwdOpts]);

  const poolSize = charsets.reduce((n, [k, , , sz]) => (pwdOpts[k] ? n + sz : n), 0);
  const entropy = poolSize > 0 ? Math.round(pwdLen * Math.log2(poolSize)) : 0;

  const handleGen = () => {
    const pwd = handleGeneratePassword();
    if (pwd && onResult) onResult(pwd);
  };

  const presetLengths = [8, 16, 24, 32, 48, 64];

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field tu-fr-field--segmented">
          <span className="tu-fr-seg-label">Length</span>
          <input
            type="range"
            className="tu-fr-slider"
            min="4"
            max="128"
            value={pwdLen}
            onChange={(e) => setPwdLen(Number(e.target.value))}
          />
          <input
            type="number"
            className="tu-fr-num"
            min="4"
            max="128"
            value={pwdLen}
            onChange={(e) => setPwdLen(Math.min(128, Math.max(4, Number(e.target.value))))}
          />
          {presetLengths.map((n) => (
            <button
              key={n}
              className={`tu-fr-seg${pwdLen === n ? ' tu-fr-seg--on' : ''}`}
              onClick={() => setPwdLen(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="tu-fr-row">
        <div className="tu-fr-field tu-fr-field--segmented">
          <span className="tu-fr-seg-label">Include</span>
          {charsets.map(([k, lbl, tip]) => (
            <button
              key={k}
              className={`tu-fr-seg${pwdOpts[k] ? ' tu-fr-seg--on' : ''}`}
              onClick={() => setPwdOpts((o) => ({ ...o, [k]: !o[k] }))}
              title={tip}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action tu-fr-action--text"
            onClick={handleGen}
            title="Generate Password"
          >
            Generate
          </button>
        </div>
      </div>
      <div className="tu-fr-status">
        <div
          className="tu-fr-strength-bar"
          style={{
            background: 'var(--bg-2)',
            height: '4px',
            width: '80px',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${strength.pct}%`,
              height: '100%',
              background: strength.color,
              transition: 'width 0.2s',
            }}
          />
        </div>
        <span style={{ color: strength.color, fontWeight: 600 }}>{strength.label}</span>
        <span>· {entropy} bits</span>
        <span>· {poolSize} char pool</span>
      </div>
    </div>
  );
}
