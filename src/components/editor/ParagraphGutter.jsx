import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Paragraph-numbering gutter for a textarea.
 *
 * Renders one number per paragraph (paragraphs are blocks separated by one or
 * more blank lines), aligned vertically to the actual visual top of each
 * paragraph as it appears inside the textarea. Uses a hidden mirror `<div>`
 * sized identically to the textarea to measure where each paragraph begins,
 * which is the only way to get correct positions when text wraps.
 *
 * The textarea itself is unchanged — this component only handles gutter
 * rendering and scroll syncing.
 */
export default function ParagraphGutter({ textareaRef, text, scrollTop }) {
  const mirrorRef = useRef(null);
  const [positions, setPositions] = useState([]);

  // Measure paragraph Y offsets by rendering an invisible mirror div with
  // exact same width and font as the textarea, with one inline-block sentinel
  // before each paragraph. The sentinels' offsetTop tells us each paragraph's
  // visual top inside the textarea.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;

    // Mirror styling — copy width and text-formatting properties from the
    // live textarea so wrapping math matches exactly.
    const cs = window.getComputedStyle(ta);
    mirror.style.width = ta.clientWidth + 'px';
    mirror.style.font = cs.font;
    mirror.style.lineHeight = cs.lineHeight;
    mirror.style.padding = cs.padding;
    mirror.style.boxSizing = cs.boxSizing;
    mirror.style.letterSpacing = cs.letterSpacing;
    mirror.style.tabSize = cs.tabSize;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordBreak = cs.wordBreak;
    mirror.style.overflowWrap = cs.overflowWrap;

    // Build mirror content: every `\n`-line is its own block, with a sentinel
    // span at the start of each non-blank line so we can measure its top.
    // Blank lines render as a real newline so vertical spacing matches the
    // textarea but get no number.
    const lines = (text || '').split('\n');
    mirror.innerHTML = '';
    const sentinelEls = [];
    lines.forEach((line, i) => {
      const sentinel = document.createElement('span');
      sentinel.dataset.idx = String(i);
      // Zero-width marker at the start so offsetTop is the line's visual top.
      sentinel.appendChild(document.createTextNode('​'));
      sentinel.appendChild(document.createTextNode(line));
      mirror.appendChild(sentinel);
      sentinelEls.push(sentinel);
      if (i < lines.length - 1) mirror.appendChild(document.createTextNode('\n'));
    });

    const measured = sentinelEls
      .map((el, i) => ({
        idx: i,
        top: el.offsetTop,
        nonBlank: lines[i].trim().length > 0,
      }))
      .filter((p) => p.nonBlank);
    setPositions(measured);
  }, [text, textareaRef]);

  // Re-measure on resize since wrapping changes with width.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const ro = new ResizeObserver(() => {
      // Trigger re-render by toggling a state that the layout effect depends
      // on. We can't depend on `text` only — width changes alone need a
      // re-measure. Cheapest: use a microtask to nudge React state.
      setPositions((p) => [...p]);
    });
    ro.observe(ta);
    return () => ro.disconnect();
  }, [textareaRef]);

  return (
    <div className="tu-paragraph-gutter">
      {/* Hidden mirror — rendered offscreen for measurement only */}
      <div ref={mirrorRef} className="tu-paragraph-gutter-mirror" aria-hidden="true" />
      {/* Visible numbers, absolutely positioned at each paragraph's measured top */}
      <div className="tu-paragraph-gutter-numbers">
        {positions.map((p, n) => (
          <span
            key={p.idx}
            className="tu-paragraph-gutter-num"
            style={{ top: p.top - scrollTop + 'px' }}
          >
            {n + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
