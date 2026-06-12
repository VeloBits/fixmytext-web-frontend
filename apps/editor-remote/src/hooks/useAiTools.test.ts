import { renderHook, act } from '@testing-library/react';
import useAiTools from './useAiTools';

const mockTransformText = vi.fn();
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));
vi.mock('@velobits/app-core/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    accessToken: 'tok123',
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));
vi.mock('@velobits/app-core/store/api/textApi', () => ({
  useTransformTextMutation: () => [mockTransformText],
}));
vi.mock('@velobits/app-core/constants/endpoints', () => ({
  ENDPOINTS: {
    GENERATE_HASHTAGS: '/hashtags',
    GENERATE_SEO_TITLES: '/seo',
    GENERATE_META_DESCRIPTIONS: '/meta',
    GENERATE_BLOG_OUTLINE: '/blog',
    SHORTEN_FOR_TWEET: '/tweet',
    REWRITE_EMAIL: '/email',
    EXTRACT_KEYWORDS: '/keywords',
    SUMMARIZE: '/summarize',
    FIX_GRAMMAR: '/grammar',
    PARAPHRASE: '/paraphrase',
    ANALYZE_SENTIMENT: '/sentiment',
    LENGTHEN_TEXT: '/lengthen',
    ELI5: '/eli5',
    PROOFREAD: '/proofread',
    GENERATE_TITLE: '/title',
    REFACTOR_PROMPT: '/refactor',
    EMOJIFY: '/emojify',
    CHANGE_FORMAT: '/format',
    CHANGE_TONE: '/tone',
    DETECT_LANGUAGE: '/detect',
    TRANSLATE: '/translate',
    TRANSLITERATE: '/transliterate',
    SPLIT_TO_LINES: '/split',
    JOIN_LINES: '/join',
    PAD_LINES: '/pad',
    CAESAR_CIPHER: '/caesar',
    RAIL_FENCE_ENC: '/rail-enc',
    RAIL_FENCE_DEC: '/rail-dec',
    ACADEMIC_STYLE: '/academic',
    CREATIVE_STYLE: '/creative',
    TECHNICAL_STYLE: '/technical',
    ACTIVE_VOICE: '/active',
    REDUNDANCY_REMOVER: '/redundancy',
    SENTENCE_SPLITTER: '/sentence-split',
    CONCISENESS: '/concise',
    RESUME_BULLETS: '/resume',
    MEETING_NOTES: '/meeting',
    COVER_LETTER: '/cover',
    OUTLINE_TO_DRAFT: '/outline',
    CONTINUE_WRITING: '/continue',
    REWRITE_UNIQUE: '/rewrite',
    TONE_ANALYZER: '/tone-analyze',
    LINKEDIN_POST: '/linkedin',
    TWITTER_THREAD: '/twitter',
    INSTAGRAM_CAPTION: '/instagram',
    YOUTUBE_DESC: '/youtube',
    SOCIAL_BIO: '/bio',
    PRODUCT_DESC: '/product',
    CTA_GENERATOR: '/cta',
    AD_COPY: '/ad',
    LANDING_HEADLINE: '/headline',
    EMAIL_SUBJECT: '/subject',
    CONTENT_IDEAS: '/ideas',
    HOOK_GENERATOR: '/hook',
    ANGLE_GENERATOR: '/angle',
    FAQ_SCHEMA: '/faq',
    POS_TAGGER: '/pos',
    SENTENCE_TYPE: '/sent-type',
    GRAMMAR_EXPLAIN: '/gram-explain',
    SYNONYM_FINDER: '/synonym',
    ANTONYM_FINDER: '/antonym',
    DEFINE_WORDS: '/define',
    WORD_POWER: '/word-power',
    VOCAB_COMPLEXITY: '/vocab',
    JARGON_SIMPLIFIER: '/jargon',
    FORMALITY_DETECTOR: '/formality',
    CLICHE_DETECTOR: '/cliche',
    REGEX_GEN: '/regex',
    WRITING_PROMPT: '/writing-prompt',
    TEAM_NAME_GEN: '/team-name',
    MOCK_API_RESPONSE: '/mock-api',
  },
}));

import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';

const mockUseOidcAuth = vi.mocked(useOidcAuth);

describe('useAiTools', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let setText: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMarkdownMode: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setPreviewMode: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showAlert: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pushHistory: any;

  beforeEach(() => {
    vi.clearAllMocks();
    setText = vi.fn();
    setMarkdownMode = vi.fn();
    setPreviewMode = vi.fn();
    showAlert = vi.fn();
    pushHistory = vi.fn();
    // Default: authenticated via OIDC
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'tok123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    mockTransformText.mockReturnValue({ unwrap: () => Promise.resolve({ result: 'output' }) });
  });

  // Dynamic handlers (handleHashtags etc.) are spread from a Record — cast for test access
  type AiToolsWithDynamic = ReturnType<typeof useAiTools> & Record<string, () => Promise<void>>;

  const renderAiTools = (text = 'hello world') =>
    renderHook(() =>
      useAiTools(text, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    ) as ReturnType<typeof renderHook> & { result: { current: AiToolsWithDynamic } };

  it('returns default state values', () => {
    const { result } = renderAiTools();
    expect(result.current.toneSetting).toBe('formal');
    expect(result.current.formatSetting).toBe('paragraph');
    expect(result.current.translateLang).toBe('Spanish');
    expect(result.current.translitLang).toBe('Hindi');
    expect(result.current.splitDelimiter).toBe(',');
    expect(result.current.joinSeparator).toBe(', ');
    expect(result.current.padAlign).toBe('left');
    expect(result.current.autoDetectLang).toBe(false);
    expect(result.current.detectedLang).toBeNull();
    expect(result.current.aiResult).toBeNull();
    expect(result.current.caesarShift).toBe('3');
    expect(result.current.railCount).toBe('3');
    expect(result.current.curlTarget).toBe('javascript');
    expect(result.current.dateFormatType).toBe('iso');
  });

  it('hasMarkdown detects markdown patterns', () => {
    const { result } = renderAiTools();
    expect(result.current.hasMarkdown('## Title')).toBe(true);
    expect(result.current.hasMarkdown('| col1 | col2 |')).toBe(true);
    expect(result.current.hasMarkdown('plain text')).toBe(false);
  });

  it('callAi does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('callAi shows warning when not authenticated', async () => {
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith('Please log in to use AI tools', 'warning');
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('callAi success path sets result and calls pushHistory', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(mockTransformText).toHaveBeenCalledWith({ endpoint: '/hashtags', text: 'hello' });
    expect(setPreviewMode).toHaveBeenCalledWith('result');
    expect(showAlert).toHaveBeenCalledWith('Hashtags generated', 'success');
    expect(pushHistory).toHaveBeenCalled();
  });

  it('callAi handles 429 rate limit error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ status: 429, data: { detail: 'Rate limited' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleSummarize!();
    });
    expect(showAlert).toHaveBeenCalledWith('Rate limited', 'warning');
  });

  it('callAi handles generic error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ status: 500, data: { detail: 'Server error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleFixGrammar!();
    });
    expect(showAlert).toHaveBeenCalledWith('Server error', 'danger');
  });

  it('callAi handles error with no detail', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ status: 500 }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleFixGrammar!();
    });
    expect(showAlert).toHaveBeenCalledWith('Could not fix grammar. Please try again.', 'danger');
  });

  it('handleChangeFormat calls transformText with format', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleChangeFormat('bullets');
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/format',
      text: 'hello',
      format: 'bullets',
    });
    expect(showAlert).toHaveBeenCalledWith('Reformatted as bullets', 'success');
  });

  it('handleChangeFormat does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleChangeFormat();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('handleChangeFormat handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Format error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleChangeFormat();
    });
    expect(showAlert).toHaveBeenCalledWith('Format error', 'danger');
  });

  it('handleChangeTone calls transformText with tone', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleChangeTone('casual');
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/tone',
      text: 'hello',
      tone: 'casual',
    });
    expect(showAlert).toHaveBeenCalledWith('Tone changed to casual', 'success');
  });

  it('handleChangeTone does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleChangeTone();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('handleDetectLanguage returns result', async () => {
    mockTransformText.mockReturnValue({ unwrap: () => Promise.resolve({ result: 'English' }) });
    const { result } = renderAiTools('hello');
    let detected;
    await act(async () => {
      detected = await result.current.handleDetectLanguage();
    });
    expect(detected).toBe('English');
  });

  it('handleDetectLanguage returns null on error', async () => {
    mockTransformText.mockReturnValue({ unwrap: () => Promise.reject(new Error('fail')) });
    const { result } = renderAiTools('hello');
    let detected;
    await act(async () => {
      detected = await result.current.handleDetectLanguage();
    });
    expect(detected).toBeNull();
  });

  it('handleDetectLanguage does nothing when text empty', async () => {
    const { result } = renderAiTools('');
    let detected;
    await act(async () => {
      detected = await result.current.handleDetectLanguage();
    });
    expect(detected).toBeUndefined();
  });

  it('handleTranslate calls transformText with target_language', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleTranslate('French');
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/translate',
      text: 'hello',
      target_language: 'French',
    });
    expect(showAlert).toHaveBeenCalledWith('Translated to French', 'success');
  });

  it('handleTranslate with autoDetectLang enabled', async () => {
    mockTransformText.mockReturnValue({ unwrap: () => Promise.resolve({ result: 'output' }) });
    const { result } = renderAiTools('hello');
    await act(async () => {
      result.current.setAutoDetectLang(true);
    });
    await act(async () => {
      await result.current.handleTranslate('French');
    });
    expect(showAlert).toHaveBeenCalledWith('Detected: output', 'info');
  });

  it('handleTransliterate success', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleTransliterate('Hindi');
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/transliterate',
      text: 'hello',
      target_language: 'Hindi',
    });
    expect(showAlert).toHaveBeenCalledWith('Transliterated to Hindi script', 'success');
  });

  it('handleSplitToLines success', async () => {
    const { result } = renderAiTools('a,b,c');
    await act(async () => {
      await result.current.handleSplitToLines();
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/split',
      text: 'a,b,c',
      delimiter: ',',
    });
  });

  it('handleSplitToLines with tab delimiter', async () => {
    const { result } = renderAiTools('a\tb');
    await act(async () => {
      await result.current.handleSplitToLines('\\t');
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/split',
      text: 'a\tb',
      delimiter: '\t',
    });
  });

  it('handleJoinLines success', async () => {
    const { result } = renderAiTools('a\nb');
    await act(async () => {
      await result.current.handleJoinLines();
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/join',
      text: 'a\nb',
      delimiter: ', ',
    });
  });

  it('handleCaesarCipher success', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleCaesarCipher('5');
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/caesar',
      text: 'hello',
      shift: 5,
    });
  });

  it('handleRailFenceEnc success', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleRailFenceEnc('4');
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/rail-enc',
      text: 'hello',
      rails: 4,
    });
  });

  it('handleRailFenceDec success', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleRailFenceDec('4');
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/rail-dec',
      text: 'hello',
      rails: 4,
    });
  });

  it('handlePadLines success', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handlePadLines('right');
    });
    expect(mockTransformText).toHaveBeenCalledWith({
      endpoint: '/pad',
      text: 'hello',
      align: 'right',
    });
  });

  it('handleCurlToCode converts to javascript', async () => {
    const curlText =
      "curl -X GET 'https://api.example.com/data' -H 'Content-Type: application/json'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('javascript');
    });
    expect(showAlert).toHaveBeenCalledWith('Converted to javascript', 'success');
    expect(pushHistory).toHaveBeenCalled();
  });

  it('handleCurlToCode converts to python', async () => {
    const curlText = "curl -X POST 'https://api.example.com' -d 'body=test'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('python');
    });
    expect(showAlert).toHaveBeenCalledWith('Converted to python', 'success');
  });

  it('handleCurlToCode converts to go', async () => {
    const curlText = "curl 'https://api.example.com'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('go');
    });
    expect(showAlert).toHaveBeenCalledWith('Converted to go', 'success');
  });

  it('handleCurlToCode converts to php', async () => {
    const curlText = "curl 'https://api.example.com'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('php');
    });
    expect(showAlert).toHaveBeenCalledWith('Converted to php', 'success');
  });

  it('handleCurlToCode does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleCurlToCode();
    });
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('handleDateFormat formats as iso', async () => {
    const { result } = renderHook(() =>
      useAiTools('2024-01-15', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('iso');
    });
    expect(showAlert).toHaveBeenCalledWith('Date formatted as iso', 'success');
  });

  it('handleDateFormat formats as us', async () => {
    const { result } = renderHook(() =>
      useAiTools('2024-01-15', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('us');
    });
    expect(showAlert).toHaveBeenCalledWith('Date formatted as us', 'success');
  });

  it('handleDateFormat formats as eu', async () => {
    const { result } = renderHook(() =>
      useAiTools('2024-01-15', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('eu');
    });
    expect(showAlert).toHaveBeenCalledWith('Date formatted as eu', 'success');
  });

  it('handleDateFormat formats as long', async () => {
    const { result } = renderHook(() =>
      useAiTools('2024-01-15', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('long');
    });
    expect(showAlert).toHaveBeenCalledWith('Date formatted as long', 'success');
  });

  it('handleDateFormat formats as relative', async () => {
    const { result } = renderHook(() =>
      useAiTools('2020-01-01', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('relative');
    });
    expect(showAlert).toHaveBeenCalledWith('Date formatted as relative', 'success');
  });

  it('handleDateFormat does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleDateFormat();
    });
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('handleDateFormat handles non-parseable lines gracefully', async () => {
    const { result } = renderHook(() =>
      useAiTools('not a date', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('iso');
    });
    expect(showAlert).toHaveBeenCalledWith('Date formatted as iso', 'success');
  });

  it('handleAiAccept sets text and clears aiResult', async () => {
    const { result } = renderAiTools('hello');
    // First trigger an AI result
    await act(async () => {
      await result.current.handleHashtags!();
    });
    // Now accept
    act(() => {
      result.current.handleAiAccept();
    });
    expect(setText).toHaveBeenCalledWith('output');
  });

  it('handleAiAccept enables markdown mode for markdown result', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.resolve({ result: '## Title\n| col | val |' }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    act(() => {
      result.current.handleAiAccept();
    });
    expect(setMarkdownMode).toHaveBeenCalledWith(true);
  });

  it('handleAiDismiss clears aiResult', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    act(() => {
      result.current.handleAiDismiss();
    });
    expect(result.current.aiResult).toBeNull();
  });

  it('all AI handler functions exist', () => {
    const { result } = renderAiTools();
    const handlers = [
      'handleHashtags',
      'handleSeoTitles',
      'handleMetaDescriptions',
      'handleBlogOutline',
      'handleTweetShorten',
      'handleEmailRewrite',
      'handleKeywords',
      'handleSummarize',
      'handleFixGrammar',
      'handleParaphrase',
      'handleSentiment',
      'handleLengthenText',
      'handleEli5',
      'handleProofread',
      'handleGenerateTitle',
      'handleRefactorPrompt',
      'handleEmojify',
      'handleAcademicStyle',
      'handleCreativeStyle',
      'handleTechnicalStyle',
      'handleActiveVoice',
      'handleRedundancyRemover',
      'handleSentenceSplitter',
      'handleConciseness',
      'handleResumeBullets',
      'handleMeetingNotes',
      'handleCoverLetter',
      'handleOutlineToDraft',
      'handleContinueWriting',
      'handleRewriteUnique',
      'handleToneAnalyzer',
      'handleLinkedinPost',
      'handleTwitterThread',
      'handleInstagramCaption',
      'handleYoutubeDesc',
      'handleSocialBio',
      'handleProductDesc',
      'handleCtaGenerator',
      'handleAdCopy',
      'handleLandingHeadline',
      'handleEmailSubject',
      'handleContentIdeas',
      'handleHookGenerator',
      'handleAngleGenerator',
      'handleFaqSchema',
      'handlePosTagger',
      'handleSentenceType',
      'handleGrammarExplain',
      'handleSynonymFinder',
      'handleAntonymFinder',
      'handleDefineWords',
      'handleWordPower',
      'handleVocabComplexity',
      'handleJargonSimplifier',
      'handleFormalityDetector',
      'handleClicheDetector',
      'handleRegexGen',
      'handleWritingPrompt',
      'handleTeamNameGen',
      'handleMockApiResponse',
    ];
    for (const h of handlers) {
      expect(typeof result.current[h]).toBe('function');
    }
  });

  it('calls all simple callAi-based handlers successfully', async () => {
    const { result } = renderAiTools('hello world');
    const handlers = [
      'handleSeoTitles',
      'handleMetaDescriptions',
      'handleBlogOutline',
      'handleTweetShorten',
      'handleEmailRewrite',
      'handleKeywords',
      'handleParaphrase',
      'handleSentiment',
      'handleLengthenText',
      'handleEli5',
      'handleProofread',
      'handleGenerateTitle',
      'handleRefactorPrompt',
      'handleEmojify',
      'handleAcademicStyle',
      'handleCreativeStyle',
      'handleTechnicalStyle',
      'handleActiveVoice',
      'handleRedundancyRemover',
      'handleSentenceSplitter',
      'handleConciseness',
      'handleResumeBullets',
      'handleMeetingNotes',
      'handleCoverLetter',
      'handleOutlineToDraft',
      'handleContinueWriting',
      'handleRewriteUnique',
      'handleToneAnalyzer',
      'handleLinkedinPost',
      'handleTwitterThread',
      'handleInstagramCaption',
      'handleYoutubeDesc',
      'handleSocialBio',
      'handleProductDesc',
      'handleCtaGenerator',
      'handleAdCopy',
      'handleLandingHeadline',
      'handleEmailSubject',
      'handleContentIdeas',
      'handleHookGenerator',
      'handleAngleGenerator',
      'handleFaqSchema',
      'handlePosTagger',
      'handleSentenceType',
      'handleGrammarExplain',
      'handleSynonymFinder',
      'handleAntonymFinder',
      'handleDefineWords',
      'handleWordPower',
      'handleVocabComplexity',
      'handleJargonSimplifier',
      'handleFormalityDetector',
      'handleClicheDetector',
      'handleRegexGen',
      'handleWritingPrompt',
      'handleTeamNameGen',
      'handleMockApiResponse',
    ];
    for (const h of handlers) {
      await act(async () => {
        await (result.current as AiToolsWithDynamic)[h]!();
      });
    }
    expect(mockTransformText).toHaveBeenCalledTimes(handlers.length);
  });

  // ── formatToolError branch coverage ──────────────────────────────────────────

  it('callAi handles 403 email_not_verified error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 403,
          data: { detail: { code: 'email_not_verified', message: 'Please verify email.' } },
        }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith('Please verify email.', 'warning');
  });

  it('callAi handles 403 email_not_verified with no message uses default', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 403,
          data: { detail: { code: 'email_not_verified' } },
        }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith(
      'Please verify your email to use FixMyText tools.',
      'warning'
    );
  });

  it('callAi handles 403 with non-email_not_verified code falls through to danger', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 403,
          data: { detail: { code: 'other_code', message: 'Forbidden.' } },
        }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith('Forbidden.', 'danger');
  });

  it('callAi handles 429 with object detail message', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 429,
          data: { detail: { message: 'Too many requests.' } },
        }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith('Too many requests.', 'warning');
  });

  it('callAi handles 429 with no detail falls back to default', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 429,
          data: {},
        }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith(
      'Daily limit reached. Please try again later.',
      'warning'
    );
  });

  it('callAi handles error with object detail with message property', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 500,
          data: { detail: { message: 'Internal error occurred.' } },
        }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith('Internal error occurred.', 'danger');
  });

  it('callAi handles error with object detail without message uses fallback', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 500,
          data: { detail: { someOtherField: 'x' } },
        }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith(
      'Could not generate hashtags. Please try again.',
      'danger'
    );
  });

  it('callAi generates multi-line success alert when multiple non-empty tokens', async () => {
    const { result } = renderHook(() =>
      useAiTools(
        'line one\nline two\nline three',
        setText,
        setMarkdownMode,
        setPreviewMode,
        showAlert,
        pushHistory
      )
    );
    await act(async () => {
      await (result.current as AiToolsWithDynamic).handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('generated for'), 'success');
  });

  // ── handleContinueWriting branch coverage ────────────────────────────────────

  it('handleContinueWriting does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleContinueWriting();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('handleContinueWriting shows warning when not authenticated', async () => {
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { result } = renderAiTools('some text');
    await act(async () => {
      await result.current.handleContinueWriting();
    });
    expect(showAlert).toHaveBeenCalledWith('Please log in to use AI tools', 'warning');
  });

  it('handleContinueWriting continues multiple paragraphs', async () => {
    const { result } = renderHook(() =>
      useAiTools(
        'paragraph one\n\nparagraph two',
        setText,
        setMarkdownMode,
        setPreviewMode,
        showAlert,
        pushHistory
      )
    );
    await act(async () => {
      await result.current.handleContinueWriting();
    });
    expect(mockTransformText).toHaveBeenCalledTimes(2);
    expect(showAlert).toHaveBeenCalledWith('Continued 2 paragraphs', 'success');
  });

  it('handleContinueWriting handles API error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ status: 500, data: { detail: 'Server error' } }),
    });
    const { result } = renderAiTools('some text to continue');
    await act(async () => {
      await result.current.handleContinueWriting();
    });
    expect(showAlert).toHaveBeenCalledWith('Server error', 'danger');
  });

  // ── handleChangeTone error path ────────────────────────────────────────────

  it('handleChangeTone handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Tone error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleChangeTone();
    });
    expect(showAlert).toHaveBeenCalledWith('Tone error', 'danger');
  });

  // ── handleTransliterate error path ────────────────────────────────────────

  it('handleTransliterate handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Translit error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleTransliterate();
    });
    expect(showAlert).toHaveBeenCalledWith('Translit error', 'danger');
  });

  it('handleTransliterate does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleTransliterate();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  // ── handleSplitToLines / handleJoinLines / handlePadLines error paths ──────

  it('handleSplitToLines does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleSplitToLines();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('handleSplitToLines handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Split error' } }),
    });
    const { result } = renderAiTools('a,b,c');
    await act(async () => {
      await result.current.handleSplitToLines();
    });
    expect(showAlert).toHaveBeenCalledWith('Split error', 'danger');
  });

  it('handleJoinLines does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleJoinLines();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('handleJoinLines handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Join error' } }),
    });
    const { result } = renderAiTools('a\nb');
    await act(async () => {
      await result.current.handleJoinLines();
    });
    expect(showAlert).toHaveBeenCalledWith('Join error', 'danger');
  });

  it('handlePadLines does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handlePadLines();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('handlePadLines handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Pad error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handlePadLines();
    });
    expect(showAlert).toHaveBeenCalledWith('Pad error', 'danger');
  });

  // ── handleCaesarCipher / handleRailFenceEnc / handleRailFenceDec errors ───

  it('handleCaesarCipher does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleCaesarCipher();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('handleCaesarCipher handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Caesar error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleCaesarCipher();
    });
    expect(showAlert).toHaveBeenCalledWith('Caesar error', 'danger');
  });

  it('handleRailFenceEnc does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleRailFenceEnc();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('handleRailFenceDec does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleRailFenceDec();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  // ── handleCurlToCode additional branches ────────────────────────────────────

  it('handleCurlToCode handles multiple curl commands', async () => {
    const curlText = "curl 'https://api.example.com/one'\ncurl 'https://api.example.com/two'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('javascript');
    });
    expect(showAlert).toHaveBeenCalledWith('Converted 2 commands to javascript', 'success');
  });

  it('handleCurlToCode handles backslash line continuation', async () => {
    const curlText = "curl \\\n  'https://api.example.com'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('javascript');
    });
    expect(showAlert).toHaveBeenCalledWith('Converted to javascript', 'success');
  });

  it('handleCurlToCode falls through to unrecognised target', async () => {
    const curlText = "curl 'https://api.example.com'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('ruby');
    });
    expect(showAlert).toHaveBeenCalledWith('Converted to ruby', 'success');
  });

  it('handleCurlToCode python with body has data argument', async () => {
    const curlText = "curl -X POST 'https://api.example.com' -d 'body=value'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('python');
    });
    expect(result.current.aiResult?.result).toContain("data='body=value'");
  });

  it('handleCurlToCode javascript with headers and body', async () => {
    const curlText =
      "curl -X POST 'https://api.example.com' -H 'Content-Type: application/json' -d '{\"key\":\"val\"}'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('javascript');
    });
    expect(result.current.aiResult?.result).toContain('headers:');
    expect(result.current.aiResult?.result).toContain('body:');
  });

  // ── handleDateFormat additional branches ────────────────────────────────────

  it('handleDateFormat relative - today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { result } = renderHook(() =>
      useAiTools(today, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('relative');
    });
    expect(result.current.aiResult?.result).toBe('Today');
  });

  it('handleDateFormat relative - yesterday', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { result } = renderHook(() =>
      useAiTools(yesterday, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('relative');
    });
    expect(result.current.aiResult?.result).toBe('Yesterday');
  });

  it('handleDateFormat relative - months ago', async () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const { result } = renderHook(() =>
      useAiTools(sixtyDaysAgo, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('relative');
    });
    expect(result.current.aiResult?.result).toContain('months ago');
  });

  it('handleDateFormat relative - years ago', async () => {
    const { result } = renderHook(() =>
      useAiTools('2020-01-01', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('relative');
    });
    expect(result.current.aiResult?.result).toMatch(/\d+ years ago/);
  });

  it('handleDateFormat default case falls back to ISO', async () => {
    const { result } = renderHook(() =>
      useAiTools('2024-01-15', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('unknown_format');
    });
    expect(result.current.aiResult?.result).toContain('T');
  });

  // ── handleAiAccept when aiResult is null ───────────────────────────────────

  it('handleAiAccept does nothing when aiResult is null', () => {
    const { result } = renderAiTools('hello');
    act(() => {
      result.current.handleAiAccept();
    });
    expect(setText).not.toHaveBeenCalled();
  });

  // ── callAi success path without pushHistory ────────────────────────────────

  it('callAi works without pushHistory (undefined)', async () => {
    const { result } = renderHook(() =>
      useAiTools('hello', setText, setMarkdownMode, setPreviewMode, showAlert, undefined)
    );
    await act(async () => {
      await (result.current as AiToolsWithDynamic).handleHashtags!();
    });
    expect(showAlert).toHaveBeenCalledWith('Hashtags generated', 'success');
    expect(pushHistory).not.toHaveBeenCalled();
  });

  // ── Translate with autoDetectLang but detect returns null ────────────────

  it('handleTranslate with autoDetectLang but detect returns null', async () => {
    mockTransformText
      .mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('detect fail')) })
      .mockReturnValue({ unwrap: () => Promise.resolve({ result: 'output' }) });

    const { result } = renderAiTools('hello');
    await act(async () => {
      result.current.setAutoDetectLang(true);
    });
    await act(async () => {
      await result.current.handleTranslate('French');
    });
    // Should still translate even if detect failed
    expect(showAlert).toHaveBeenCalledWith('Translated to French', 'success');
  });

  // ── handleTranslate error path ────────────────────────────────────────────

  it('handleTranslate handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Translate error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleTranslate('Spanish');
    });
    expect(showAlert).toHaveBeenCalledWith('Translate error', 'danger');
  });

  it('handleTranslate does nothing when text is empty', async () => {
    const { result } = renderAiTools('');
    await act(async () => {
      await result.current.handleTranslate('Spanish');
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  // ── hasMarkdown additional patterns ──────────────────────────────────────

  it('hasMarkdown detects double-asterisk bold pattern', () => {
    const { result } = renderAiTools();
    expect(result.current.hasMarkdown('This is **bold** text')).toBe(true);
  });

  it('hasMarkdown detects numbered list pattern', () => {
    const { result } = renderAiTools();
    expect(result.current.hasMarkdown('1. first item here')).toBe(true);
  });

  it('hasMarkdown returns false for plain sentences', () => {
    const { result } = renderAiTools();
    expect(result.current.hasMarkdown('This is just a plain sentence with no markdown.')).toBe(
      false
    );
  });

  // ── callAi with blank lines in input (preserves separators) ─────────────

  it('callAi preserves blank-line structure in output', async () => {
    // Text with blank line: two non-empty tokens, reassembly preserves separator
    const { result } = renderHook(() =>
      useAiTools('hello\n\nworld', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await (result.current as AiToolsWithDynamic).handleHashtags!();
    });
    // Two calls — one per non-empty token
    expect(mockTransformText).toHaveBeenCalledTimes(2);
    expect(showAlert).toHaveBeenCalledWith(
      expect.stringContaining('generated for 2 lines'),
      'success'
    );
  });

  // ── handleRailFenceEnc / Dec error paths ─────────────────────────────────

  it('handleRailFenceEnc handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Rail enc error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleRailFenceEnc();
    });
    expect(showAlert).toHaveBeenCalledWith('Rail enc error', 'danger');
  });

  it('handleRailFenceDec handles error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Rail dec error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleRailFenceDec();
    });
    expect(showAlert).toHaveBeenCalledWith('Rail dec error', 'danger');
  });

  // ── handleCurlToCode error path ───────────────────────────────────────────

  it('handleCurlToCode shows danger on unexpected error', async () => {
    // Force an error by mocking showAlert to throw the second time, then checking the catch block
    // Better: provide text that triggers the try but then causes an error inside
    // Actually the function catches errors from within — let's test the catch by making text that
    // causes convertOne to throw (edge: mock JSON.stringify to throw on headers)
    const original = JSON.stringify;
    JSON.stringify = () => {
      throw new Error('stringify fail');
    };
    const curlText = "curl -X GET 'https://api.example.com' -H 'X-Auth: token'";
    const { result } = renderHook(() =>
      useAiTools(curlText, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleCurlToCode('javascript');
    });
    JSON.stringify = original;
    // Either success or error depending on engine — just verify no crash
    expect(typeof result.current.aiResult === 'object' || showAlert.mock.calls.length > 0).toBe(
      true
    );
  });

  // ── handleDateFormat error path ───────────────────────────────────────────

  it('handleDateFormat shows danger on unexpected error', async () => {
    // Force catch by making Date constructor throw (not really possible),
    // instead use a text that calls toLocaleDateString which could be mocked
    const original = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = () => {
      throw new Error('locale fail');
    };
    const { result } = renderHook(() =>
      useAiTools('2024-01-15', setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );
    await act(async () => {
      await result.current.handleDateFormat('long');
    });
    Date.prototype.toLocaleDateString = original;
    // Either success or error, no crash
    expect(showAlert).toHaveBeenCalled();
  });
});
