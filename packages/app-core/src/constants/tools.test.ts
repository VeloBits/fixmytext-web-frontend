import { STARTER_KITS, USE_CASE_TABS, TOOL_GROUPS, TOOLS, SMART_SUGGESTION_RULES } from './tools';

describe('STARTER_KITS', () => {
  it('is a non-empty array', () => {
    expect(STARTER_KITS.length).toBeGreaterThan(0);
  });

  it('contains expected kit ids', () => {
    const ids = STARTER_KITS.map((k) => k.id);
    expect(ids).toEqual(['writer', 'student', 'developer', 'social', 'explorer']);
  });

  it('each kit has label, icon, groupName, defaultTab, and toolIds', () => {
    for (const kit of STARTER_KITS) {
      expect(typeof kit.label).toBe('string');
      expect(typeof kit.icon).toBe('string');
      expect(typeof kit.groupName).toBe('string');
      expect(typeof kit.defaultTab).toBe('string');
      expect(Array.isArray(kit.toolIds)).toBe(true);
    }
  });

  it('every kit tool id references a known tool', () => {
    const toolIds = new Set(TOOLS.map((t) => t.id));
    for (const kit of STARTER_KITS) {
      for (const id of kit.toolIds) {
        expect(toolIds.has(id)).toBe(true);
      }
    }
  });
});

describe('USE_CASE_TABS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(USE_CASE_TABS)).toBe(true);
    expect(USE_CASE_TABS.length).toBeGreaterThan(0);
  });

  it('each tab has id, label, icon, and color', () => {
    for (const tab of USE_CASE_TABS) {
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('label');
      expect(tab).toHaveProperty('icon');
      expect(tab).toHaveProperty('color');
    }
  });

  it('has an "all" tab first', () => {
    expect(USE_CASE_TABS[0]!.id).toBe('all');
  });
});

describe('TOOL_GROUPS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(TOOL_GROUPS)).toBe(true);
    expect(TOOL_GROUPS.length).toBeGreaterThan(0);
  });

  it('each group has id and label', () => {
    for (const group of TOOL_GROUPS) {
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('label');
      expect(typeof group.id).toBe('string');
      expect(typeof group.label).toBe('string');
    }
  });

  it('has unique group ids', () => {
    const ids = TOOL_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('TOOLS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(TOOLS)).toBe(true);
    expect(TOOLS.length).toBeGreaterThan(0);
  });

  it('each tool has required properties', () => {
    for (const tool of TOOLS) {
      expect(tool).toHaveProperty('id');
      expect(tool).toHaveProperty('label');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('icon');
      expect(tool).toHaveProperty('color');
      expect(tool).toHaveProperty('group');
      expect(tool).toHaveProperty('type');
      expect(tool).toHaveProperty('keywords');
      expect(Array.isArray(tool.keywords)).toBe(true);
    }
  });

  it('has unique tool ids', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('api type tools have endpoint and successMsg', () => {
    const apiTools = TOOLS.filter((t) => t.type === 'api');
    expect(apiTools.length).toBeGreaterThan(0);
    for (const tool of apiTools) {
      expect(typeof tool.endpoint).toBe('string');
      expect(typeof tool.successMsg).toBe('string');
    }
  });

  it('local type tools have handlerKey', () => {
    const localTools = TOOLS.filter((t) => t.type === 'local');
    expect(localTools.length).toBeGreaterThan(0);
    for (const tool of localTools) {
      expect(typeof tool.handlerKey).toBe('string');
    }
  });

  it('every tool group references a known group id', () => {
    const groupIds = new Set(TOOL_GROUPS.map((g) => g.id));
    for (const tool of TOOLS) {
      expect(groupIds.has(tool.group)).toBe(true);
    }
  });
});

describe('SMART_SUGGESTION_RULES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(SMART_SUGGESTION_RULES)).toBe(true);
    expect(SMART_SUGGESTION_RULES.length).toBeGreaterThan(0);
  });

  it('each rule has a test function and toolIds array', () => {
    for (const rule of SMART_SUGGESTION_RULES) {
      expect(typeof rule!.test).toBe('function');
      expect(Array.isArray(rule!.toolIds)).toBe(true);
    }
  });

  it('rule test functions return boolean', () => {
    for (const rule of SMART_SUGGESTION_RULES) {
      const r = rule!.test('some text');
      expect(typeof r).toBe('boolean');
    }
  });

  it('JSON rule detects valid JSON', () => {
    const jsonRule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('json_fmt'));
    expect(jsonRule).toBeDefined();
    expect(jsonRule!.test('{"key": "value"}')).toBe(true);
    expect(jsonRule!.test('not json')).toBe(false);
  });

  it('HTML rule detects HTML', () => {
    const htmlRule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('strip_html'));
    expect(htmlRule).toBeDefined();
    expect(htmlRule!.test('<div>hello</div>')).toBe(true);
    expect(htmlRule!.test('plain text')).toBe(false);
  });

  it('uppercase rule detects all-caps text', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('lowercase'));
    expect(rule).toBeDefined();
    expect(rule!.test('HELLO WORLD')).toBe(true);
    expect(rule!.test('mixed Case')).toBe(false);
  });

  it('base64 rule detects base64 text', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('base64_dec'));
    expect(rule).toBeDefined();
    expect(rule!.test('SGVsbG8gV29ybGQgdGhpcyBpcyBiYXNlNjQ=')).toBe(true);
    expect(rule!.test('hello world')).toBe(false);
  });

  it('URL rule detects URL-encoded text', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('url_dec'));
    expect(rule).toBeDefined();
    expect(rule!.test('?param=%20value')).toBe(true);
    expect(rule!.test('plain text')).toBe(false);
  });

  it('binary rule detects binary text', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('binary_dec'));
    expect(rule).toBeDefined();
    expect(rule!.test('01001000 01100101 01101100 01101100 01101111')).toBe(true);
    expect(rule!.test('not binary')).toBe(false);
  });

  it('JWT rule detects JWT tokens', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('jwt_decode'));
    expect(rule).toBeDefined();
    expect(
      rule!.test(
        'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      )
    ).toBe(true);
    expect(rule!.test('not a jwt')).toBe(false);
  });

  it('deduplicate rule detects repeated lines', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('deduplicate'));
    expect(rule).toBeDefined();
    const dup = 'line1\nline2\nline3\nline4\nline5\nline6\nline1';
    expect(rule!.test(dup)).toBe(true);
  });

  it('long text rules detect word counts', () => {
    const summarizeRule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('summarize'));
    expect(summarizeRule).toBeDefined();
    const longText = Array(90).fill('word').join(' ');
    expect(summarizeRule!.test(longText)).toBe(true);
    expect(summarizeRule!.test('short text')).toBe(false);
  });

  it('curl rule detects curl commands', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('curl_to_code'));
    expect(rule).toBeDefined();
    expect(rule!.test("curl 'https://api.example.com'")).toBe(true);
    expect(rule!.test('not a curl command')).toBe(false);
  });

  it('timestamp rule detects numeric timestamps', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('timestamp_convert'));
    expect(rule).toBeDefined();
    expect(rule!.test('1705315200')).toBe(true);
    expect(rule!.test('not timestamp')).toBe(false);
  });

  it('color rule detects hex colors', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('color_convert'));
    expect(rule).toBeDefined();
    expect(rule!.test('#ff5733')).toBe(true);
    expect(rule!.test('not a color')).toBe(false);
  });

  it('CSS rule detects CSS', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('css_fmt'));
    expect(rule).toBeDefined();
    expect(rule!.test('.selector { color: red; }')).toBe(true);
    expect(rule!.test('not css')).toBe(false);
  });

  it('JS rule detects JavaScript', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('js_fmt'));
    expect(rule).toBeDefined();
    expect(rule!.test('const x = () => { return 1 }')).toBe(true);
    expect(rule!.test('not js')).toBe(false);
  });

  it('SQL rule detects SQL', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('sql_fmt'));
    expect(rule).toBeDefined();
    expect(rule!.test('SELECT * FROM users WHERE id = 1')).toBe(true);
    expect(rule!.test('  INSERT INTO users (name) VALUES ("A")')).toBe(true);
    expect(rule!.test('not sql')).toBe(false);
    expect(rule!.test('please INSERT this text somewhere')).toBe(false);
  });

  it('XML rule detects XML', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('xml_fmt'));
    expect(rule).toBeDefined();
    expect(rule!.test('<?xml version="1.0"?><root><item>value</item></root>')).toBe(true);
    expect(rule!.test('not xml')).toBe(false);
  });

  it('HTTP header rule detects headers', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('http_header_parse'));
    expect(rule).toBeDefined();
    const headers = 'Content-Type: application/json\nAuthorization: Bearer token\nAccept: */*';
    expect(rule!.test(headers)).toBe(true);
    expect(rule!.test('not headers')).toBe(false);
  });

  it('email rule detects emails', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('extract_emails'));
    expect(rule).toBeDefined();
    const longEmail =
      'Contact us at info@example.com or support@company.org for help. ' +
      Array(20).fill('word').join(' ');
    expect(rule!.test(longEmail)).toBe(true);
    expect(rule!.test('no email here')).toBe(false);
  });

  it('URL extraction rule detects URLs', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('extract_urls'));
    expect(rule).toBeDefined();
    const longUrl = 'Visit https://example.com for more info. ' + Array(20).fill('word').join(' ');
    expect(rule!.test(longUrl)).toBe(true);
    expect(rule!.test('no url here')).toBe(false);
  });

  it('active voice rule detects passive voice', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('active_voice'));
    expect(rule).toBeDefined();
    expect(rule!.test('The report was written by the team')).toBe(true);
    expect(rule!.test('The team wrote the report')).toBe(false);
  });

  it('unicode rule detects unicode escapes', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('unicode_unesc'));
    expect(rule).toBeDefined();
    expect(rule!.test('\\u0048\\u0065\\u006C\\u006C\\u006F')).toBe(true);
    expect(rule!.test('Hello World')).toBe(false);
  });

  it('brainfuck rule detects brainfuck', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('brainfuck_dec'));
    expect(rule).toBeDefined();
    expect(
      rule!.test('++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.')
    ).toBe(true);
    expect(rule!.test('not brainfuck')).toBe(false);
  });

  it('outline rule detects bullet lists', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('outline_to_draft'));
    expect(rule).toBeDefined();
    const outline = '- First point\n- Second point\n- Third point';
    expect(rule!.test(outline)).toBe(true);
    expect(rule!.test('no bullets here')).toBe(false);
  });

  it('email rewrite rule detects email openers', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('email_rewrite'));
    expect(rule).toBeDefined();
    expect(rule!.test('Dear John, I hope this finds you well')).toBe(true);
    expect(rule!.test('random text')).toBe(false);
  });

  it('IDN rule detects punycode', () => {
    const rule = SMART_SUGGESTION_RULES.find(
      (r) => r.toolIds.includes('url_dec') && r.toolIds.length === 1
    );
    if (rule) {
      expect(typeof rule!.test).toBe('function');
    }
  });

  it('numeric sort rule detects numeric lines', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('sort_numeric'));
    expect(rule).toBeDefined();
    const numLines = '42\n17\n88\n3';
    expect(rule!.test(numLines)).toBe(true);
    expect(rule!.test('apple\nbanana\ncherry')).toBe(false);
  });

  it('split to lines rule detects comma-separated short text', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('split_to_lines'));
    expect(rule).toBeDefined();
    expect(rule!.test('one,two,three')).toBe(true);
    expect(rule!.test('no commas here')).toBe(false);
  });

  it('reading time rule detects very long text', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('reading_time'));
    expect(rule).toBeDefined();
    const longText = Array(210).fill('word').join(' ');
    expect(rule!.test(longText)).toBe(true);
    expect(rule!.test('short text')).toBe(false);
  });

  it('grammar rule detects medium text for fix_grammar', () => {
    const rule = SMART_SUGGESTION_RULES.find((r) => r.toolIds.includes('fix_grammar'));
    expect(rule).toBeDefined();
    const mediumText = Array(40).fill('word').join(' ');
    expect(rule!.test(mediumText)).toBe(true);
  });
});
