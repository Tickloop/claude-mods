import { expect, test } from 'claude-code/testing'

// MARK: Fixtures

const BASH_ROW = {
  tool_use_id: 'toolu_1',
  tool: 'Bash',
  input: { command: 'cd /Users/arya/repo && grep -rn "needle" packages' },
  isRunning: false,
  isErrored: false,
  isInterrupted: false,
  output: { stdout: 'a\nb\nc', stderr: 'Shell cwd was reset to /Users/arya/repo', interrupted: false },
}

// Nested Text children read as one line, the way the terminal paints them.
function shown(node: unknown): string {
  if (typeof node === 'string') return node
  if (typeof node !== 'object' || node === null) return ''
  // A Button is a leaf whose text is its label.
  const { type, props } = node as { type?: string; props?: { label?: string } }
  if (type === 'Button') return props?.label ?? ''
  const children = (node as { children?: unknown[] }).children ?? []
  return children.map(shown).join('')
}

// The summary as drawn, apart from the toggle's and the dot's columns.
async function lineOf(ui: { drawn: () => Promise<unknown> }): Promise<string> {
  return shown(await ui.drawn()).replace(/^[▸▾]●/, '')
}

// MARK: ToolUse

test('draws a tool call as one compact line with its meta', async $ => {
  const ui = await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'ToolUse',
    props: BASH_ROW,
    viewport: { columns: 200, rows: 50 },
  })
  expect(await lineOf(ui)).toBe(
    'tool_call: Bash(cd /Users/arya/repo && grep -rn "needle" packages) - shell cwd was reset',
  )
})

test('cuts only the input so the line fits a wide terminal', async $ => {
  const long = { ...BASH_ROW, input: { command: 'echo ' + 'x'.repeat(400) } }
  const ui = await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'ToolUse',
    props: long,
    viewport: { columns: 150, rows: 50 },
  })
  const line = await lineOf(ui)
  expect(line.length).toBe(150 - 4 - 2)
  expect(line).toMatch(/…\) - shell cwd was reset$/)
})

test('lets a narrow terminal wrap to a few rows', async $ => {
  const long = { ...BASH_ROW, input: { command: 'echo ' + 'x'.repeat(400) } }
  const ui = await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'ToolUse',
    props: long,
    viewport: { columns: 60, rows: 40 },
  })
  expect((await lineOf(ui)).length).toBe(120)
})

test('colors the dot yellow while running, green when done, red when errored', async $ => {
  const dotColor = async (props: typeof BASH_ROW) => {
    const ui = await $.ui.mount({
      plugin: 'tool-lines',
      surface: 'terminal',
      component: 'ToolUse',
      props,
      viewport: { columns: 200, rows: 50 },
    })
    return (await ui.find({ type: 'Text', text: '●' }))?.props.color
  }
  expect(await dotColor({ ...BASH_ROW, isRunning: true })).toBe('warning')
  // Written by the model but not started yet: no result, not flagged running.
  expect(await dotColor({ ...BASH_ROW, output: undefined } as never)).toBe('warning')
  expect(await dotColor(BASH_ROW)).toBe('success')
  expect(await dotColor({ ...BASH_ROW, isErrored: true })).toBe('error')
})

test('leaves running to the dot and marks errored calls', async $ => {
  const running = await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'ToolUse',
    props: { ...BASH_ROW, isRunning: true, output: undefined },
    viewport: { columns: 200, rows: 50 },
  })
  expect(await lineOf(running)).toBe('tool_call: Bash(cd /Users/arya/repo && grep -rn "needle" packages)')

  const failed = await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'ToolUse',
    props: { ...BASH_ROW, isErrored: true, output: 'Exit code 1' },
    viewport: { columns: 200, rows: 50 },
  })
  expect(await lineOf(failed)).toMatch(/\) - error$/)
})

test('names a file tool by its path', async $ => {
  const ui = await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'ToolUse',
    props: {
      ...BASH_ROW,
      tool: 'Read',
      input: { file_path: '/Users/arya/notes.md', limit: 20 },
      output: { type: 'text' },
    },
    viewport: { columns: 200, rows: 50 },
  })
  expect(await lineOf(ui)).toBe('tool_call: Read(/Users/arya/notes.md)')
})

// MARK: UserMessage

test('pads below the prompt so the tool block starts apart from it', async ($, on) => {
  // Stands for what the engine draws at any site the mod passes on.
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  const ui = await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'UserMessage',
    props: { text: 'find the costs', origin: { kind: 'composer' }, isExpanded: false },
    viewport: { columns: 200, rows: 50 },
  } as never)
  const root = (await ui.drawn()) as { type: string; props?: { marginBottom?: number } }
  expect(root.type).toBe('Box')
  expect(root.props?.marginBottom).toBe(1)
  expect(shown(root)).toBe('engine')
})

// MARK: Expanded view

test('leaves tool rows to the engine while ctrl+o is open', async ($, on) => {
  // Stands for what the engine draws at any site the mod passes on.
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  const mountOn = (component: 'UserMessage' | 'ToolUse' | 'ToolResult', props: object) =>
    $.ui.mount({ plugin: 'tool-lines', surface: 'terminal', component, props, viewport: { columns: 200, rows: 50 } } as never)
  const prompt = { text: 'find the costs', origin: { kind: 'composer' } }

  await mountOn('UserMessage', { ...prompt, isExpanded: true })
  expect(shown(await (await mountOn('ToolUse', BASH_ROW)).drawn())).toBe('engine')
  const result = { tool_use_id: 'toolu_1', tool: 'Bash', output: BASH_ROW.output, isErrored: false }
  expect(shown(await (await mountOn('ToolResult', result)).drawn())).toBe('engine')

  await mountOn('UserMessage', { ...prompt, isExpanded: false })
  expect(shown(await (await mountOn('ToolUse', BASH_ROW)).drawn())).toMatch(/^▸●tool_call: Bash/)
})

// MARK: ToolGroup

test('unfolds a group of reads and searches into one row per call', async ($, on) => {
  let isExpanded: boolean | undefined
  // Stands in for the engine beneath the mod, recording what it was asked to draw.
  on('ui.render', { component: 'ToolGroup' }, async ($, e) => {
    isExpanded = e.props.isExpanded
    const { Text } = $.ui.resolve(e)
    return Text({ children: ['engine'] })
  })
  await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'ToolGroup',
    props: {
      calls: [{ tool: 'Read', input: { file_path: '/a.md' }, isRunning: false, isErrored: false, isInterrupted: false }],
      isActive: false,
      isExpanded: false,
    },
    viewport: { columns: 200, rows: 50 },
  })
  expect(isExpanded).toBe(true)
})

// MARK: ToolResult

test('hides the result block', async $ => {
  const ui = await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'ToolResult',
    props: { tool_use_id: 'toolu_1', tool: 'Bash', output: BASH_ROW.output, isErrored: false },
    viewport: { columns: 200, rows: 50 },
  })
  expect(shown(await ui.drawn())).toBe('')
})

// MARK: Unfolding one call

test('a click unfolds one call into the engine row and its result, and a second folds it', async ($, on) => {
  // Stands for what the engine draws at any site the mod passes on.
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  const row = { ...BASH_ROW, tool_use_id: 'toolu_unfold' }
  const result = { tool_use_id: 'toolu_unfold', tool: 'Bash', output: BASH_ROW.output, isErrored: false }
  const mountOn = (component: 'ToolUse' | 'ToolResult', props: object) =>
    $.ui.mount({ plugin: 'tool-lines', surface: 'terminal', component, props, viewport: { columns: 200, rows: 50 } } as never)

  // The engine draws the folded result block alongside the row, before any click.
  await mountOn('ToolResult', result)
  const use = await mountOn('ToolUse', row)
  expect((await use.find({ key: 'toggle' }))?.props.label).toBe('▸')
  await use.press({ key: 'toggle' })

  expect(shown(await (await mountOn('ToolUse', row)).drawn())).toBe('▾engine')
  expect(shown(await (await mountOn('ToolResult', result)).drawn())).toBe('enginehide')
  const open = await mountOn('ToolUse', row)
  expect((await open.find({ key: 'toggle' }))?.props.label).toBe('▾')
  await open.press({ key: 'toggle' })

  expect(shown(await (await mountOn('ToolUse', row)).drawn())).toMatch(/^▸●tool_call: Bash/)
  expect(shown(await (await mountOn('ToolResult', result)).drawn())).toBe('')
})

test('unfolding one call leaves the others compact', async ($, on) => {
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  const mountRow = (id: string) =>
    $.ui.mount({
      plugin: 'tool-lines',
      surface: 'terminal',
      component: 'ToolUse',
      props: { ...BASH_ROW, tool_use_id: id },
      viewport: { columns: 200, rows: 50 },
    })
  await (await mountRow('toolu_a')).press({ key: 'toggle' })
  expect(shown(await (await mountRow('toolu_a')).drawn())).toBe('▾enginehide')
  expect(shown(await (await mountRow('toolu_b')).drawn())).toMatch(/^▸●tool_call: Bash/)
})

test('the triangle and "tool_call:" unfold the call; the call and its meta are plain text', async ($, on) => {
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  const mountRow = (id: string) =>
    $.ui.mount({
      plugin: 'tool-lines',
      surface: 'terminal',
      component: 'ToolUse',
      props: { ...BASH_ROW, tool_use_id: id },
      viewport: { columns: 200, rows: 50 },
    })
  const folded = await mountRow('toolu_plain')
  expect(await folded.find({ key: 'call' })).toBeUndefined()
  expect(await folded.find({ key: 'meta' })).toBeUndefined()
  expect((await folded.find({ type: 'Text', text: /^Bash$/ }))?.props.bold).toBe(true)
  for (const key of ['toggle', 'prefix']) {
    const id = `toolu_${key}`
    await (await mountRow(id)).press({ key })
    expect(shown(await (await mountRow(id)).drawn())).toBe('▾enginehide')
  }
})

test('keeps an error red', async $ => {
  const ui = await $.ui.mount({
    plugin: 'tool-lines',
    surface: 'terminal',
    component: 'ToolUse',
    props: { ...BASH_ROW, tool_use_id: 'toolu_err', isErrored: true, output: 'Exit code 1' },
    viewport: { columns: 200, rows: 50 },
  })
  expect((await ui.find({ type: 'Text', text: /^ - error$/ }))?.props.color).toBe('error')
})

// MARK: Hide button

test('hide under an unfolded result block folds the call', async ($, on) => {
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  const row = { ...BASH_ROW, tool_use_id: 'toolu_hide' }
  const result = { tool_use_id: 'toolu_hide', tool: 'Bash', output: BASH_ROW.output, isErrored: false }
  const mountOn = (component: 'ToolUse' | 'ToolResult', props: object) =>
    $.ui.mount({ plugin: 'tool-lines', surface: 'terminal', component, props, viewport: { columns: 200, rows: 50 } } as never)

  await mountOn('ToolResult', result)
  await (await mountOn('ToolUse', row)).press({ key: 'prefix' })
  expect(await (await mountOn('ToolUse', row)).find({ key: 'hide' })).toBeUndefined()
  await (await mountOn('ToolResult', result)).press({ key: 'hide' })

  expect(shown(await (await mountOn('ToolUse', row)).drawn())).toMatch(/^▸●tool_call: Bash/)
  expect(shown(await (await mountOn('ToolResult', result)).drawn())).toBe('')
})

test('a grouped call, whose output draws inline, gets hide at the end of its row', async ($, on) => {
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['engine'] }))
  const mountRow = () =>
    $.ui.mount({
      plugin: 'tool-lines',
      surface: 'terminal',
      component: 'ToolUse',
      props: { ...BASH_ROW, tool_use_id: 'toolu_grouped', tool: 'Read', input: { file_path: '/a.md' }, output: { type: 'text' } },
      viewport: { columns: 200, rows: 50 },
    })
  await (await mountRow()).press({ key: 'prefix' })
  const open = await mountRow()
  expect(shown(await open.drawn())).toBe('▾enginehide')
  await open.press({ key: 'hide' })
  expect(shown(await (await mountRow()).drawn())).toMatch(/^▸●tool_call: Read/)
})
