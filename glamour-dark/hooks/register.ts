import type { EngineInterface, Register } from 'claude-code'
import { cascade, layout, type Line, type Paint, type Span } from './layout'
import { parse, type Block } from './markdown'
import { splitSentences } from './sentences'
import { styleForTheme, type StyleConfig } from './style'

// MARK: Layout

/** Reshapes the parsed reply before it is laid out, in order; add one here to change how replies read. */
const REWRITES: ((blocks: Block[]) => Block[])[] = [splitSentences]

// The engine keeps a column clear at each edge of the transcript, so a line sized to the full width would spill.
const GUTTER = 2
// The viewport is absent until the terminal has been measured.
const FALLBACK_COLUMNS = 120
const BULLET = '●'

// The bullet opening a reply sits in the document's left margin, where the engine draws its own.
function withBullet(lines: Line[], paint: Paint): Line[] {
  const [first, ...rest] = lines
  const lead = first?.[0]
  if (first === undefined || lead === undefined || !lead.text.startsWith('  ')) return lines
  return [[{ text: BULLET, paint }, { ...lead, text: lead.text.slice(1) }, ...first.slice(1)], ...rest]
}

// glamour opens and closes a document with a blank line, drawn as the row's margins. The closing one lives here,
// not in a wrapper of another plugin's, so it holds whichever plugin's hook runs first.
const blankLines = (text = '') => text.split('\n').length - 1

// MARK: Theme

// The person's Claude Code theme (`/theme`), read once from the config rows and kept current by the `config.set`
// hook, so a light theme gets glamour's light style and body text stays readable on a light background.
let theme: unknown

async function currentStyle($: EngineInterface): Promise<StyleConfig> {
  if (theme !== undefined) return styleForTheme(theme)
  try {
    const read = (await $.config.list()).find(row => row.key === 'theme')?.value ?? null
    // A `/theme` that landed while the rows were being read is newer than what they say.
    if (theme === undefined) theme = read
  } catch {
    // A failed read draws in the dark style, the mod's original look, and is tried again on the next reply.
  }
  return styleForTheme(theme)
}

// MARK: Hooks

export const register: Register = on => {
  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    // A denied change leaves the theme as it was, so the replies stay as they are.
    if (result.deny !== undefined) return result
    theme = result.value
    // Replies keep their last drawing until asked again, so the theme change has to redraw them.
    $.ui.invalidate('ui.render')
    return result
    // The theme change goes through even if this hook fails; only the redraw would be missed.
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    // A summary keeps the engine's faint "· summary" mark, which a tree of the mod's own would drop.
    if (e.surface !== 'terminal' || e.props.isSummary) return next(e)
    const blocks = REWRITES.reduce((tree, rewrite) => rewrite(tree), parse(e.props.text))
    if (blocks.length === 0) return next(e)

    const style = await currentStyle($)
    const { Box, Text, Link } = $.ui.resolve(e)
    const columns = (e.viewport?.columns ?? FALLBACK_COLUMNS) - GUTTER
    const laidOut = layout(blocks, style, columns)
    const lines = e.props.isFirstOfReply ? withBullet(laidOut, cascade({}, style.document)) : laidOut

    const drawSpan = (span: Span) => {
      const text = Text({ ...span.paint, children: [span.text] })
      return span.href === undefined ? text : Link({ href: span.href, children: [text] })
    }
    return Box({
      flexDirection: 'column',
      marginTop: blankLines(style.document.block_prefix),
      marginBottom: blankLines(style.document.block_suffix),
      // An empty Text takes no height, so a blank line between blocks is drawn as one space.
      children: lines.map(line => Text({ children: line.length === 0 ? [' '] : line.map(drawSpan) })),
    })
  })
}
