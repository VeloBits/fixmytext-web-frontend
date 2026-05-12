import { useState, useEffect, useRef } from 'react';
import { SMART_SUGGESTION_RULES, TOOLS } from '../constants/tools';
import type { ToolDefinition } from '../types/tools';

interface UseSmartSuggestionsReturn {
  suggestions: ToolDefinition[];
  dismiss: (toolId: string) => void;
  clearDismissed: () => void;
}

export default function useSmartSuggestions(text: string): UseSmartSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<ToolDefinition[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!text || text.length < 5) {
      setSuggestions([]);
      return;
    }

    // Debounce detection by 500ms
    timerRef.current = setTimeout(() => {
      const matched = new Set<string>();
      for (const rule of SMART_SUGGESTION_RULES) {
        try {
          if (rule.test(text)) {
            rule.toolIds.forEach((id: string) => matched.add(id));
          }
        } catch {
          /* ignore rule errors */
        }
      }

      const results = ([...matched]
        .filter((id) => !dismissed.has(id))
        .slice(0, 4)
        .map((id) => TOOLS.find((t) => t.id === id))
        .filter(Boolean) as ToolDefinition[]);

      setSuggestions(results);
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, dismissed]);

  const dismiss = (toolId: string): void => {
    setDismissed((prev) => new Set(prev).add(toolId));
  };

  const clearDismissed = (): void => setDismissed(new Set());

  return { suggestions, dismiss, clearDismissed };
}
