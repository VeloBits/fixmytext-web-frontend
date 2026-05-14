import { useState, type Dispatch, type SetStateAction } from 'react';

interface RegexMatch {
  match: string;
  index: number;
  groups: string[];
}

interface RegexResult {
  matches: RegexMatch[];
  total: number;
}

interface UseRegexTesterReturn {
  regexPattern: string;
  setRegexPattern: Dispatch<SetStateAction<string>>;
  regexFlags: string;
  setRegexFlags: Dispatch<SetStateAction<string>>;
  regexResult: RegexResult | null;
  setRegexResult: Dispatch<SetStateAction<RegexResult | null>>;
  handleRegexTest: () => void;
}

export default function useRegexTester(
  text: string,
  showAlert: (msg: string, variant: string) => void
): UseRegexTesterReturn {
  const [regexPattern, setRegexPattern] = useState('');
  const [regexFlags, setRegexFlags] = useState('g');
  const [regexResult, setRegexResult] = useState<RegexResult | null>(null);

  const handleRegexTest = (): void => {
    if (!regexPattern) {
      showAlert('Enter a regex pattern', 'danger');
      return;
    }
    if (!text) {
      showAlert('Enter some text to test against', 'danger');
      return;
    }
    try {
      // eslint-disable-next-line security/detect-non-literal-regexp -- intentional: this is a regex tester tool; user input is the regex pattern
      const re = new RegExp(regexPattern, regexFlags);
      const matches: RegexMatch[] = [];
      let m: RegExpExecArray | null;
      if (regexFlags.includes('g')) {
        while ((m = re.exec(text)) !== null) {
          matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
          if (!m[0]) re.lastIndex++;
        }
      } else {
        m = re.exec(text);
        if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
      }
      setRegexResult({ matches, total: matches.length });
      showAlert(
        `${matches.length} match${matches.length !== 1 ? 'es' : ''} found`,
        matches.length ? 'success' : 'info'
      );
    } catch (err) {
      showAlert('Invalid regex: ' + (err as Error).message, 'danger');
    }
  };

  return {
    regexPattern,
    setRegexPattern,
    regexFlags,
    setRegexFlags,
    regexResult,
    setRegexResult,
    handleRegexTest,
  };
}
