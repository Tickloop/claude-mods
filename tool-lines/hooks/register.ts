import type { ButtonProps, Register, RenderElement } from 'claude-code'

// MARK: Layout

// Wide terminals fit the whole line on one row; narrow ones may wrap, up to MAX_ROWS.
const MIN_CHARS = 120
const MAX_ROWS = 3
// A long argument (a whole script or prompt) buries the tool name, so the subject stops here, ellipsis included.
const MAX_SUBJECT_CHARS = 35
// The engine indents transcript rows, so a line sized to the full width would spill onto a second row.
const GUTTER = 4
// The viewport is absent until the terminal has been measured.
const FALLBACK_COLUMNS = 120

// MARK: Row facts

type ToolRow = {
  tool: string
  input: unknown
  output?: unknown
  isRunning: boolean
  isErrored: boolean
  isInterrupted: boolean
}

// Input fields that name what a call acts on, most telling first; add a key here to cover a new tool.
const SUBJECT_KEYS = [
  'command',
  'file_path',
  'notebook_path',
  'pattern',
  'url',
  'query',
  'skill',
  'description',
  'path',
  'action',
  'prompt',
]

// This extracts the main argument of a tool call. Tools with no known key fall back to their raw
// JSON so the line is never blank, and whitespace is collapsed so a multi-line command can't break
// the line apart.
function subjectOf(input: unknown): string {
  if (typeof input !== 'object' || input === null) return ''
  const fields = input as Record<string, unknown>
  const key = SUBJECT_KEYS.find(name => typeof fields[name] === 'string' && fields[name] !== '')
  const raw =
    key !== undefined ? String(fields[key]) : Object.keys(fields).length > 0 ? JSON.stringify(fields) : ''
  return raw.replace(/\s+/g, ' ').trim()
}

// An errored call's output is the plain text the model read, so only an object carries result fields.
function resultField(row: ToolRow, name: string): unknown {
  return typeof row.output === 'object' && row.output !== null
    ? (row.output as Record<string, unknown>)[name]
    : undefined
}

// Each probe surfaces one fact the hidden result block would have shown; add one here to extend the meta.
type MetaProbe = (row: ToolRow) => string | undefined

const META_PROBES: MetaProbe[] = [
  row => (row.isInterrupted ? 'interrupted' : undefined),
  row => (row.isErrored && !row.isInterrupted ? 'error' : undefined),
  row => (resultField(row, 'backgroundTaskId') !== undefined ? 'background' : undefined),
  row => (resultField(row, 'timedOutAfterMs') !== undefined ? 'timed out' : undefined),
  row => {
    const printed = `${resultField(row, 'stdout') ?? ''}\n${resultField(row, 'stderr') ?? ''}`
    return /Shell cwd was reset/.test(printed) ? 'shell cwd was reset' : undefined
  },
  row => {
    const note = resultField(row, 'returnCodeInterpretation')
    return typeof note === 'string' && note !== '' ? note : undefined
  },
]

// MARK: Line

type ToolLine = { tool: string; subject: string; meta: string }

function clip(text: string, room: number): string {
  if (text.length <= room) return text
  return room <= 1 ? '…' : text.slice(0, room - 1) + '…'
}

// The subject is the only part cut, so the tool name and meta always stay readable.
function lineFor(row: ToolRow, columns: number): ToolLine {
  // 2 is the dot's column, which the summary text sits beside.
  const width = Math.max(columns - GUTTER - 2, 20)
  const budget = Math.min(Math.max(width, MIN_CHARS), width * MAX_ROWS)
  const meta = META_PROBES.map(probe => probe(row))
    .filter(note => note !== undefined)
    .join(', ')
  const frame = `tool_call: ${row.tool}()`.length + (meta === '' ? 0 : ` - ${meta}`.length)
  const subjectWidth = Math.min(MAX_SUBJECT_CHARS, budget - frame)
  return { tool: row.tool, subject: clip(subjectOf(row.input), subjectWidth), meta }
}

// MARK: Status

// The dot alone carries the call's state, so the line needs no "running" text. Theme keys follow
// the person's theme: warning is its yellow, success its green, error its red.
function dotStyle(row: ToolRow): { color: string } {
  if (row.isErrored || row.isInterrupted) return { color: 'error' }
  // isRunning is false while a call waits its turn or its approval, so only a stored result marks it done.
  return row.isRunning || row.output === undefined ? { color: 'warning' } : { color: 'success' }
}

// MARK: View

// Tool rows don't say whether the ctrl+o transcript (or --verbose) is open, but the person's own
// prompt rows do; their flag is mirrored here so every tool site leaves that view to the engine.
let isExpandedView = false

function isCompact(surface: string): boolean {
  return surface === 'terminal' && !isExpandedView
}

// MARK: Unfolded rows

// Calls the person clicked open: each draws as the engine's own row, result block and all, until clicked shut.
const unfolded = new Set<string>()

// Calls whose output the engine draws in a ToolResult block of its own; a grouped read or search draws it inline in its row.
const hasResultBlock = new Set<string>()

type ButtonOf = (props: ButtonProps) => RenderElement

// Only a Button takes a click, so the row's two clickable pieces, the triangle and "tool_call:", are Buttons running one toggle.
// Each reads the set when pressed, not when drawn, so a press on a stale drawing still flips the row.
function pressableOf(id: string, Button: ButtonOf, onToggle: () => void) {
  return (key: string, label: string, dimColor = false): RenderElement =>
    Button({
      key,
      label,
      plain: true,
      dimColor,
      // The row's keyed Box scopes this, so hovering the row underlines both pieces.
      hover: { underline: true },
      onPress: () => {
        if (unfolded.has(id)) unfolded.delete(id)
        else unfolded.add(id)
        onToggle()
      },
    })
}

// Closes an unfolded call from below its output, so a long result needs no scroll back to its ▾.
function hideOf(id: string, Button: ButtonOf, onHide: () => void): RenderElement {
  return Button({
    key: 'hide',
    label: 'hide',
    dimColor: true,
    onPress: () => {
      unfolded.delete(id)
      onHide()
    },
  })
}

// MARK: Hooks

export const register: Register = on => {
  on('ui.render', { component: 'UserMessage', props: { origin: { kind: 'composer' } } }, async ($, e, next) => {
    if (e.surface === 'terminal' && e.props.isExpanded !== isExpandedView) {
      isExpandedView = e.props.isExpanded
      // Tool rows keep their last answer until asked again, so the switch has to redraw them.
      $.ui.invalidate('ui.render')
    }
    if (!isCompact(e.surface)) return next(e)
    const { Box } = $.ui.resolve(e)
    return Box({ flexDirection: 'column', marginBottom: 1, children: [await next(e)] })
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!isCompact(e.surface)) return next(e)
    const { Box, Button, Text } = $.ui.resolve(e)
    const pressable = pressableOf(e.props.tool_use_id, Button, () => $.ui.invalidate('ui.render'))
    const isOpen = unfolded.has(e.props.tool_use_id)
    const toggle = Box({ minWidth: 2, flexShrink: 0, children: [pressable('toggle', isOpen ? '▾' : '▸', true)] })
    if (isOpen) {
      // The engine's row opens with a blank line, so the triangle steps down one to sit beside its ⏺.
      const openToggle = Box({ minWidth: 2, flexShrink: 0, marginTop: 1, children: [pressable('toggle', '▾', true)] })
      const row = Box({ key: 'row', flexDirection: 'row', children: [openToggle, Box({ flexGrow: 1, flexShrink: 1, children: [await next(e)] })] })
      if (hasResultBlock.has(e.props.tool_use_id)) return row
      const hide = hideOf(e.props.tool_use_id, Button, () => $.ui.invalidate('ui.render'))
      return Box({ flexDirection: 'column', children: [row, Box({ marginLeft: 4, children: [hide] })] })
    }
    const line = lineFor(e.props, e.viewport?.columns ?? FALLBACK_COLUMNS)
    const metaStyle = e.props.isErrored ? { color: 'error' } : { dimColor: true }
    return Box({
      key: 'row',
      flexDirection: 'row',
      children: [
        toggle,
        // The dot's own column keeps wrapped rows aligned under the text, as the engine's tool rows do.
        Box({ minWidth: 2, flexShrink: 0, children: [Text({ ...dotStyle(e.props), children: ['●'] })] }),
        Box({ flexShrink: 0, children: [pressable('prefix', 'tool_call: ', true)] }),
        Box({
          flexShrink: 1,
          children: [
            Text({
              wrap: 'wrap',
              children: [
                Text({ bold: true, children: [line.tool] }),
                `(${line.subject})`,
                ...(line.meta === '' ? [] : [Text({ ...metaStyle, children: [` - ${line.meta}`] })]),
              ],
            }),
          ],
        }),
      ],
    })
  })

  // Unfolding hands each grouped read or search to the ToolUse hook, so it flows like every other call.
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (!isCompact(e.surface)) return next(e)
    return next({ ...e, props: { ...e.props, isExpanded: true } })
  })

  // The compact line already carries what the result block would say, unless the call was clicked open.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    if (!isCompact(e.surface)) return next(e)
    // Recorded while still folded, so the row knows to leave the hide button to this block once unfolded.
    hasResultBlock.add(e.props.tool_use_id)
    const { Box, Button } = $.ui.resolve(e)
    if (!unfolded.has(e.props.tool_use_id)) return Box({})
    const hide = hideOf(e.props.tool_use_id, Button, () => $.ui.invalidate('ui.render'))
    return Box({ flexDirection: 'column', children: [await next(e), Box({ marginLeft: 4, children: [hide] })] })
  })
}
