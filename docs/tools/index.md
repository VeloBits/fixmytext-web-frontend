# Tool Reference Index

> Complete reference for all 254 tools available in FixMyText, organised by group.

## Summary

| Attribute                         | Value   |
| --------------------------------- | ------- |
| Total tools                       | **254** |
| Groups                            | **14**  |
| `api` type (backend REST call)    | 90      |
| `ai` type (backend AI service)    | 60      |
| `local` type (browser-only)       | 60      |
| `drawer` type (opens panel)       | 32      |
| `select` type (dropdown selector) | 12      |

Tool definitions live in `src/constants/tools.js`. Endpoint path constants are in `src/constants/endpoints.js`.

**Table columns:**

- **id** — unique snake_case identifier; matches the `tool_id` in backend routes
- **label** — display name shown in the UI
- **type** — execution model (`api`, `ai`, `local`, `select`, `action`, `drawer`)
- **endpoint** — backend route called for `api` types; `—` for browser-local or UI-only tools

---

## Case Transform (24 tools)

| id                 | label            | type | endpoint                         |
| ------------------ | ---------------- | ---- | -------------------------------- |
| `alternating_case` | aLtErNaTiNg      | api  | `/api/v1/text/alternating-case`  |
| `ap_title_case`    | AP Title Case    | api  | `/api/v1/text/ap-title-case`     |
| `camel_case`       | camelCase        | api  | `/api/v1/text/lower-camel-case`  |
| `capitalize_words` | Capitalize Words | api  | `/api/v1/text/capitalize-words`  |
| `cobol_case`       | COBOL-CASE       | api  | `/api/v1/text/cobol-case`        |
| `constant_case`    | CONSTANT_CASE    | api  | `/api/v1/text/constant-case`     |
| `dot_case`         | dot.case         | api  | `/api/v1/text/dot-case`          |
| `flat_case`        | flatcase         | api  | `/api/v1/text/flat-case`         |
| `inverse_word`     | Inverse Word     | api  | `/api/v1/text/inverse-word-case` |
| `kebab_case`       | kebab-case       | api  | `/api/v1/text/kebab-case`        |
| `lowercase`        | Lowercase        | api  | `/api/v1/text/lowercase`         |
| `pascal_case`      | PascalCase       | api  | `/api/v1/text/upper-camel-case`  |
| `path_case`        | path/case        | api  | `/api/v1/text/path-case`         |
| `sentence_case`    | Sentence Case    | api  | `/api/v1/text/sentencecase`      |
| `small_caps`       | Small Caps       | api  | `/api/v1/text/small-caps`        |
| `snake_case`       | snake_case       | api  | `/api/v1/text/snake-case`        |
| `strikethrough`    | Strikethrough    | api  | `/api/v1/text/strikethrough`     |
| `swap_word_case`   | Swap Words       | api  | `/api/v1/text/swap-word-case`    |
| `title_case`       | Title Case       | api  | `/api/v1/text/titlecase`         |
| `toggle_case`      | Toggle Case      | api  | `/api/v1/text/inversecase`       |
| `train_case`       | Train-Case       | api  | `/api/v1/text/train-case`        |
| `upside_down`      | Upside Down      | api  | `/api/v1/text/upside-down`       |
| `uppercase`        | UPPERCASE        | api  | `/api/v1/text/uppercase`         |
| `wide_text`        | Wide Text        | api  | `/api/v1/text/wide-text`         |

---

## Text Cleanup (18 tools)

| id                  | label                 | type | endpoint                             |
| ------------------- | --------------------- | ---- | ------------------------------------ |
| `no_accents`        | No Accents            | api  | `/api/v1/text/remove-accents`        |
| `no_breaks`         | No Line Breaks        | api  | `/api/v1/text/remove-line-breaks`    |
| `strip_all`         | Strip All Spaces      | api  | `/api/v1/text/remove-all-spaces`     |
| `strip_html`        | Strip HTML            | api  | `/api/v1/text/strip-html`            |
| `toggle_quotes`     | Toggle Quotes         | api  | `/api/v1/text/toggle-smart-quotes`   |
| `trim_extra`        | Trim Extra Spaces     | api  | `/api/v1/text/remove-extra-spaces`   |
| `strip_invisible`   | Strip Invisible Chars | api  | `/api/v1/text/strip-invisible`       |
| `strip_emoji`       | Strip Emoji           | api  | `/api/v1/text/strip-emoji`           |
| `normalize_ws`      | Normalize Whitespace  | api  | `/api/v1/text/normalize-whitespace`  |
| `strip_non_ascii`   | ASCII Only            | api  | `/api/v1/text/strip-non-ascii`       |
| `fix_line_endings`  | Fix Line Endings      | api  | `/api/v1/text/fix-line-endings`      |
| `strip_markdown`    | Strip Markdown        | api  | `/api/v1/text/strip-markdown`        |
| `trim_lines`        | Trim Each Line        | api  | `/api/v1/text/trim-lines`            |
| `strip_empty_lines` | Remove Empty Lines    | api  | `/api/v1/text/strip-empty-lines`     |
| `strip_urls`        | Remove URLs           | api  | `/api/v1/text/strip-urls`            |
| `strip_emails`      | Remove Emails         | api  | `/api/v1/text/strip-emails`          |
| `normalize_punct`   | Fix Punctuation       | api  | `/api/v1/text/normalize-punctuation` |
| `strip_numbers`     | Remove Numbers        | api  | `/api/v1/text/strip-numbers`         |

---

## Lines & Sort (19 tools)

| id                     | label                 | type   | endpoint                              |
| ---------------------- | --------------------- | ------ | ------------------------------------- |
| `deduplicate`          | Deduplicate           | api    | `/api/v1/text/remove-duplicate-lines` |
| `find_replace`         | Find & Replace        | drawer | —                                     |
| `number_lines`         | Number Lines          | api    | `/api/v1/text/number-lines`           |
| `reverse`              | Reverse               | api    | `/api/v1/text/reverse`                |
| `reverse_lines`        | Reverse Lines         | api    | `/api/v1/text/reverse-lines`          |
| `sort_asc`             | Sort A→Z              | api    | `/api/v1/text/sort-lines-asc`         |
| `sort_desc`            | Sort Z→A              | api    | `/api/v1/text/sort-lines-desc`        |
| `shuffle_lines`        | Shuffle Lines         | api    | `/api/v1/text/shuffle-lines`          |
| `sort_by_length`       | Sort by Length        | api    | `/api/v1/text/sort-by-length`         |
| `sort_numeric`         | Sort 1→9              | api    | `/api/v1/text/sort-numeric`           |
| `line_frequency`       | Line Frequency        | api    | `/api/v1/text/line-frequency`         |
| `split_to_lines`       | Split to Lines        | select | —                                     |
| `join_lines`           | Join Lines            | select | —                                     |
| `pad_lines`            | Pad Lines             | select | —                                     |
| `wrap_lines`           | Wrap Lines            | drawer | —                                     |
| `filter_lines_contain` | Keep Lines Containing | drawer | —                                     |
| `remove_lines_contain` | Drop Lines Containing | drawer | —                                     |
| `truncate_lines`       | Truncate Lines        | drawer | —                                     |
| `extract_nth_lines`    | Every Nth Line        | drawer | —                                     |

---

## Encode / Decode (16 tools)

| id              | label            | type | endpoint                        |
| --------------- | ---------------- | ---- | ------------------------------- |
| `base64_enc`    | Base64 Encode    | api  | `/api/v1/text/base64-encode`    |
| `base64_dec`    | Base64 Decode    | api  | `/api/v1/text/base64-decode`    |
| `hex_enc`       | Hex Encode       | api  | `/api/v1/text/hex-encode`       |
| `hex_dec`       | Hex Decode       | api  | `/api/v1/text/hex-decode`       |
| `binary_enc`    | Binary Encode    | api  | `/api/v1/text/binary-encode`    |
| `binary_dec`    | Binary Decode    | api  | `/api/v1/text/binary-decode`    |
| `octal_enc`     | Octal Encode     | api  | `/api/v1/text/octal-encode`     |
| `octal_dec`     | Octal Decode     | api  | `/api/v1/text/octal-decode`     |
| `decimal_enc`   | Decimal Encode   | api  | `/api/v1/text/decimal-encode`   |
| `decimal_dec`   | Decimal Decode   | api  | `/api/v1/text/decimal-decode`   |
| `url_enc`       | URL Encode       | api  | `/api/v1/text/url-encode`       |
| `url_dec`       | URL Decode       | api  | `/api/v1/text/url-decode`       |
| `morse_enc`     | Morse Encode     | api  | `/api/v1/text/morse-encode`     |
| `morse_dec`     | Morse Decode     | api  | `/api/v1/text/morse-decode`     |
| `brainfuck_enc` | Brainfuck Encode | api  | `/api/v1/text/brainfuck-encode` |
| `brainfuck_dec` | Brainfuck Decode | api  | `/api/v1/text/brainfuck-decode` |

---

## Escape / Unescape (6 tools)

| id              | label            | type | endpoint                        |
| --------------- | ---------------- | ---- | ------------------------------- |
| `html_esc`      | HTML Escape      | api  | `/api/v1/text/html-escape`      |
| `html_unesc`    | HTML Unescape    | api  | `/api/v1/text/html-unescape`    |
| `json_esc`      | JSON Escape      | api  | `/api/v1/text/json-escape`      |
| `json_unesc`    | JSON Unescape    | api  | `/api/v1/text/json-unescape`    |
| `unicode_esc`   | Unicode Escape   | api  | `/api/v1/text/unicode-escape`   |
| `unicode_unesc` | Unicode Unescape | api  | `/api/v1/text/unicode-unescape` |

---

## Hashing & Checksums (22 tools)

All hashing tools run entirely in the browser (`local` type) — no backend call is made.

| id            | label       | type  | endpoint |
| ------------- | ----------- | ----- | -------- |
| `md5`         | MD5         | local | —        |
| `sha1`        | SHA-1       | local | —        |
| `sha224`      | SHA-224     | local | —        |
| `sha256`      | SHA-256     | local | —        |
| `sha384`      | SHA-384     | local | —        |
| `sha512`      | SHA-512     | local | —        |
| `sha512_224`  | SHA-512/224 | local | —        |
| `sha512_256`  | SHA-512/256 | local | —        |
| `sha3_224`    | SHA3-224    | local | —        |
| `sha3_256`    | SHA3-256    | local | —        |
| `sha3_384`    | SHA3-384    | local | —        |
| `sha3_512`    | SHA3-512    | local | —        |
| `keccak256`   | Keccak-256  | local | —        |
| `ripemd160`   | RIPEMD-160  | local | —        |
| `blake2b`     | BLAKE2b     | local | —        |
| `blake2s`     | BLAKE2s     | local | —        |
| `whirlpool`   | Whirlpool   | local | —        |
| `crc32`       | CRC32       | local | —        |
| `adler32`     | Adler-32    | local | —        |
| `fnv1a`       | FNV-1a      | local | —        |
| `xxhash`      | xxHash      | local | —        |
| `murmurhash3` | MurmurHash3 | local | —        |

---

## Ciphers & Crypto (20 tools)

| id                       | label                  | type   | endpoint                          |
| ------------------------ | ---------------------- | ------ | --------------------------------- |
| `rot13`                  | ROT13                  | api    | `/api/v1/text/rot13`              |
| `atbash`                 | Atbash                 | api    | `/api/v1/text/atbash`             |
| `caesar_cipher`          | Caesar Cipher          | select | —                                 |
| `vigenere_enc`           | Vigenere Encrypt       | drawer | —                                 |
| `vigenere_dec`           | Vigenere Decrypt       | drawer | —                                 |
| `rail_fence_enc`         | Rail Fence Encrypt     | select | —                                 |
| `rail_fence_dec`         | Rail Fence Decrypt     | select | —                                 |
| `playfair_enc`           | Playfair Encrypt       | drawer | —                                 |
| `substitution_cipher`    | Substitution Cipher    | drawer | —                                 |
| `columnar_transposition` | Columnar Transposition | drawer | —                                 |
| `base32_enc`             | Base32 Encode          | api    | `/api/v1/text/base32-encode`      |
| `base32_dec`             | Base32 Decode          | api    | `/api/v1/text/base32-decode`      |
| `ascii85_enc`            | Ascii85 Encode         | api    | `/api/v1/text/ascii85-encode`     |
| `ascii85_dec`            | Ascii85 Decode         | api    | `/api/v1/text/ascii85-decode`     |
| `frequency_analysis`     | Frequency Analysis     | local  | —                                 |
| `caesar_brute_force`     | Caesar Brute Force     | api    | `/api/v1/text/caesar-brute-force` |
| `nato_phonetic`          | NATO Phonetic          | api    | `/api/v1/text/nato-phonetic`      |
| `bacon_cipher`           | Bacon Cipher           | api    | `/api/v1/text/bacon-cipher`       |
| `aes_encrypt`            | AES Encrypt            | drawer | —                                 |
| `aes_decrypt`            | AES Decrypt            | drawer | —                                 |

---

## Developer Tools (27 tools)

| id                  | label               | type   | endpoint                    |
| ------------------- | ------------------- | ------ | --------------------------- |
| `css_fmt`           | CSS Format          | local  | —                           |
| `csv_json`          | CSV → JSON          | api    | `/api/v1/text/csv-to-json`  |
| `html_fmt`          | HTML Format         | local  | —                           |
| `js_fmt`            | JavaScript Format   | local  | —                           |
| `json_csv`          | JSON → CSV          | api    | `/api/v1/text/json-to-csv`  |
| `json_fmt`          | JSON Format         | api    | `/api/v1/text/format-json`  |
| `json_yaml`         | JSON → YAML         | api    | `/api/v1/text/json-to-yaml` |
| `jwt_decode`        | JWT Decode          | local  | —                           |
| `regex_test`        | Regex Tester        | drawer | —                           |
| `ts_fmt`            | TypeScript Format   | local  | —                           |
| `sql_fmt`           | SQL Format          | local  | —                           |
| `xml_fmt`           | XML Format          | local  | —                           |
| `md_preview`        | Markdown Preview    | drawer | —                           |
| `json_minify`       | JSON Minify         | local  | —                           |
| `xml_json`          | XML → JSON          | api    | `/api/v1/text/xml-to-json`  |
| `json_to_ts`        | JSON → TypeScript   | local  | —                           |
| `csv_to_table`      | CSV → Table         | api    | `/api/v1/text/csv-to-table` |
| `uuid_gen`          | UUID Generator      | local  | —                           |
| `timestamp_convert` | Timestamp Converter | local  | —                           |
| `color_convert`     | Color Converter     | local  | —                           |
| `lorem_ipsum`       | Lorem Ipsum         | drawer | —                           |
| `ulid_gen`          | ULID Generator      | local  | —                           |
| `cron_explain`      | Cron Explainer      | local  | —                           |
| `curl_to_code`      | cURL → Code         | select | —                           |
| `http_header_parse` | HTTP Header Parser  | local  | —                           |
| `json_path_query`   | JSON Path Query     | drawer | —                           |
| `url_parser`        | URL Parser          | local  | —                           |

---

## AI Writing (24 tools)

AI tools call the backend AI service, which uses the Groq API with a local YAKE fallback when Groq is unavailable.

| id                   | label             | type   | endpoint                          |
| -------------------- | ----------------- | ------ | --------------------------------- |
| `eli5`               | Explain Simply    | ai     | `/api/v1/text/eli5`               |
| `email_rewrite`      | Email Rewrite     | ai     | `/api/v1/text/rewrite-email`      |
| `fix_grammar`        | Fix Grammar       | ai     | `/api/v1/text/fix-grammar`        |
| `lengthen`           | Lengthen          | ai     | `/api/v1/text/lengthen-text`      |
| `paraphrase`         | Paraphrase        | ai     | `/api/v1/text/paraphrase`         |
| `proofread`          | Proofread         | ai     | `/api/v1/text/proofread`          |
| `summarize`          | Summarize         | ai     | `/api/v1/text/summarize`          |
| `change_format`      | Change Format     | select | —                                 |
| `change_tone`        | Change Tone       | select | —                                 |
| `academic_style`     | Academic Style    | ai     | `/api/v1/text/academic-style`     |
| `creative_style`     | Creative Style    | ai     | `/api/v1/text/creative-style`     |
| `technical_style`    | Technical Style   | ai     | `/api/v1/text/technical-style`    |
| `active_voice`       | Active Voice      | ai     | `/api/v1/text/active-voice`       |
| `redundancy_remover` | Remove Redundancy | ai     | `/api/v1/text/redundancy-remover` |
| `sentence_splitter`  | Split Sentences   | ai     | `/api/v1/text/sentence-splitter`  |
| `conciseness`        | Make Concise      | ai     | `/api/v1/text/conciseness`        |
| `resume_bullets`     | Resume Bullets    | ai     | `/api/v1/text/resume-bullets`     |
| `meeting_notes`      | Meeting Notes     | ai     | `/api/v1/text/meeting-notes`      |
| `cover_letter`       | Cover Letter      | ai     | `/api/v1/text/cover-letter`       |
| `outline_to_draft`   | Outline → Draft   | ai     | `/api/v1/text/outline-to-draft`   |
| `continue_writing`   | Continue Writing  | ai     | `/api/v1/text/continue-writing`   |
| `rewrite_unique`     | Rewrite Unique    | ai     | `/api/v1/text/rewrite-unique`     |
| `tone_analyzer`      | Tone Analyzer     | ai     | `/api/v1/text/tone-analyzer`      |
| `emojify`            | Emojify           | ai     | `/api/v1/text/emojify`            |

---

## AI Content (24 tools)

| id                  | label               | type  | endpoint                                  |
| ------------------- | ------------------- | ----- | ----------------------------------------- |
| `blog_outline`      | Blog Outline        | ai    | `/api/v1/text/generate-blog-outline`      |
| `gen_title`         | Generate Title      | ai    | `/api/v1/text/generate-title`             |
| `hashtags`          | Hashtags            | ai    | `/api/v1/text/generate-hashtags`          |
| `keywords`          | Keywords            | ai    | `/api/v1/text/extract-keywords`           |
| `meta_desc`         | Meta Description    | ai    | `/api/v1/text/generate-meta-descriptions` |
| `refactor_prompt`   | Refactor Prompt     | ai    | `/api/v1/text/refactor-prompt`            |
| `seo_titles`        | SEO Title Generator | ai    | `/api/v1/text/generate-seo-titles`        |
| `sentiment`         | Sentiment Analysis  | ai    | `/api/v1/text/analyze-sentiment`          |
| `tweet_shorten`     | Tweet Shorten       | ai    | `/api/v1/text/shorten-for-tweet`          |
| `linkedin_post`     | LinkedIn Post       | ai    | `/api/v1/text/linkedin-post`              |
| `twitter_thread`    | Twitter Thread      | ai    | `/api/v1/text/twitter-thread`             |
| `instagram_caption` | Instagram Caption   | ai    | `/api/v1/text/instagram-caption`          |
| `youtube_desc`      | YouTube Description | ai    | `/api/v1/text/youtube-description`        |
| `social_bio`        | Social Bio          | ai    | `/api/v1/text/social-bio`                 |
| `product_desc`      | Product Description | ai    | `/api/v1/text/product-description`        |
| `cta_generator`     | CTA Generator       | ai    | `/api/v1/text/cta-generator`              |
| `ad_copy`           | Ad Copy             | ai    | `/api/v1/text/ad-copy`                    |
| `landing_headline`  | Landing Headline    | ai    | `/api/v1/text/landing-headline`           |
| `email_subject`     | Email Subject Lines | ai    | `/api/v1/text/email-subject`              |
| `content_ideas`     | Content Ideas       | ai    | `/api/v1/text/content-ideas`              |
| `hook_generator`    | Hook Generator      | ai    | `/api/v1/text/hook-generator`             |
| `angle_generator`   | Angle Generator     | ai    | `/api/v1/text/angle-generator`            |
| `faq_schema`        | FAQ Schema          | ai    | `/api/v1/text/faq-schema`                 |
| `slug_generator`    | URL Slug            | local | —                                         |

---

## Language (14 tools)

| id                   | label              | type   | endpoint                          |
| -------------------- | ------------------ | ------ | --------------------------------- |
| `translate`          | Translate          | select | —                                 |
| `transliterate`      | Transliterate      | select | —                                 |
| `pos_tagger`         | Parts of Speech    | ai     | `/api/v1/text/pos-tagger`         |
| `sentence_type`      | Sentence Type      | ai     | `/api/v1/text/sentence-type`      |
| `grammar_explain`    | Grammar Explainer  | ai     | `/api/v1/text/grammar-explain`    |
| `synonym_finder`     | Synonym Finder     | ai     | `/api/v1/text/synonym-finder`     |
| `antonym_finder`     | Antonym Finder     | ai     | `/api/v1/text/antonym-finder`     |
| `define_words`       | Define Words       | ai     | `/api/v1/text/define-words`       |
| `word_power`         | Power Words        | ai     | `/api/v1/text/word-power`         |
| `reading_level`      | Reading Level      | local  | —                                 |
| `vocab_complexity`   | Vocab Complexity   | ai     | `/api/v1/text/vocab-complexity`   |
| `jargon_simplifier`  | Jargon Simplifier  | ai     | `/api/v1/text/jargon-simplifier`  |
| `formality_detector` | Formality Detector | ai     | `/api/v1/text/formality-detector` |
| `cliche_detector`    | Cliche Detector    | ai     | `/api/v1/text/cliche-detector`    |

---

## Compare (7 tools)

All compare tools open a side-by-side drawer panel (`drawer` type).

| id               | label            | type   | endpoint |
| ---------------- | ---------------- | ------ | -------- |
| `compare`        | Compare          | drawer | —        |
| `char_diff`      | Character Diff   | drawer | —        |
| `word_diff`      | Word Diff        | drawer | —        |
| `similarity_pct` | Similarity Score | drawer | —        |
| `json_diff`      | JSON Diff        | drawer | —        |
| `list_diff`      | List Diff        | drawer | —        |
| `text_overlap`   | Overlap Detector | drawer | —        |

---

## Generate (17 tools)

| id                  | label                | type   | endpoint                           |
| ------------------- | -------------------- | ------ | ---------------------------------- |
| `password`          | Password Generator   | drawer | —                                  |
| `random_text`       | Random Text          | drawer | —                                  |
| `fake_name`         | Fake Names           | drawer | —                                  |
| `fake_email`        | Fake Emails          | drawer | —                                  |
| `fake_address`      | Fake Addresses       | drawer | —                                  |
| `fake_phone`        | Fake Phone Numbers   | drawer | —                                  |
| `fake_data_set`     | Fake Data Set        | drawer | —                                  |
| `nanoid_gen`        | Nano ID              | local  | —                                  |
| `timestamp_gen`     | Timestamp Now        | local  | —                                  |
| `sample_json`       | Sample JSON          | drawer | —                                  |
| `sql_insert_gen`    | SQL INSERT Generator | api    | `/api/v1/text/sql-insert-gen`      |
| `regex_gen`         | Regex Generator      | ai     | `/api/v1/text/regex-generator`     |
| `writing_prompt`    | Writing Prompt       | ai     | `/api/v1/text/writing-prompt`      |
| `team_name_gen`     | Team Name Generator  | ai     | `/api/v1/text/team-name-generator` |
| `username_gen`      | Username Generator   | local  | —                                  |
| `placeholder_img`   | Placeholder Image    | local  | —                                  |
| `mock_api_response` | Mock API Response    | ai     | `/api/v1/text/mock-api-response`   |

---

## Utilities (16 tools)

| id                | label           | type   | endpoint |
| ----------------- | --------------- | ------ | -------- |
| `word_freq`       | Word Frequency  | local  | —        |
| `reading_time`    | Reading Time    | local  | —        |
| `char_count`      | Character Count | local  | —        |
| `text_stats`      | Text Statistics | local  | —        |
| `duplicate_words` | Duplicate Words | local  | —        |
| `overused_words`  | Overused Words  | local  | —        |
| `num_to_words`    | Number → Words  | local  | —        |
| `words_to_num`    | Words → Number  | local  | —        |
| `date_format`     | Date Formatter  | select | —        |
| `roman_numeral`   | Roman Numerals  | local  | —        |
| `qr_from_text`    | QR Code         | local  | —        |
| `md_to_html`      | Markdown → HTML | local  | —        |
| `text_to_table`   | Text → Table    | local  | —        |
| `extract_emails`  | Extract Emails  | local  | —        |
| `extract_urls`    | Extract URLs    | local  | —        |
| `extract_numbers` | Extract Numbers | local  | —        |
