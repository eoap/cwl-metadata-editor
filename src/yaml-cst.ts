export interface TopLevelEntry {
  key: string | null;
  start: number;
  end: number;
  text: string;
}

function keyOf(line: string): string | null {
  const match = line.match(/^([^\s#][^\n]*?):(?=\s|$)/);
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

export function topLevelEntries(source: string): TopLevelEntry[] {
  const lines = source.match(/.*(?:\n|$)/g)?.filter(Boolean) ?? [];
  const entries: TopLevelEntry[] = [];
  let offset = 0;
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    const key = keyOf(line.replace(/\r?\n$/, ''));
    const start = offset;
    offset += line.length;
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      const stripped = next.replace(/\r?\n$/, '');
      if (stripped && !/^\s/.test(stripped) && keyOf(stripped)) break;
      offset += next.length;
      j += 1;
    }
    entries.push({ key, start, end: offset, text: source.slice(start, offset) });
    i = j;
  }
  return entries;
}

function scalar(text: string): unknown {
  const value = text.trim();
  if (value === '' || value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try { return value.startsWith('"') ? JSON.parse(value) : value.slice(1, -1).replace(/''/g, "'"); }
    catch { return value.slice(1, -1); }
  }
  if (value === '{}') return {};
  if (value === '[]') return [];
  return value;
}

function parseBlock(lines: string[], start: number, indent: number): { value: unknown; index: number } {
  let index = start;
  let container: unknown[] | Record<string, unknown> | undefined;
  while (index < lines.length) {
    const raw = lines[index];
    if (!raw.trim() || raw.trimStart().startsWith('#')) { index += 1; continue; }
    const currentIndent = raw.match(/^\s*/)?.[0].length ?? 0;
    if (currentIndent < indent) break;
    if (currentIndent > indent) { index += 1; continue; }
    const text = raw.slice(indent);
    const isList = text.startsWith('- ') || text === '-';
    if (container === undefined) container = isList ? [] : {};
    if (isList && Array.isArray(container)) {
      const rest = text === '-' ? '' : text.slice(2);
      if (!rest) {
        const child = parseBlock(lines, index + 1, indent + 2);
        container.push(child.value); index = child.index; continue;
      }
      const inlineKey = keyOf(rest);
      if (inlineKey) {
        const item: Record<string, unknown> = {};
        const colon = rest.indexOf(':', inlineKey.indexOf(':') + 1);
        const after = rest.slice(colon + 1).trim();
        if (after) item[inlineKey] = scalar(after);
        else {
          const child = parseBlock(lines, index + 1, indent + 4);
          item[inlineKey] = child.value; index = child.index - 1;
        }
        const following = parseBlock(lines, index + 1, indent + 2);
        if (following.value && !Array.isArray(following.value) && typeof following.value === 'object') Object.assign(item, following.value);
        container.push(item); index = following.index; continue;
      }
      container.push(scalar(rest)); index += 1; continue;
    }
    if (Array.isArray(container)) { index += 1; continue; }
    const key = keyOf(text);
    if (!key) { index += 1; continue; }
    const colon = text.indexOf(':', key.indexOf(':') + 1);
    const after = text.slice(colon + 1).trim();
    if (['|-', '|', '>-', '>'].includes(after)) {
      const chunks: string[] = []; index += 1;
      while (index < lines.length && (lines[index].match(/^\s*/)?.[0].length ?? 0) > indent) {
        chunks.push(lines[index].slice(Math.min(lines[index].length, indent + 2))); index += 1;
      }
      container[key] = chunks.join(after.startsWith('>') ? ' ' : '\n'); continue;
    }
    if (after) { container[key] = scalar(after); index += 1; continue; }
    const child = parseBlock(lines, index + 1, indent + 2);
    container[key] = child.value === undefined ? null : child.value; index = child.index;
  }
  return { value: container, index };
}

export function parseEntry(entry: TopLevelEntry): Record<string, unknown> {
  return (parseBlock(entry.text.split(/\r?\n/), 0, 0).value ?? {}) as Record<string, unknown>;
}

function quote(value: unknown): string {
  const text = String(value);
  if (text === '' || /^(?:null|true|false|~|-?\d+(?:\.\d+)?)$/.test(text) || /[:#[\]{},&*!|>'"%@`]|^[-?]|\s$|^\s/.test(text)) return JSON.stringify(text);
  return text;
}

export function dumpYaml(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return pad + '[]\n';
    return value.map((item) => {
      if (item && typeof item === 'object') {
        const rendered = dumpYaml(item, indent + 2).split('\n');
        const tail = rendered.slice(1).filter(Boolean);
        return pad + '- ' + rendered[0].trimStart() + '\n' + tail.join('\n') + (tail.length ? '\n' : '');
      }
      return pad + '- ' + quote(item) + '\n';
    }).join('');
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return pad + '{}\n';
    return entries.map(([key, item]) => {
      if (typeof item === 'string' && item.includes('\n')) return `${pad}${key}: |-\n${item.split('\n').map((line) => ' '.repeat(indent + 2) + line).join('\n')}\n`;
      if (item && typeof item === 'object') return `${pad}${key}:\n${dumpYaml(item, indent + 2)}`;
      if (item === null) return `${pad}${key}: null\n`;
      return `${pad}${key}: ${typeof item === 'string' ? quote(item) : String(item)}\n`;
    }).join('');
  }
  return pad + quote(value) + '\n';
}
