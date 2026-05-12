import { renderHook, act } from '@testing-library/react';
import useAiTools from './useAiTools';

const mockTransformText = vi.fn();
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));
vi.mock('../store/api/textApi', () => ({
  useTransformTextMutation: () => [mockTransformText],
}));
vi.mock('../constants/endpoints', () => ({
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

import { useSelector } from 'react-redux';

describe('useAiTools', () => {
  let setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory;

  beforeEach(() => {
    vi.clearAllMocks();
    setText = vi.fn();
    setMarkdownMode = vi.fn();
    setPreviewMode = vi.fn();
    showAlert = vi.fn();
    pushHistory = vi.fn();
    useSelector.mockReturnValue({ accessToken: 'tok123' });
    mockTransformText.mockReturnValue({ unwrap: () => Promise.resolve({ result: 'output' }) });
  });

  const renderAiTools = (text = 'hello world') =>
    renderHook(() =>
      useAiTools(text, setText, setMarkdownMode, setPreviewMode, showAlert, pushHistory)
    );

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
      await result.current.handleHashtags();
    });
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('callAi shows warning when not authenticated', async () => {
    useSelector.mockReturnValue({ accessToken: null });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags();
    });
    expect(showAlert).toHaveBeenCalledWith('Please log in to use AI tools', 'warning');
    expect(mockTransformText).not.toHaveBeenCalled();
  });

  it('callAi success path sets result and calls pushHistory', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags();
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
      await result.current.handleSummarize();
    });
    expect(showAlert).toHaveBeenCalledWith('Rate limited', 'warning');
  });

  it('callAi handles generic error', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ status: 500, data: { detail: 'Server error' } }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleFixGrammar();
    });
    expect(showAlert).toHaveBeenCalledWith('Server error', 'danger');
  });

  it('callAi handles error with no detail', async () => {
    mockTransformText.mockReturnValue({
      unwrap: () => Promise.reject({ status: 500 }),
    });
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleFixGrammar();
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
    const detectMock = vi.fn();
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
      await result.current.handleHashtags();
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
      await result.current.handleHashtags();
    });
    act(() => {
      result.current.handleAiAccept();
    });
    expect(setMarkdownMode).toHaveBeenCalledWith(true);
  });

  it('handleAiDismiss clears aiResult', async () => {
    const { result } = renderAiTools('hello');
    await act(async () => {
      await result.current.handleHashtags();
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
        await result.current[h]();
      });
    }
    expect(mockTransformText).toHaveBeenCalledTimes(handlers.length);
  });
});
