import { useState } from 'react';
import type { AlertType } from './useAlert';

export interface FindReplaceValue {
  findText: string;
  setFindText: (v: string) => void;
  replaceText: string;
  setReplaceText: (v: string) => void;
  findCaseSensitive: boolean;
  setFindCaseSensitive: (v: boolean) => void;
  findUseRegex: boolean;
  setFindUseRegex: (v: boolean) => void;
  replaceCount: number | null;
  setReplaceCount: (v: number | null) => void;
  handleReplaceAll: () => void;
}

export default function useFindReplace(
  text: string,
  setText: (t: string) => void,
  showAlert: (msg: string, type: AlertType) => void
): FindReplaceValue {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const [findUseRegex, setFindUseRegex] = useState(false);
  const [replaceCount, setReplaceCount] = useState<number | null>(null);

  const handleReplaceAll = (): void => {
    if (!findText) {
      showAlert('Enter a search term', 'danger');
      return;
    }
    try {
      let count = 0;
      const flags = findCaseSensitive ? 'g' : 'gi';
      const pattern = findUseRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(pattern, flags);
      const result = text.replace(re, () => {
        count++;
        return replaceText;
      });
      setText(result);
      setReplaceCount(count);
      showAlert(
        `Replaced ${count} occurrence${count !== 1 ? 's' : ''}`,
        count ? 'success' : 'info'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showAlert('Invalid regex: ' + msg, 'danger');
    }
  };

  return {
    findText,
    setFindText,
    replaceText,
    setReplaceText,
    findCaseSensitive,
    setFindCaseSensitive,
    findUseRegex,
    setFindUseRegex,
    replaceCount,
    setReplaceCount,
    handleReplaceAll,
  };
}
