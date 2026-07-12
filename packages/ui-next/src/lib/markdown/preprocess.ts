// preprocess.ts

export interface SamplePairData {
  num: number;
  input: string;
  output: string;
}

export type ContentBlock =
  | { type: 'markdown'; body: string }
  | { type: 'samples'; pairs: SamplePairData[] };

// Multi-language anchors for sample input/output sections
const ANCHOR_PATTERNS: RegExp[] = [
  /^#{1,6}\s*(样例输入|样例输出|样例输入\s*[/／\-\s]*输出|样例输入输出|输入输出样例|输入输出示例|輸入輸出範例)\s*$/i,
  /^#{1,6}\s*(Sample Input|Sample Output|Sample Input\s*\/\s*Output|Sample Input and Output|Example Input|Example Input\s*\/\s*Output|Examples?)\s*$/i,
  /^#{1,6}\s*(サンプル入力|サンプル出力|入力例|出力例|入出力例)\s*$/i,
];

const NEXT_HEADING = /^#{1,6}\s+/;

function isAnchor(line: string): boolean {
  return ANCHOR_PATTERNS.some((re) => re.test(line.trim()));
}

function extractFencedBlocks(section: string): string[] {
  const blocks: string[] = [];
  const lines = section.split('\n');
  let inBlock = false;
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      if (inBlock) {
        blocks.push(current.join('\n').trim());
        current = [];
        inBlock = false;
      } else {
        inBlock = true;
        current = [];
      }
    } else if (inBlock) {
      current.push(line);
    }
  }
  return blocks;
}

function parseSampleSection(section: string, startNum: number): {
  pairs: SamplePairData[];
  remaining: string;
} {
  const lines = section.split('\n');
  let contentStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (ANCHOR_PATTERNS.some((re) => re.test(lines[i].trim()))) {
      contentStart = i + 1;
      break;
    }
  }
  let endIdx = lines.length;
  for (let i = contentStart; i < lines.length; i++) {
    if (NEXT_HEADING.test(lines[i]) && !ANCHOR_PATTERNS.some((re) => re.test(lines[i].trim()))) {
      endIdx = i;
      break;
    }
  }
  const contentLines = lines.slice(contentStart, endIdx);
  let remainingLines = lines.slice(endIdx);
  // Insert blank line after the heading so the next markdown block
  // starts with the proper visual separation.
  if (remainingLines.length > 0 && NEXT_HEADING.test(remainingLines[0])) {
    remainingLines = [remainingLines[0], '', ...remainingLines.slice(1)];
  }
  const blocks = extractFencedBlocks(contentLines.join('\n'));

  if (blocks.length === 0) {
    return { pairs: [], remaining: remainingLines.join('\n') };
  }

  const pairs: SamplePairData[] = [];
  for (let i = 0; i < blocks.length; i += 2) {
    pairs.push({
      num: startNum + pairs.length,
      input: blocks[i] ?? '',
      output: blocks[i + 1] ?? '',
    });
  }
  return { pairs, remaining: remainingLines.join('\n') };
}

export function preprocessContent(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = raw.split('\n');
  let current: string[] = [];
  let sampleCounter = 1;

  const flushMarkdown = (force: boolean) => {
    const body = current.join('\n').trim();
    if (body || force) blocks.push({ type: 'markdown', body });
    current = [];
  };

  let i = 0;
  while (i < lines.length) {
    if (isAnchor(lines[i])) {
      let sectionEnd = lines.length;
      for (let j = i + 1; j < lines.length; j++) {
        if (NEXT_HEADING.test(lines[j])) {
          // Include the next heading so the next markdown block
          // begins with the heading (instead of leaving it orphaned).
          sectionEnd = j + 1;
          break;
        }
      }
      const section = lines.slice(i, sectionEnd).join('\n');
      const { pairs, remaining } = parseSampleSection(section, sampleCounter);
      if (pairs.length > 0) {
        flushMarkdown(true);
        blocks.push({ type: 'samples', pairs });
        sampleCounter += pairs.length;
        current = remaining ? remaining.split('\n') : [];
      } else {
        // Anchor matches but no fenced code follows: keep the
        // anchor line as plain markdown and continue scanning.
        current.push(lines[i]);
      }
      i = sectionEnd;
    } else {
      current.push(lines[i]);
      i++;
    }
  }
  flushMarkdown(false);
  return blocks;
}