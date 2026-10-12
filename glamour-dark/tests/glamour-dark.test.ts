import { expect, test, type TestBody } from 'claude-code/testing'
import { parse } from '../hooks/markdown'

// MARK: Fixtures

type Engine = Parameters<TestBody>[0]
type Drawn = { type: string; props?: Record<string, unknown>; children?: unknown[] }

const VIEWPORT = { columns: 80, rows: 40 }

// The leaf Texts of one row, each with the props it paints with.
function spansOf(node: unknown): { text: string; props: Record<string, unknown> }[] {
  if (typeof node !== 'object' || node === null) return []
  const { type, props = {}, children = [] } = node as Drawn
  if (type === 'Text' && children.every(child => typeof child === 'string')) return [{ text: children.join(''), props }]
  return children.flatMap(spansOf)
}

function textOf(node: unknown): string {
  return spansOf(node)
    .map(span => span.text)
    .join('')
}

async function draw(
  $: Engine,
  text: string,
  props: { isFirstOfReply?: boolean; isSummary?: true } = {},
  surface: 'terminal' | 'desktop' = 'terminal',
): Promise<Drawn> {
  const ui = await $.ui.mount({
    plugin: 'glamour-dark',
    surface,
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: props.isFirstOfReply ?? false, ...(props.isSummary && { isSummary: true }) },
    viewport: VIEWPORT,
  })
  return (await ui.drawn()) as Drawn
}

async function rowsOf($: Engine, text: string, first = false): Promise<string[]> {
  const root = await draw($, text, { isFirstOfReply: first })
  return (root.children ?? []).map(row => textOf(row).trimEnd())
}

function spanWith(root: Drawn, text: string) {
  return spansOf(root).find(span => span.text.includes(text))
}

// MARK: Document

test('indents the reply by the document margin and opens it with the bullet', async $ => {
  expect(await rowsOf($, 'Hello there.', true)).toEqual(['● Hello there.'])
  expect(await rowsOf($, 'Hello there.')).toEqual(['  Hello there.'])
})

test('paints body text in the document color, with a blank line above and below', async $ => {
  const root = await draw($, 'Hello there.')
  expect(spanWith(root, 'Hello')?.props.color).toBe('ansi256(252)')
  expect(root.props?.marginTop).toBe(1)
  expect(root.props?.marginBottom).toBe(1)
})

test('wraps to the viewport, leaving both margins clear', async $ => {
  const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ')
  const rows = await rowsOf($, words)
  expect(rows.length).toBeGreaterThan(1)
  for (const row of rows) {
    expect(row.startsWith('  ')).toBe(true)
    expect(row.length).toBeLessThanOrEqual(VIEWPORT.columns - 2 - 2)
  }
})

test('separates blocks with one blank line', async $ => {
  expect(await rowsOf($, 'One.\n\nTwo.')).toEqual(['  One.', '', '  Two.'])
})

// MARK: Headings

test('draws h1 as a padded banner and lower levels with their hashes', async $ => {
  const root = await draw($, '# Title\n\n## Section\n\n###### Small')
  const banner = spanWith(root, 'Title')
  expect(banner?.text).toBe(' Title ')
  expect(banner?.props).toMatchObject({ color: 'ansi256(228)', backgroundColor: 'ansi256(63)', bold: true })
  expect(spanWith(root, 'Section')?.text).toBe('## Section')
  expect(spanWith(root, 'Section')?.props).toMatchObject({ color: 'ansi256(39)', bold: true })
  expect(spanWith(root, 'Small')?.props).toMatchObject({ color: 'ansi256(35)', bold: false })
})

// MARK: Inlines

test('styles emphasis, strong, strikethrough and inline code', async $ => {
  const root = await draw($, 'an *em* a **strong** a ~~gone~~ a `code` end')
  expect(spanWith(root, 'em')?.props.italic).toBe(true)
  expect(spanWith(root, 'strong')?.props.bold).toBe(true)
  expect(spanWith(root, 'gone')?.props.strikethrough).toBe(true)
  const code = spanWith(root, 'code')
  expect(code?.text).toBe(' code ')
  expect(code?.props).toMatchObject({ color: 'ansi256(203)', backgroundColor: 'ansi256(236)' })
})

test('draws a link as its text then its URL, both clickable', async $ => {
  const root = await draw($, 'see [the docs](https://example.com/docs) now')
  expect(textOf(root)).toContain('see the docs https://example.com/docs now')
  expect(spanWith(root, 'the docs')?.props).toMatchObject({ color: 'ansi256(35)', bold: true })
  expect(spanWith(root, 'https://example.com/docs')?.props).toMatchObject({ color: 'ansi256(30)', underline: true })
  const link = JSON.stringify(root).match(/"type":"Link","props":\{"href":"https:\/\/example.com\/docs"/g)
  expect(link?.length).toBe(2)
})

test('draws an image as its caption and URL', async $ => {
  const root = await draw($, '![a cat](https://example.com/cat.png)')
  expect(textOf(root)).toContain('Image: a cat → https://example.com/cat.png')
  expect(spanWith(root, 'Image: a cat')?.props.color).toBe('ansi256(243)')
  expect(spanWith(root, 'cat.png')?.props).toMatchObject({ color: 'ansi256(212)', underline: true })
})

// MARK: Lists

test('marks bullets, numbers and tasks, nesting by the level indent', async $ => {
  const rows = await rowsOf($, '- one\n  - inner\n- two\n\n3. third\n4. fourth\n\n- [x] done\n- [ ] todo')
  expect(rows).toEqual([
    '  • one',
    '    • inner',
    '  • two',
    '',
    '  3. third',
    '  4. fourth',
    '',
    '  [✓] done',
    '  [ ] todo',
  ])
})

test('hangs a wrapped item under its text', async $ => {
  const rows = await rowsOf($, '- ' + Array.from({ length: 30 }, () => 'word').join(' '))
  expect(rows[0]?.startsWith('  • word')).toBe(true)
  expect(rows[1]?.startsWith('    word')).toBe(true)
})

// MARK: Blocks

test('bars a block quote', async $ => {
  expect(await rowsOf($, '> quoted\n> words')).toEqual(['  │ quoted words'])
})

test('rules a horizontal break in grey', async $ => {
  const root = await draw($, 'above\n\n---\n\nbelow')
  expect((root.children ?? []).map(row => textOf(row).trimEnd())).toEqual(['  above', '', '  --------', '', '  below'])
  expect(spanWith(root, '--------')?.props.color).toBe('ansi256(240)')
})

// Ink counts a tab as one cell, so leading tabs reach the terminal as spaces to the next stop of four.
test('highlights a code block with the chroma theme on its background', async $ => {
  const root = await draw($, '```go\nfunc main() {\n\treturn "hi"\n}\n```')
  expect((root.children ?? []).map(row => textOf(row).trimEnd())).toEqual(['    func main() {', '        return "hi"', '    }'])
  expect(spanWith(root, 'func')?.props).toMatchObject({ color: '#00AAFF', backgroundColor: '#373737' })
  expect(spanWith(root, 'main')?.props.color).toBe('#00D787')
  expect(spanWith(root, '"hi"')?.props.color).toBe('#C69669')
  expect(spanWith(root, '(')?.props.color).toBe('#E8E8A8')
})

test('draws a code block of an unknown language in the plain chroma text color', async $ => {
  const root = await draw($, '```\nplain words\n```')
  expect(spanWith(root, 'plain words')?.props).toMatchObject({ color: '#C4C4C4', backgroundColor: '#373737' })
})

test('lays a table out with inner borders only', async $ => {
  const rows = await rowsOf($, '| Name | Qty |\n| :--- | ---: |\n| apple | 3 |\n| kiwi | 12 |')
  expect(rows).toEqual(['   Name  │ Qty', '  ───────┼─────', '   apple │   3', '   kiwi  │  12'])
})

// MARK: Theme

// The style follows the person's theme: glamour's light.json on a light theme, dark.json otherwise.
const themeRow = (value: string) => ({
  key: 'theme',
  label: 'Theme',
  kind: 'choice',
  value,
  provider: { plugin: 'engine', tier: 'core' },
  isLocked: false,
})

test('draws body text in the light style when the theme is a light one', async ($, on) => {
  on('config.list', () => ({ value: [themeRow('light-daltonized')] }))
  const root = await draw($, 'Hello there.\n\n## Section\n\nsee `code`\n\n```js\nconst a = 1\n```')
  expect(spanWith(root, 'Hello')?.props.color).toBe('ansi256(234)')
  expect(spanWith(root, 'Section')?.props.color).toBe('ansi256(27)')
  expect(spanWith(root, 'code')?.props).toMatchObject({ color: 'ansi256(203)', backgroundColor: 'ansi256(254)' })
  // The code block's background is light too, so its dark token colors stay readable.
  expect(spanWith(root, 'const')?.props).toMatchObject({ color: '#FF5FD2', backgroundColor: '#EBEBEB' })
})

const setTheme = ($: Engine, value: string) =>
  $.config.set({ key: 'theme', value, previous: 'light', provider: { plugin: 'engine', tier: 'core' }, origin: { kind: 'composer' } })

const mountReply = ($: Engine, text: string) =>
  $.ui.mount({
    plugin: 'glamour-dark',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: false },
    viewport: VIEWPORT,
  })

test('redraws a reply already on screen when the theme changes', async ($, on) => {
  on('config.list', () => ({ value: [themeRow('light')] }))
  // Stands for the engine's own writer beneath the mod's config.set hook.
  on('config.set', (_, e) => ({ value: e.value }))
  const invalidated: string[] = []
  on('ui.invalidate', (_, e, next) => {
    invalidated.push(e.event)
    return next(e)
  })
  const ui = await mountReply($, 'Hello there.')
  expect(spanWith((await ui.drawn()) as Drawn, 'Hello')?.props.color).toBe('ansi256(234)')
  await setTheme($, 'dark')
  expect(invalidated).toEqual(['ui.render'])
  expect(spanWith((await ui.drawn()) as Drawn, 'Hello')?.props.color).toBe('ansi256(252)')
})

test('keeps the style when the theme change is denied', async ($, on) => {
  on('config.list', () => ({ value: [themeRow('light')] }))
  on('config.set', () => ({ deny: 'the theme stays' }))
  expect(spanWith(await draw($, 'Hello there.'), 'Hello')?.props.color).toBe('ansi256(234)')
  await setTheme($, 'dark')
  expect(spanWith(await draw($, 'Hello there.'), 'Hello')?.props.color).toBe('ansi256(234)')
})

// MARK: Engine's own

test("leaves summaries and other surfaces to the engine", async ($, on) => {
  // Stands for what the engine draws at any site the mod passes on.
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  expect(textOf(await draw($, '# Title', { isSummary: true }))).toBe('engine')
  expect(textOf(await draw($, '# Title', {}, 'desktop'))).toBe('engine')
})

// MARK: Parser

test('keeps snake_case words and a streaming fence intact', async () => {
  expect(parse('call snake_case_name now')).toEqual([
    { kind: 'paragraph', content: [{ kind: 'text', text: 'call snake_case_name now' }] },
  ])
  expect(parse('```ts\nconst a = 1')).toEqual([{ kind: 'code', language: 'ts', text: 'const a = 1' }])
})

// MARK: Sentences

test('starts each sentence on a line of its own', async $ => {
  expect(await rowsOf($, 'First one. Second one! Third one? yes, still the third.')).toEqual([
    '  First one.',
    '  Second one!',
    '  Third one? yes, still the third.',
  ])
})

test('keeps abbreviations, initials, versions and file names inside their sentence', async $ => {
  expect(await rowsOf($, 'Use e.g. Python with J. Smith on v1.2 in main.ts today. Done')).toEqual([
    '  Use e.g. Python with J. Smith on v1.2 in main.ts today.',
    '  Done',
  ])
})

test('breaks after styled text and before inline code', async $ => {
  expect(await rowsOf($, '**It works.** Next step. `npm i` installs it.')).toEqual([
    '  It works.',
    '  Next step.',
    '   npm i  installs it.',
  ])
})

test('splits sentences in list items and quotes, hanging under the text', async $ => {
  expect(await rowsOf($, '- One. Two.\n\n> Three. Four.')).toEqual(['  • One.', '    Two.', '', '  │ Three.', '  │ Four.'])
})

test('leaves headings on one line', async $ => {
  expect(await rowsOf($, '## Step one. Then two')).toEqual(['  ## Step one. Then two'])
})
