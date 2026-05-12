import { useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useTransformTextMutation } from '../store/api/textApi';
import { ENDPOINTS } from '../constants/endpoints';
import type { RootState } from '../store/store';
import type { AlertType } from './useAlert';

interface ToolError {
  status?: number;
  data?: {
    detail?: string | { code?: string; message?: string } | Record<string, unknown>;
  };
}

interface ErrorResult {
  message: string;
  tone: AlertType;
}

interface AiToolDefinition {
  handlerName: string;
  endpoint: string;
  label: string;
  errorMsg: string;
  toolId?: string;
}

export interface AiResult {
  label: string;
  result: string;
}

/**
 * Normalize a transform-API error into a user-facing message + alert tone.
 * Handles three shapes the backend produces:
 *   - 403 + structured {code:"email_not_verified", message}: verification gate
 *   - 429 + string detail: quota / rate limit
 *   - anything else: prefer `detail` (string or {message}), fall back to
 *     the caller-supplied default.
 */
function formatToolError(err: ToolError, fallback: string): ErrorResult {
  const detail = err?.data?.detail;
  if (err?.status === 403 && typeof detail === 'object' && detail !== null) {
    const d = detail as { code?: string; message?: string };
    if (d.code === 'email_not_verified') {
      return {
        message: d.message || 'Please verify your email to use FixMyText tools.',
        tone: 'warning',
      };
    }
  }
  if (err?.status === 429) {
    const msg429 =
      typeof detail === 'string'
        ? detail
        : typeof detail === 'object' && detail !== null
        ? (detail as { message?: string }).message
        : undefined;
    return {
      message: msg429 || 'Daily limit reached. Please try again later.',
      tone: 'warning',
    };
  }
  const msg =
    typeof detail === 'string'
      ? detail
      : typeof detail === 'object' && detail !== null
      ? (detail as { message?: string }).message || fallback
      : fallback;
  return { message: msg, tone: 'danger' };
}

/**
 * AI tool handler definitions.
 * Each entry maps to a callAi() invocation with specific endpoint and label.
 * Adding a new AI tool only requires adding an entry here.
 */
const AI_TOOL_DEFINITIONS: AiToolDefinition[] = [
  // Original AI tools
  {
    handlerName: 'handleHashtags',
    endpoint: ENDPOINTS.GENERATE_HASHTAGS,
    label: 'Hashtags',
    errorMsg: 'Could not generate hashtags. Please try again.',
  },
  {
    handlerName: 'handleSeoTitles',
    endpoint: ENDPOINTS.GENERATE_SEO_TITLES,
    label: 'SEO Titles',
    errorMsg: 'Could not generate SEO titles. Please try again.',
  },
  {
    handlerName: 'handleMetaDescriptions',
    endpoint: ENDPOINTS.GENERATE_META_DESCRIPTIONS,
    label: 'Meta Descriptions',
    errorMsg: 'Could not generate meta descriptions. Please try again.',
  },
  {
    handlerName: 'handleBlogOutline',
    endpoint: ENDPOINTS.GENERATE_BLOG_OUTLINE,
    label: 'Blog Outline',
    errorMsg: 'Could not generate blog outline. Please try again.',
  },
  {
    handlerName: 'handleTweetShorten',
    endpoint: ENDPOINTS.SHORTEN_FOR_TWEET,
    label: 'Tweet',
    errorMsg: 'Could not shorten for tweet. Please try again.',
  },
  {
    handlerName: 'handleEmailRewrite',
    endpoint: ENDPOINTS.REWRITE_EMAIL,
    label: 'Email',
    errorMsg: 'Could not rewrite email. Please try again.',
  },
  {
    handlerName: 'handleKeywords',
    endpoint: ENDPOINTS.EXTRACT_KEYWORDS,
    label: 'Keywords',
    errorMsg: 'Could not extract keywords. Please try again.',
  },
  {
    handlerName: 'handleSummarize',
    endpoint: ENDPOINTS.SUMMARIZE,
    label: 'Summary',
    errorMsg: 'Could not summarize text. Please try again.',
  },
  {
    handlerName: 'handleFixGrammar',
    endpoint: ENDPOINTS.FIX_GRAMMAR,
    label: 'Grammar Fix',
    errorMsg: 'Could not fix grammar. Please try again.',
  },
  {
    handlerName: 'handleParaphrase',
    endpoint: ENDPOINTS.PARAPHRASE,
    label: 'Paraphrase',
    errorMsg: 'Could not paraphrase text. Please try again.',
  },
  {
    handlerName: 'handleSentiment',
    endpoint: ENDPOINTS.ANALYZE_SENTIMENT,
    label: 'Sentiment',
    errorMsg: 'Could not analyze sentiment. Please try again.',
  },
  {
    handlerName: 'handleLengthenText',
    endpoint: ENDPOINTS.LENGTHEN_TEXT,
    label: 'Lengthened',
    errorMsg: 'Could not lengthen text. Please try again.',
  },
  {
    handlerName: 'handleEli5',
    endpoint: ENDPOINTS.ELI5,
    label: 'ELI5',
    errorMsg: 'Could not simplify text. Please try again.',
  },
  {
    handlerName: 'handleProofread',
    endpoint: ENDPOINTS.PROOFREAD,
    label: 'Proofread',
    errorMsg: 'Could not proofread text. Please try again.',
  },
  {
    handlerName: 'handleGenerateTitle',
    endpoint: ENDPOINTS.GENERATE_TITLE,
    label: 'Titles',
    errorMsg: 'Could not generate titles. Please try again.',
  },
  {
    handlerName: 'handleRefactorPrompt',
    endpoint: ENDPOINTS.REFACTOR_PROMPT,
    label: 'Prompt Refactored',
    errorMsg: 'Could not refactor prompt. Please try again.',
  },
  {
    handlerName: 'handleEmojify',
    endpoint: ENDPOINTS.EMOJIFY,
    label: 'Emojify',
    errorMsg: 'Could not add emojis. Please try again.',
    toolId: 'emojify',
  },
  // AI Writing handlers
  {
    handlerName: 'handleAcademicStyle',
    endpoint: ENDPOINTS.ACADEMIC_STYLE,
    label: 'Academic Style',
    errorMsg: 'Could not convert to academic style.',
    toolId: 'academic_style',
  },
  {
    handlerName: 'handleCreativeStyle',
    endpoint: ENDPOINTS.CREATIVE_STYLE,
    label: 'Creative Style',
    errorMsg: 'Could not convert to creative style.',
    toolId: 'creative_style',
  },
  {
    handlerName: 'handleTechnicalStyle',
    endpoint: ENDPOINTS.TECHNICAL_STYLE,
    label: 'Technical Style',
    errorMsg: 'Could not convert to technical style.',
    toolId: 'technical_style',
  },
  {
    handlerName: 'handleActiveVoice',
    endpoint: ENDPOINTS.ACTIVE_VOICE,
    label: 'Active Voice',
    errorMsg: 'Could not convert to active voice.',
    toolId: 'active_voice',
  },
  {
    handlerName: 'handleRedundancyRemover',
    endpoint: ENDPOINTS.REDUNDANCY_REMOVER,
    label: 'Remove Redundancy',
    errorMsg: 'Could not remove redundancy.',
    toolId: 'redundancy_remover',
  },
  {
    handlerName: 'handleSentenceSplitter',
    endpoint: ENDPOINTS.SENTENCE_SPLITTER,
    label: 'Split Sentences',
    errorMsg: 'Could not split sentences.',
    toolId: 'sentence_splitter',
  },
  {
    handlerName: 'handleConciseness',
    endpoint: ENDPOINTS.CONCISENESS,
    label: 'Make Concise',
    errorMsg: 'Could not make text concise.',
    toolId: 'conciseness',
  },
  {
    handlerName: 'handleResumeBullets',
    endpoint: ENDPOINTS.RESUME_BULLETS,
    label: 'Resume Bullets',
    errorMsg: 'Could not generate resume bullets.',
    toolId: 'resume_bullets',
  },
  {
    handlerName: 'handleMeetingNotes',
    endpoint: ENDPOINTS.MEETING_NOTES,
    label: 'Meeting Notes',
    errorMsg: 'Could not generate meeting notes.',
    toolId: 'meeting_notes',
  },
  {
    handlerName: 'handleCoverLetter',
    endpoint: ENDPOINTS.COVER_LETTER,
    label: 'Cover Letter',
    errorMsg: 'Could not generate cover letter.',
    toolId: 'cover_letter',
  },
  {
    handlerName: 'handleOutlineToDraft',
    endpoint: ENDPOINTS.OUTLINE_TO_DRAFT,
    label: 'Outline→Draft',
    errorMsg: 'Could not expand outline.',
    toolId: 'outline_to_draft',
  },
  // NOTE: handleContinueWriting is implemented manually below — it splits the
  // input into paragraphs and continues each independently so a multi-paragraph
  // input doesn't collapse to a single continuation of only the last paragraph.
  {
    handlerName: 'handleRewriteUnique',
    endpoint: ENDPOINTS.REWRITE_UNIQUE,
    label: 'Rewrite Unique',
    errorMsg: 'Could not rewrite uniquely.',
    toolId: 'rewrite_unique',
  },
  {
    handlerName: 'handleToneAnalyzer',
    endpoint: ENDPOINTS.TONE_ANALYZER,
    label: 'Tone Analysis',
    errorMsg: 'Could not analyze tone.',
    toolId: 'tone_analyzer',
  },
  // AI Content handlers
  {
    handlerName: 'handleLinkedinPost',
    endpoint: ENDPOINTS.LINKEDIN_POST,
    label: 'LinkedIn Post',
    errorMsg: 'Could not generate LinkedIn post.',
    toolId: 'linkedin_post',
  },
  {
    handlerName: 'handleTwitterThread',
    endpoint: ENDPOINTS.TWITTER_THREAD,
    label: 'Twitter Thread',
    errorMsg: 'Could not generate Twitter thread.',
    toolId: 'twitter_thread',
  },
  {
    handlerName: 'handleInstagramCaption',
    endpoint: ENDPOINTS.INSTAGRAM_CAPTION,
    label: 'Instagram Caption',
    errorMsg: 'Could not generate Instagram caption.',
    toolId: 'instagram_caption',
  },
  {
    handlerName: 'handleYoutubeDesc',
    endpoint: ENDPOINTS.YOUTUBE_DESC,
    label: 'YouTube Description',
    errorMsg: 'Could not generate YouTube description.',
    toolId: 'youtube_desc',
  },
  {
    handlerName: 'handleSocialBio',
    endpoint: ENDPOINTS.SOCIAL_BIO,
    label: 'Social Bio',
    errorMsg: 'Could not generate social bio.',
    toolId: 'social_bio',
  },
  {
    handlerName: 'handleProductDesc',
    endpoint: ENDPOINTS.PRODUCT_DESC,
    label: 'Product Description',
    errorMsg: 'Could not generate product description.',
    toolId: 'product_desc',
  },
  {
    handlerName: 'handleCtaGenerator',
    endpoint: ENDPOINTS.CTA_GENERATOR,
    label: 'CTAs',
    errorMsg: 'Could not generate CTAs.',
    toolId: 'cta_generator',
  },
  {
    handlerName: 'handleAdCopy',
    endpoint: ENDPOINTS.AD_COPY,
    label: 'Ad Copy',
    errorMsg: 'Could not generate ad copy.',
    toolId: 'ad_copy',
  },
  {
    handlerName: 'handleLandingHeadline',
    endpoint: ENDPOINTS.LANDING_HEADLINE,
    label: 'Landing Headline',
    errorMsg: 'Could not generate headlines.',
    toolId: 'landing_headline',
  },
  {
    handlerName: 'handleEmailSubject',
    endpoint: ENDPOINTS.EMAIL_SUBJECT,
    label: 'Email Subject',
    errorMsg: 'Could not generate subject lines.',
    toolId: 'email_subject',
  },
  {
    handlerName: 'handleContentIdeas',
    endpoint: ENDPOINTS.CONTENT_IDEAS,
    label: 'Content Ideas',
    errorMsg: 'Could not generate content ideas.',
    toolId: 'content_ideas',
  },
  {
    handlerName: 'handleHookGenerator',
    endpoint: ENDPOINTS.HOOK_GENERATOR,
    label: 'Hooks',
    errorMsg: 'Could not generate hooks.',
    toolId: 'hook_generator',
  },
  {
    handlerName: 'handleAngleGenerator',
    endpoint: ENDPOINTS.ANGLE_GENERATOR,
    label: 'Angles',
    errorMsg: 'Could not generate angles.',
    toolId: 'angle_generator',
  },
  {
    handlerName: 'handleFaqSchema',
    endpoint: ENDPOINTS.FAQ_SCHEMA,
    label: 'FAQ Schema',
    errorMsg: 'Could not generate FAQ schema.',
    toolId: 'faq_schema',
  },
  // Language handlers
  {
    handlerName: 'handlePosTagger',
    endpoint: ENDPOINTS.POS_TAGGER,
    label: 'Parts of Speech',
    errorMsg: 'Could not tag parts of speech.',
    toolId: 'pos_tagger',
  },
  {
    handlerName: 'handleSentenceType',
    endpoint: ENDPOINTS.SENTENCE_TYPE,
    label: 'Sentence Type',
    errorMsg: 'Could not classify sentences.',
    toolId: 'sentence_type',
  },
  {
    handlerName: 'handleGrammarExplain',
    endpoint: ENDPOINTS.GRAMMAR_EXPLAIN,
    label: 'Grammar Explain',
    errorMsg: 'Could not explain grammar.',
    toolId: 'grammar_explain',
  },
  {
    handlerName: 'handleSynonymFinder',
    endpoint: ENDPOINTS.SYNONYM_FINDER,
    label: 'Synonyms',
    errorMsg: 'Could not find synonyms.',
    toolId: 'synonym_finder',
  },
  {
    handlerName: 'handleAntonymFinder',
    endpoint: ENDPOINTS.ANTONYM_FINDER,
    label: 'Antonyms',
    errorMsg: 'Could not find antonyms.',
    toolId: 'antonym_finder',
  },
  {
    handlerName: 'handleDefineWords',
    endpoint: ENDPOINTS.DEFINE_WORDS,
    label: 'Definitions',
    errorMsg: 'Could not define words.',
    toolId: 'define_words',
  },
  {
    handlerName: 'handleWordPower',
    endpoint: ENDPOINTS.WORD_POWER,
    label: 'Power Words',
    errorMsg: 'Could not enhance words.',
    toolId: 'word_power',
  },
  {
    handlerName: 'handleVocabComplexity',
    endpoint: ENDPOINTS.VOCAB_COMPLEXITY,
    label: 'Vocab Complexity',
    errorMsg: 'Could not analyze vocabulary.',
    toolId: 'vocab_complexity',
  },
  {
    handlerName: 'handleJargonSimplifier',
    endpoint: ENDPOINTS.JARGON_SIMPLIFIER,
    label: 'Jargon Simplifier',
    errorMsg: 'Could not simplify jargon.',
    toolId: 'jargon_simplifier',
  },
  {
    handlerName: 'handleFormalityDetector',
    endpoint: ENDPOINTS.FORMALITY_DETECTOR,
    label: 'Formality',
    errorMsg: 'Could not detect formality.',
    toolId: 'formality_detector',
  },
  {
    handlerName: 'handleClicheDetector',
    endpoint: ENDPOINTS.CLICHE_DETECTOR,
    label: 'Cliche Detector',
    errorMsg: 'Could not detect cliches.',
    toolId: 'cliche_detector',
  },
  // Generator AI handlers
  {
    handlerName: 'handleRegexGen',
    endpoint: ENDPOINTS.REGEX_GEN,
    label: 'Regex Pattern',
    errorMsg: 'Could not generate regex.',
    toolId: 'regex_gen',
  },
  {
    handlerName: 'handleWritingPrompt',
    endpoint: ENDPOINTS.WRITING_PROMPT,
    label: 'Writing Prompt',
    errorMsg: 'Could not generate prompt.',
    toolId: 'writing_prompt',
  },
  {
    handlerName: 'handleTeamNameGen',
    endpoint: ENDPOINTS.TEAM_NAME_GEN,
    label: 'Team Names',
    errorMsg: 'Could not generate names.',
    toolId: 'team_name_gen',
  },
  {
    handlerName: 'handleMockApiResponse',
    endpoint: ENDPOINTS.MOCK_API_RESPONSE,
    label: 'Mock API',
    errorMsg: 'Could not generate mock response.',
    toolId: 'mock_api_response',
  },
];

/**
 * Hook that provides AI-powered text transformation tools.
 * Uses a data-driven factory pattern: simple callAi handlers are generated
 * from AI_TOOL_DEFINITIONS, while parameterized handlers (translate, tone, etc.)
 * are defined individually.
 *
 * @param text - The current input text.
 * @param setText - Setter for the input text.
 * @param setMarkdownMode - Setter to toggle markdown mode.
 * @param setPreviewMode - Setter to change the preview mode.
 * @param showAlert - Callback to display an alert notification.
 * @param pushHistory - Callback to record an operation in history.
 * @returns AI tool handlers, state setters, and result data.
 */
export default function useAiTools(
  text: string,
  setText: (t: string) => void,
  setMarkdownMode: (v: boolean) => void,
  setPreviewMode: (mode: string) => void,
  showAlert: (msg: string, type: AlertType) => void,
  pushHistory: ((label: string, orig: string, result: string, meta: Record<string, string>) => void) | undefined
) {
  const { accessToken } = useSelector((s: RootState) => s.auth);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [toneSetting, setToneSetting] = useState('formal');
  const [formatSetting, setFormatSetting] = useState('paragraph');
  const [translateLang, setTranslateLang] = useState('Spanish');
  const [translitLang, setTranslitLang] = useState('Hindi');
  const [splitDelimiter, setSplitDelimiter] = useState(',');
  const [joinSeparator, setJoinSeparator] = useState(', ');
  const [padAlign, setPadAlign] = useState('left');
  const [autoDetectLang, setAutoDetectLang] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [caesarShift, setCaesarShift] = useState('3');
  const [railCount, setRailCount] = useState('3');
  const [curlTarget, setCurlTarget] = useState('javascript');
  const [dateFormatType, setDateFormatType] = useState('iso');

  const [transformText] = useTransformTextMutation();

  const hasMarkdown = (str: string): boolean => /[|#*-]{2,}|^\s*[•\-\d]+[.)]\s|^\|.+\|$/m.test(str);

  /**
   * Core AI call function. Sends text to an endpoint and processes the result.
   * @param {string} endpoint - API endpoint path.
   * @param {string} label - Display label for the result.
   * @param {string} errorMsg - Fallback error message.
   * @param {string} [toolId] - Optional tool identifier for history tracking.
   */
  const callAi = useCallback(
    async (endpoint: string, label: string, errorMsg: string, toolId?: string): Promise<void> => {
      if (!text) return;
      if (!accessToken) {
        showAlert('Please log in to use AI tools', 'warning');
        return;
      }
      const original = text;

      // Split into chunks separated by blank lines OR single newlines so
      // multi-line input doesn't collapse into one transformed blob (e.g.
      // Remove Redundancy on two sentences would otherwise return one merged
      // sentence). Each chunk is sent to the backend independently and the
      // results are rejoined preserving the original separator pattern.
      // We tokenize the input by walking through it and recording each
      // non-empty content run plus the separator that follows it.
      const tokens: Array<{ content: string; sep: string }> = [];
      const re = /([^\n]+)(\n+|$)/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        tokens.push({ content: m[1], sep: m[2] });
      }

      try {
        const results = await Promise.all(
          tokens
            .filter((t) => t.content.trim().length > 0)
            .map((t) => transformText({ endpoint, text: t.content }).unwrap())
        );

        // Reassemble: for each original token, substitute the AI result if
        // the token had content, then re-append its trailing separator.
        let i = 0;
        const combined = tokens
          .map((t) => {
            if (t.content.trim().length === 0) return t.content + t.sep;
            const out = (results[i++]?.result ?? t.content).replace(/\n+$/, '');
            return out + t.sep;
          })
          .join('')
          .replace(/\n+$/, '');

        setAiResult({ label, result: combined });
        setPreviewMode('result');
        if (pushHistory)
          pushHistory(label, original, combined, {
            toolId: toolId || label.toLowerCase().replace(/\s+/g, '_'),
            toolType: 'ai',
          });
        showAlert(
          tokens.filter((t) => t.content.trim().length > 0).length === 1
            ? `${label} generated`
            : `${label} generated for ${results.length} lines`,
          'success'
        );
      } catch (err) {
        const { message, tone } = formatToolError(
          err as ToolError,
          errorMsg || 'Daily AI limit reached. Upgrade to Pro for unlimited access.'
        );
        showAlert(message, tone);
      }
    },
    [text, accessToken, transformText, setAiResult, setPreviewMode, pushHistory, showAlert]
  );

  /**
   * Generate handler functions from tool definitions.
   * Each handler calls callAi with the tool's endpoint and label.
   * The resulting object has the same property names as the original
   * hand-written handlers for backward compatibility.
   */
  const simpleHandlers = useMemo((): Record<string, () => Promise<void>> => {
    const result: Record<string, () => Promise<void>> = {};
    for (const tool of AI_TOOL_DEFINITIONS) {
      result[tool.handlerName] = () =>
        callAi(tool.endpoint, tool.label, tool.errorMsg, tool.toolId);
    }
    return result;
  }, [callAi]);

  // ── Parameterized handlers (require extra state / custom logic) ──

  /**
   * Continue Writing splits multi-paragraph input on blank lines and continues
   * each paragraph independently. Without this, the backend AI sees the whole
   * input and only continues from the last paragraph, producing a single
   * continuation block — the user sees output for the second paragraph only.
   */
  const handleContinueWriting = async (): Promise<void> => {
    if (!text) return;
    if (!accessToken) {
      showAlert('Please log in to use AI tools', 'warning');
      return;
    }
    const original = text;
    const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
    try {
      const results = await Promise.all(
        paragraphs.map((para) =>
          transformText({ endpoint: ENDPOINTS.CONTINUE_WRITING, text: para }).unwrap()
        )
      );
      const combined = results.map((d) => d.result).join('\n\n');
      setAiResult({ label: 'Continue Writing', result: combined });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory('Continue Writing', original, combined, {
          toolId: 'continue_writing',
          toolType: 'ai',
        });
      showAlert(
        paragraphs.length === 1
          ? 'Continue Writing generated'
          : `Continued ${paragraphs.length} paragraphs`,
        'success'
      );
    } catch (err) {
      const { message, tone } = formatToolError(err as ToolError, 'Could not continue writing.');
      showAlert(message, tone);
    }
  };

  /** @param {string} [overrideVal] - Optional format value override. */
  const handleChangeFormat = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const fmt = overrideVal ?? formatSetting;
    try {
      const label = `Format (${fmt})`;
      const data = await transformText({
        endpoint: ENDPOINTS.CHANGE_FORMAT,
        text,
        format: fmt,
      }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'change_format', toolType: 'select' });
      showAlert(`Reformatted as ${fmt}`, 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(
          err as ToolError,
          'Could not change format. Please try again.'
        );
        showAlert(message, tone);
      }
    }
  };

  /** @param {string} [overrideVal] - Optional tone value override. */
  const handleChangeTone = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const tone = overrideVal ?? toneSetting;
    try {
      const label = `Tone (${tone})`;
      const data = await transformText({ endpoint: ENDPOINTS.CHANGE_TONE, text, tone }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'change_tone', toolType: 'select' });
      showAlert(`Tone changed to ${tone}`, 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(err as ToolError, 'Could not change tone. Please try again.');
        showAlert(message, tone);
      }
    }
  };

  /** Detect the language of the current text. */
  const handleDetectLanguage = async (): Promise<string | null | undefined> => {
    if (!text) return;
    try {
      const data = await transformText({ endpoint: ENDPOINTS.DETECT_LANGUAGE, text }).unwrap();
      setDetectedLang(data.result);
      return data.result;
    } catch {
      setDetectedLang(null);
      return null;
    }
  };

  /** @param {string} [overrideVal] - Optional target language override. */
  const handleTranslate = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const lang = overrideVal ?? translateLang;
    try {
      if (autoDetectLang) {
        const detected = await handleDetectLanguage();
        if (detected) showAlert(`Detected: ${detected}`, 'info');
      }
      const label = `Translation (${lang})`;
      const data = await transformText({
        endpoint: ENDPOINTS.TRANSLATE,
        text,
        target_language: lang,
      }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'translate', toolType: 'select' });
      showAlert(`Translated to ${lang}`, 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(
          err as ToolError,
          'Could not translate text. Please try again.'
        );
        showAlert(message, tone);
      }
    }
  };

  /** @param {string} [overrideVal] - Optional target language override. */
  const handleTransliterate = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const lang = overrideVal ?? translitLang;
    try {
      const label = `Transliteration (${lang})`;
      const data = await transformText({
        endpoint: ENDPOINTS.TRANSLITERATE,
        text,
        target_language: lang,
      }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'transliterate', toolType: 'select' });
      showAlert(`Transliterated to ${lang} script`, 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(
          err as ToolError,
          'Could not transliterate text. Please try again.'
        );
        showAlert(message, tone);
      }
    }
  };

  /** @param {string} [overrideVal] - Optional delimiter override. */
  const handleSplitToLines = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const delVal = overrideVal ?? splitDelimiter;
    try {
      const delim = delVal === '\\t' ? '\t' : delVal;
      const label = `Split to Lines (${delVal === '\\t' ? 'Tab' : delVal})`;
      const data = await transformText({
        endpoint: ENDPOINTS.SPLIT_TO_LINES,
        text,
        delimiter: delim,
      }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'split_to_lines', toolType: 'select' });
      showAlert('Text split to lines', 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(err as ToolError, 'Could not split text. Please try again.');
        showAlert(message, tone);
      }
    }
  };

  /** @param {string} [overrideVal] - Optional separator override. */
  const handleJoinLines = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const sep = overrideVal ?? joinSeparator;
    try {
      const label = `Join Lines (${sep || 'none'})`;
      const data = await transformText({
        endpoint: ENDPOINTS.JOIN_LINES,
        text,
        delimiter: sep,
      }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'join_lines', toolType: 'select' });
      showAlert('Lines joined', 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(err as ToolError, 'Could not join lines. Please try again.');
        showAlert(message, tone);
      }
    }
  };

  /** @param {string} [overrideVal] - Optional Caesar shift override. */
  const handleCaesarCipher = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const shift = parseInt(overrideVal ?? caesarShift, 10);
    try {
      const label = `Caesar Cipher (shift ${shift})`;
      const data = await transformText({ endpoint: ENDPOINTS.CAESAR_CIPHER, text, shift }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'caesar_cipher', toolType: 'select' });
      showAlert(`Caesar cipher applied (shift ${shift})`, 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(err as ToolError, 'Could not apply Caesar cipher.');
        showAlert(message, tone);
      }
    }
  };

  /** @param {string} [overrideVal] - Optional rail count override. */
  const handleRailFenceEnc = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const rails = parseInt(overrideVal ?? railCount, 10);
    try {
      const label = `Rail Fence Encrypt (${rails} rails)`;
      const data = await transformText({
        endpoint: ENDPOINTS.RAIL_FENCE_ENC,
        text,
        rails,
      }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'rail_fence_enc', toolType: 'select' });
      showAlert(`Rail fence encrypted (${rails} rails)`, 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(err as ToolError, 'Could not encrypt with Rail Fence.');
        showAlert(message, tone);
      }
    }
  };

  /** @param {string} [overrideVal] - Optional rail count override. */
  const handleRailFenceDec = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const rails = parseInt(overrideVal ?? railCount, 10);
    try {
      const label = `Rail Fence Decrypt (${rails} rails)`;
      const data = await transformText({
        endpoint: ENDPOINTS.RAIL_FENCE_DEC,
        text,
        rails,
      }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'rail_fence_dec', toolType: 'select' });
      showAlert(`Rail fence decrypted (${rails} rails)`, 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(err as ToolError, 'Could not decrypt Rail Fence.');
        showAlert(message, tone);
      }
    }
  };

  /** @param {string} [overrideVal] - Optional target language override. */
  const handleCurlToCode = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const target = overrideVal ?? curlTarget;

    // Convert one curl command (already collapsed onto a single line).
    const convertOne = (cmd: string): string => {
      const urlMatch = cmd.match(/curl\s+(?:.*?\s+)?['"]?(https?:\/\/[^\s'"]+)/);
      const url = urlMatch ? urlMatch[1] : 'https://api.example.com';
      const methodMatch = cmd.match(/-X\s+(\w+)/);
      const method = methodMatch ? methodMatch[1] : 'GET';
      const headerMatches = [...cmd.matchAll(/-H\s+['"]([^'"]+)['"]/g)];
      const headers = Object.fromEntries(
        headerMatches
          .map((m) => m[1].split(': ').map((s) => s.trim()))
          .filter((p) => p.length === 2)
      );
      const dataMatch =
        cmd.match(/-d\s+['"]([^'"]+)['"]/) || cmd.match(/--data\s+['"]([^'"]+)['"]/);
      const body = dataMatch ? dataMatch[1] : null;

      if (target === 'javascript') {
        const opts = [`  method: '${method}'`];
        if (Object.keys(headers).length)
          opts.push(`  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')}`);
        if (body) opts.push(`  body: '${body}'`);
        return `fetch('${url}', {\n${opts.join(
          ',\n'
        )}\n})\n  .then(res => res.json())\n  .then(data => console.log(data))`;
      }
      if (target === 'python') {
        const lines = [`import requests\n`];
        if (body)
          lines.push(
            `response = requests.${method.toLowerCase()}('${url}', headers=${JSON.stringify(
              headers
            )}, data='${body}')`
          );
        else
          lines.push(
            `response = requests.${method.toLowerCase()}('${url}', headers=${JSON.stringify(
              headers
            )})`
          );
        lines.push(`print(response.json())`);
        return lines.join('\n');
      }
      if (target === 'go') {
        return `package main\n\nimport (\n  "fmt"\n  "net/http"\n  "io/ioutil"\n)\n\nfunc main() {\n  req, _ := http.NewRequest("${method}", "${url}", nil)\n  client := &http.Client{}\n  resp, _ := client.Do(req)\n  body, _ := ioutil.ReadAll(resp.Body)\n  fmt.Println(string(body))\n}`;
      }
      if (target === 'php') {
        return `<?php\n$ch = curl_init('${url}');\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$response = curl_exec($ch);\ncurl_close($ch);\necho $response;\n?>`;
      }
      return cmd;
    };

    try {
      // Collapse shell line continuations (`\` followed by newline) so a
      // single multi-line curl reads as one command, then split on every
      // remaining line that starts a new `curl` invocation.
      const collapsed = text.replace(/\\\s*\n/g, ' ');
      const commands = collapsed
        .split(/\n+/)
        .map((l) => l.trim())
        .filter((l) => /^curl\b/.test(l));

      const cmdsToRun = commands.length > 0 ? commands : [collapsed.trim()];
      const result = cmdsToRun.map(convertOne).join('\n\n');

      const label = `cURL → ${target}`;
      setAiResult({ label, result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, result, { toolId: 'curl_to_code', toolType: 'select' });
      showAlert(
        cmdsToRun.length === 1
          ? `Converted to ${target}`
          : `Converted ${cmdsToRun.length} commands to ${target}`,
        'success'
      );
    } catch {
      showAlert('Could not convert cURL command.', 'danger');
    }
  };

  /** @param {string} [overrideVal] - Optional date format type override. */
  const handleDateFormat = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const fmt = overrideVal ?? dateFormatType;
    try {
      const lines = text.split('\n').map((line) => {
        const d = new Date(line.trim());
        if (isNaN(d.getTime())) return line;
        switch (fmt) {
          case 'iso':
            return d.toISOString();
          case 'us':
            return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d
              .getDate()
              .toString()
              .padStart(2, '0')}/${d.getFullYear()}`;
          case 'eu':
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
              .toString()
              .padStart(2, '0')}/${d.getFullYear()}`;
          case 'long':
            return d.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
          case 'relative': {
            const diff = Date.now() - d.getTime();
            const days = Math.floor(diff / 86400000);
            if (days === 0) return 'Today';
            if (days === 1) return 'Yesterday';
            if (days < 30) return `${days} days ago`;
            if (days < 365) return `${Math.floor(days / 30)} months ago`;
            return `${Math.floor(days / 365)} years ago`;
          }
          default:
            return d.toISOString();
        }
      });
      const result = lines.join('\n');
      const label = `Date Format (${fmt})`;
      setAiResult({ label, result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, result, { toolId: 'date_format', toolType: 'select' });
      showAlert(`Date formatted as ${fmt}`, 'success');
    } catch {
      showAlert('Could not format date.', 'danger');
    }
  };

  /** @param {string} [overrideVal] - Optional alignment override. */
  const handlePadLines = async (overrideVal?: string): Promise<void> => {
    if (!text) return;
    const original = text;
    const align = overrideVal ?? padAlign;
    try {
      const label = `Pad Lines (${align})`;
      const data = await transformText({ endpoint: ENDPOINTS.PAD_LINES, text, align }).unwrap();
      setAiResult({ label, result: data.result });
      setPreviewMode('result');
      if (pushHistory)
        pushHistory(label, original, data.result, { toolId: 'pad_lines', toolType: 'select' });
      showAlert(`Lines padded (${align})`, 'success');
    } catch (err) {
      {
        const { message, tone } = formatToolError(err as ToolError, 'Could not pad lines. Please try again.');
        showAlert(message, tone);
      }
    }
  };

  /** Accept the current AI result and replace the input text. */
  const handleAiAccept = () => {
    if (aiResult) {
      setText(aiResult.result);
      if (hasMarkdown(aiResult.result)) setMarkdownMode(true);
      setAiResult(null);
    }
  };

  /** Dismiss the current AI result without applying it. */
  const handleAiDismiss = () => setAiResult(null);

  return {
    aiResult,
    setAiResult,
    hasMarkdown,
    toneSetting,
    setToneSetting,
    formatSetting,
    setFormatSetting,
    translateLang,
    setTranslateLang,
    translitLang,
    setTranslitLang,
    // Simple AI handlers (factory-generated)
    ...simpleHandlers,
    // Parameterized handlers
    handleContinueWriting,
    handleChangeFormat,
    handleChangeTone,
    handleTranslate,
    handleTransliterate,
    handleDetectLanguage,
    autoDetectLang,
    setAutoDetectLang,
    detectedLang,
    setDetectedLang,
    splitDelimiter,
    setSplitDelimiter,
    joinSeparator,
    setJoinSeparator,
    padAlign,
    setPadAlign,
    handleSplitToLines,
    handleJoinLines,
    handlePadLines,
    // Select tool state
    caesarShift,
    setCaesarShift,
    railCount,
    setRailCount,
    curlTarget,
    setCurlTarget,
    dateFormatType,
    setDateFormatType,
    // Select tool handlers
    handleCaesarCipher,
    handleRailFenceEnc,
    handleRailFenceDec,
    handleCurlToCode,
    handleDateFormat,
    handleAiAccept,
    handleAiDismiss,
  };
}
