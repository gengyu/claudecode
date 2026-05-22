import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const docsDir = path.join(root, 'docs');
const outDir = path.join(root, 'dist-docs-site');

const mainOrder = [
  'COURSE_INDEX.md',
  'SYSTEMATIC_COURSE.md',
  'LEARNING_TRACKER.md',
  'COURSE_COMPLETION_TASK.md',
  'COURSE_FINAL_REVIEW.md',
];

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';

const titleFromMarkdown = (markdown, fallback) => {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback.replace(/\.md$/, '');
};

const relToPage = (rel) => rel.replace(/\.md$/, '.html');

const listMarkdownFiles = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listMarkdownFiles(full);
      return entry.isFile() && entry.name.endsWith('.md') ? [full] : [];
    });

const markdownFiles = listMarkdownFiles(docsDir);
const fileRecords = markdownFiles
  .map((file) => {
    const rel = path.relative(docsDir, file);
    const markdown = fs.readFileSync(file, 'utf8');
    return {
      file,
      rel,
      page: relToPage(rel),
      title: titleFromMarkdown(markdown, path.basename(file)),
      markdown,
    };
  })
  .sort((a, b) => {
    const groupRank = (rel) => {
      if (mainOrder.includes(rel)) return 0;
      if (rel.startsWith('chapters/')) return 1;
      if (rel.startsWith('appendices/')) return 2;
      if (rel.startsWith('legacy/')) return 3;
      return 4;
    };
    const rank = groupRank(a.rel) - groupRank(b.rel);
    if (rank !== 0) return rank;
    const mainRank = mainOrder.indexOf(a.rel) - mainOrder.indexOf(b.rel);
    if (mainOrder.includes(a.rel) && mainOrder.includes(b.rel)) return mainRank;
    return a.rel.localeCompare(b.rel, 'zh-CN');
  });

const recordByRel = new Map(fileRecords.map((record) => [record.rel, record]));

const rewriteLinks = (href, currentRel) => {
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  const [target, hash = ''] = href.split('#');
  if (!target.endsWith('.md')) return href;
  const resolved = path.normalize(path.join(path.dirname(currentRel), target));
  const page = relToPage(resolved);
  const fromPageDir = path.dirname(relToPage(currentRel));
  const relative = path.relative(fromPageDir, page).replaceAll(path.sep, '/');
  return `${relative || path.basename(page)}${hash ? `#${hash}` : ''}`;
};

const renderInline = (value, currentRel) => {
  let text = escapeHtml(value);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, href) => `<a href="${escapeHtml(rewriteLinks(href, currentRel))}">${label}</a>`,
  );
  return text;
};

const isTableDivider = (line) =>
  /^\s*\|?[\s:-]+\|[\s|:-]+\|?\s*$/.test(line) && line.includes('-');

const splitTableRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const renderMarkdown = (markdown, currentRel) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  const headings = [];
  let i = 0;

  const collectParagraph = () => {
    const parts = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !(i + 1 < lines.length && lines[i].includes('|') && isTableDivider(lines[i + 1]))
    ) {
      parts.push(lines[i].trim());
      i += 1;
    }
    if (parts.length) html.push(`<p>${renderInline(parts.join(' '), currentRel)}</p>`);
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const raw = heading[2].trim();
      const baseId = slugify(raw);
      let id = baseId;
      let index = 2;
      while (headings.some((item) => item.id === id)) {
        id = `${baseId}-${index}`;
        index += 1;
      }
      headings.push({ level, title: raw, id });
      html.push(`<h${level} id="${id}">${renderInline(raw, currentRel)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim();
      i += 1;
      const code = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      html.push(
        `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.join('\n'))}</code></pre>`,
      );
      continue;
    }

    if (i + 1 < lines.length && line.includes('|') && isTableDivider(lines[i + 1])) {
      const headers = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      html.push(
        `<div class="table-wrap" tabindex="0"><table><thead><tr>${headers
          .map((cell) => `<th>${renderInline(cell, currentRel)}</th>`)
          .join('')}</tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${renderInline(cell, currentRel)}</td>`).join('')}</tr>`,
          )
          .join('')}</tbody></table></div>`,
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (
        i < lines.length &&
        (ordered ? /^\s*\d+\.\s+/.test(lines[i]) : /^\s*[-*]\s+/.test(lines[i]))
      ) {
        items.push(lines[i].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, ''));
        i += 1;
      }
      html.push(`<${tag}>${items.map((item) => `<li>${renderInline(item, currentRel)}</li>`).join('')}</${tag}>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      html.push(`<blockquote>${quote.map((item) => `<p>${renderInline(item, currentRel)}</p>`).join('')}</blockquote>`);
      continue;
    }

    collectParagraph();
  }

  return { body: html.join('\n'), headings };
};

const navGroups = [
  ['课程入口', (record) => mainOrder.includes(record.rel)],
  ['章节讲义', (record) => record.rel.startsWith('chapters/')],
  ['附录', (record) => record.rel.startsWith('appendices/')],
  ['旧版资料', (record) => record.rel.startsWith('legacy/')],
];

const makeNav = (currentRel) =>
  navGroups
    .map(([label, predicate]) => {
      const records = fileRecords.filter(predicate);
      if (!records.length) return '';
      const links = records
        .map((record) => {
          const active = record.rel === currentRel ? ' aria-current="page"' : '';
          const href = path
            .relative(path.dirname(relToPage(currentRel)), record.page)
            .replaceAll(path.sep, '/');
          return `<a${active} href="${href || path.basename(record.page)}">${escapeHtml(record.title)}</a>`;
        })
        .join('');
      return `<section class="nav-group"><h2>${label}</h2>${links}</section>`;
    })
    .join('');

const absolutePage = (record) => `/${record.page}`;

const makeMobileJump = (currentRel) =>
  `<header class="mobile-jump">
    <a class="mobile-home" href="/">课程首页</a>
    <label>
      <span>章节跳转</span>
      <select onchange="if (this.value) location.href = this.value">
        ${fileRecords
          .map((record) => {
            const selected = record.rel === currentRel ? ' selected' : '';
            return `<option${selected} value="${absolutePage(record)}">${escapeHtml(record.title)}</option>`;
          })
          .join('')}
      </select>
    </label>
  </header>`;

const makePager = (currentRel) => {
  const currentIndex = fileRecords.findIndex((record) => record.rel === currentRel);
  const previous = currentIndex > 0 ? fileRecords[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < fileRecords.length - 1 ? fileRecords[currentIndex + 1] : null;

  if (!previous && !next) return '';

  return `<nav class="pager" aria-label="章节翻页">
    ${
      previous
        ? `<a class="pager-prev" href="${absolutePage(previous)}"><span>上一章</span><strong>${escapeHtml(previous.title)}</strong></a>`
        : '<span></span>'
    }
    ${
      next
        ? `<a class="pager-next" href="${absolutePage(next)}"><span>下一章</span><strong>${escapeHtml(next.title)}</strong></a>`
        : '<span></span>'
    }
  </nav>`;
};

const layout = ({ title, body, headings, currentRel }) => {
  const toc = headings
    .filter((heading) => heading.level > 1 && heading.level < 4)
    .map(
      (heading) =>
        `<a class="toc-level-${heading.level}" href="#${heading.id}">${escapeHtml(heading.title)}</a>`,
    )
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} - Claude Code 源码系统课程</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  ${makeMobileJump(currentRel)}
  <div class="shell">
    <aside class="sidebar">
      <a class="brand" href="/"><span>Claude Code</span><strong>源码系统课程</strong></a>
      <nav>${makeNav(currentRel)}</nav>
    </aside>
    <main class="content">
      <article class="doc">${body}${makePager(currentRel)}</article>
    </main>
    <aside class="toc">
      <h2>本页目录</h2>
      ${toc || '<p>本页没有二级目录。</p>'}
    </aside>
  </div>
</body>
</html>`;
};

const css = `:root {
  color-scheme: light;
  --bg: #f7f8fb;
  --panel: #ffffff;
  --ink: #172033;
  --muted: #5f6b7a;
  --line: #dce2ea;
  --accent: #0f766e;
  --accent-ink: #0b4f4a;
  --code-bg: #101828;
  --code-ink: #e6edf6;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.72;
}
a { color: var(--accent-ink); text-decoration: none; }
a:hover { text-decoration: underline; }
.shell {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 240px;
  min-height: 100vh;
}
.mobile-jump { display: none; }
.sidebar, .toc {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
  background: var(--panel);
  border-right: 1px solid var(--line);
  padding: 24px 18px;
}
.toc {
  border-left: 1px solid var(--line);
  border-right: 0;
}
.brand {
  display: grid;
  gap: 2px;
  color: var(--ink);
  margin-bottom: 26px;
}
.brand span { color: var(--muted); font-size: 13px; }
.brand strong { font-size: 18px; line-height: 1.25; }
.nav-group { margin: 0 0 24px; }
.nav-group h2, .toc h2 {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.nav-group a, .toc a {
  display: block;
  border-radius: 6px;
  padding: 7px 9px;
  color: #314154;
  font-size: 14px;
  line-height: 1.38;
}
.nav-group a[aria-current="page"] {
  background: #dff5f1;
  color: var(--accent-ink);
  font-weight: 700;
}
.toc p { color: var(--muted); font-size: 14px; }
.toc-level-3 { padding-left: 20px !important; }
.content {
  min-width: 0;
  padding: 54px 54px 80px;
}
.doc {
  max-width: 900px;
  margin: 0 auto;
}
.doc h1 {
  margin: 0 0 28px;
  font-size: 42px;
  line-height: 1.15;
}
.doc h2 {
  margin-top: 46px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
  font-size: 27px;
  line-height: 1.28;
}
.doc h3 { margin-top: 32px; font-size: 21px; }
.doc h4 { margin-top: 26px; font-size: 17px; }
.doc p, .doc li { font-size: 16px; }
.doc code {
  border-radius: 5px;
  background: #e9eef5;
  padding: 2px 5px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: .92em;
}
.doc pre {
  overflow: auto;
  border-radius: 8px;
  background: var(--code-bg);
  padding: 18px;
}
.doc pre code {
  background: transparent;
  color: var(--code-ink);
  padding: 0;
  font-size: 14px;
  line-height: 1.65;
}
.table-wrap {
  width: 100%;
  overflow: auto;
  margin: 22px 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
}
.doc table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
}
.doc th, .doc td {
  border: 1px solid var(--line);
  padding: 10px 12px;
  vertical-align: top;
}
.doc th { background: #eef4f8; text-align: left; }
.doc blockquote {
  margin: 24px 0;
  border-left: 4px solid var(--accent);
  padding: 2px 18px;
  background: #eefaf7;
  color: #243746;
}
.pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}
.pager a {
  display: grid;
  gap: 4px;
  min-height: 78px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  padding: 14px 16px;
  color: var(--ink);
}
.pager a:hover {
  border-color: var(--accent);
  text-decoration: none;
}
.pager span {
  color: var(--muted);
  font-size: 13px;
}
.pager strong {
  font-size: 15px;
  line-height: 1.35;
}
.pager-next { text-align: right; }

@media (max-width: 1120px) {
  .shell { grid-template-columns: 280px minmax(0, 1fr); }
  .toc { display: none; }
}

@media (max-width: 760px) {
  body { padding-top: 74px; }
  .mobile-jump {
    position: fixed;
    z-index: 10;
    top: 0;
    left: 0;
    right: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    min-height: 74px;
    border-bottom: 1px solid var(--line);
    background: rgba(255, 255, 255, .96);
    padding: 10px 12px;
    backdrop-filter: blur(12px);
  }
  .mobile-home {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 10px;
    color: var(--accent-ink);
    font-size: 14px;
    font-weight: 700;
    white-space: nowrap;
  }
  .mobile-jump label {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .mobile-jump label span {
    color: var(--muted);
    font-size: 11px;
    line-height: 1;
  }
  .mobile-jump select {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 14px;
    padding: 8px 10px;
  }
  .shell { display: block; }
  .sidebar {
    display: none;
  }
  .content { padding: 26px 18px 56px; }
  .doc h1 { font-size: 29px; }
  .doc h2 { font-size: 22px; }
  .table-wrap {
    margin: 18px -18px;
    border-left: 0;
    border-right: 0;
    border-radius: 0;
    box-shadow: inset -18px 0 18px -20px rgba(23, 32, 51, .55);
  }
  .table-wrap::before {
    content: "左右滑动查看完整表格";
    display: block;
    position: sticky;
    left: 0;
    border-bottom: 1px solid var(--line);
    background: #f4fbf9;
    color: var(--muted);
    padding: 8px 18px;
    font-size: 12px;
    line-height: 1.2;
  }
  .doc table {
    min-width: 760px;
    font-size: 14px;
  }
  .doc th,
  .doc td {
    padding: 8px 10px;
    min-width: 132px;
  }
  .doc th:first-child,
  .doc td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    min-width: 118px;
    max-width: 160px;
    background: #f8fbfd;
    box-shadow: 1px 0 0 var(--line);
  }
  .doc th:first-child {
    z-index: 2;
    background: #eef4f8;
  }
  .pager {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 40px;
  }
  .pager a {
    min-height: 68px;
  }
  .pager-next { text-align: left; }
}

`;

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'styles.css'), css);

for (const record of fileRecords) {
  const { body, headings } = renderMarkdown(record.markdown, record.rel);
  const pagePath = path.join(outDir, record.page);
  fs.mkdirSync(path.dirname(pagePath), { recursive: true });
  fs.writeFileSync(
    pagePath,
    layout({
      title: record.title,
      body,
      headings,
      currentRel: record.rel,
    }),
  );
}

const entry = recordByRel.get('COURSE_INDEX.md') ?? fileRecords[0];
fs.copyFileSync(path.join(outDir, entry.page), path.join(outDir, 'index.html'));
fs.writeFileSync(
  path.join(outDir, '404.html'),
  layout({
    title: '页面未找到',
    body: '<h1>页面未找到</h1><p>请从左侧目录重新选择课程内容。</p>',
    headings: [],
    currentRel: entry.rel,
  }),
);

fs.writeFileSync(
  path.join(outDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${fileRecords
    .map((record) => `  <url><loc>https://claudecode.midtell.com/${record.page}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);

console.log(`Built ${fileRecords.length} pages into ${outDir}`);
