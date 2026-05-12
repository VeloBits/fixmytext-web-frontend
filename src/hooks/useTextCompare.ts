import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';

type DiffType = 'same' | 'added' | 'removed';

interface DiffEntry {
  type: DiffType;
  line: string;
}

interface UseTextCompareReturn {
  compareText: string;
  setCompareText: Dispatch<SetStateAction<string>>;
  diffResult: DiffEntry[] | null;
  setDiffResult: Dispatch<SetStateAction<DiffEntry[] | null>>;
  handleCompare: () => void;
}

export default function useTextCompare(
  text: string,
  showAlert: (msg: string, variant: string) => void
): UseTextCompareReturn {
  const [compareText, setCompareText] = useState('');
  const [diffResult, setDiffResult] = useState<DiffEntry[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lineDiff = (aLines: string[], bLines: string[]): DiffEntry[] => {
    const m = aLines.length,
      n = bLines.length;
    const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i]![j] =
          aLines[i - 1] === bLines[j - 1]
            ? dp[i - 1]![j - 1]! + 1
            : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    const result: DiffEntry[] = [];
    let i = m,
      j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
        result.unshift({ type: 'same', line: aLines[i - 1]! });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
        result.unshift({ type: 'added', line: bLines[j - 1]! });
        j--;
      } else {
        result.unshift({ type: 'removed', line: aLines[i - 1]! });
        i--;
      }
    }
    return result;
  };

  const runCompare = useCallback((): void => {
    if (!text || !compareText) return;
    const aLines = text.split('\n'),
      bLines = compareText.split('\n');
    if (aLines.length + bLines.length > 2000) return;
    setDiffResult(lineDiff(aLines, bLines));
  }, [text, compareText]);

  // Auto-compare after 3 seconds of inactivity when both texts are available
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text || !compareText) return;
    timerRef.current = setTimeout(runCompare, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, compareText, runCompare]);

  const handleCompare = (): void => {
    if (!text || !compareText) {
      showAlert('Both text fields must have content', 'danger');
      return;
    }
    const aLines = text.split('\n'),
      bLines = compareText.split('\n');
    if (aLines.length + bLines.length > 2000) {
      showAlert('Text too large to diff (max ~1000 lines each)', 'danger');
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setDiffResult(lineDiff(aLines, bLines));
  };

  return {
    compareText,
    setCompareText,
    diffResult,
    setDiffResult,
    handleCompare,
  };
}
