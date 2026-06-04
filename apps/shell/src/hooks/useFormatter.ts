import { useState, useRef, useEffect } from 'react';
import type { AlertType } from './useAlert';

export interface FormatterConfig {
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
  trailingComma: string;
  bracketSpacing: boolean;
  arrowParens: string;
  jsxSingleQuote: boolean;
  sortImports: boolean;
  bracketSameLine: boolean;
  htmlWhitespaceSensitivity: string;
}

export interface FormatterValue {
  fmtCfg: FormatterConfig;
  setFmtCfg: (cfg: FormatterConfig) => void;
  handleFormatHtml: () => void;
  handleFormatCss: () => void;
  handleFormatJs: () => void;
  handleFormatTs: () => void;
}

const defaultFmtCfg: FormatterConfig = {
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  jsxSingleQuote: false,
  sortImports: true,
  bracketSameLine: false,
  htmlWhitespaceSensitivity: 'css',
};

type ParserKey = 'babel' | 'typescript' | 'html' | 'css';

const parserImports: Record<ParserKey, () => Promise<{ default: unknown }>> = {
  babel: () => import('prettier/parser-babel'),
  typescript: () => import('prettier/parser-typescript'),
  html: () => import('prettier/parser-html'),
  css: () => import('prettier/parser-postcss'),
};

const sortImportsAlphabetically = (code: string): string => {
  const lines = code.split('\n');
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === '') i++;
  const start = i;
  const importLines: string[] = [];
  while (i < lines.length && /^\s*import\s/.test(lines[i]!)) {
    importLines.push(lines[i]!);
    i++;
  }
  if (importLines.length < 2) return code;
  const sorted = [...importLines].sort((a, b) => {
    const aFrom = a.match(/from\s+['"](.+)['"]/)?.[1] ?? a;
    const bFrom = b.match(/from\s+['"](.+)['"]/)?.[1] ?? b;
    const aRel = aFrom.startsWith('.');
    const bRel = bFrom.startsWith('.');
    if (aRel !== bRel) return aRel ? 1 : -1;
    return aFrom.localeCompare(bFrom);
  });
  return [...lines.slice(0, start), ...sorted, ...lines.slice(i)].join('\n');
};

export default function useFormatter(
  text: string,
  setLoading: (v: boolean) => void,
  showAlert: (msg: string, type: AlertType) => void,
  onResult: (label: string, formatted: string) => void
): FormatterValue {
  const [fmtCfg, setFmtCfg] = useState(defaultFmtCfg);
  // Ref always holds the latest config — avoids stale closures in handlers
  const cfgRef = useRef(fmtCfg);
  useEffect(() => {
    cfgRef.current = fmtCfg;
  }, [fmtCfg]);

  const runFormat = async (parser: ParserKey, successMsg: string): Promise<void> => {
    if (!text) return;
    setLoading(true);
    const cfg = cfgRef.current;
    try {
      const [prettierMod, parserMod] = await Promise.all([
        import('prettier/standalone'),
        parserImports[parser](),
      ]);
      let code = text;
      if (cfg.sortImports && ['babel', 'babel-ts', 'typescript'].includes(parser)) {
        code = sortImportsAlphabetically(code);
      }
      // Cast options to any to avoid strict prettier type mismatches on config strings
      const formatted = await prettierMod.default.format(code, {
        parser,
        plugins: [parserMod.default],
        tabWidth: cfg.tabWidth,
        useTabs: cfg.useTabs,
        semi: cfg.semi,
        singleQuote: cfg.singleQuote,
        trailingComma: cfg.trailingComma as 'es5' | 'all' | 'none',
        bracketSpacing: cfg.bracketSpacing,
        arrowParens: cfg.arrowParens as 'always' | 'avoid',
        jsxSingleQuote: cfg.jsxSingleQuote,
        bracketSameLine: cfg.bracketSameLine,
        htmlWhitespaceSensitivity: cfg.htmlWhitespaceSensitivity as 'css' | 'strict' | 'ignore',
      } as Parameters<typeof prettierMod.default.format>[1]);
      onResult(successMsg, formatted);
      showAlert(successMsg, 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message?.split('\n')[0] : undefined;
      showAlert(errMsg || 'Format error', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleFormatHtml = () => runFormat('html', 'HTML formatted');
  const handleFormatCss = () => runFormat('css', 'CSS formatted');
  const handleFormatJs = () => runFormat('babel', 'JS / JSX formatted');
  const handleFormatTs = () => runFormat('typescript', 'TypeScript formatted');

  return {
    fmtCfg,
    setFmtCfg,
    handleFormatHtml,
    handleFormatCss,
    handleFormatJs,
    handleFormatTs,
  };
}
