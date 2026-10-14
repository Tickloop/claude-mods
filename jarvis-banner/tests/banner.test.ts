import { expect, test, type TestBody } from 'claude-code/testing'

// MARK: Fixtures

const FIRST_ROW = '     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗'
const TAGLINE = '  your assistant, at your service'

// The band as the engine hands it to the hook: no survey, nothing running, room for the banner.
const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 20,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 20 },
  view: {},
}

const VIEWPORT = { columns: 80, rows: 40 }

type Drawn = { type: string; props?: Record<string, unknown>; children?: unknown[] }

type Engine = Parameters<TestBody>[0]

function rowsOf(node: Drawn): string[] {
  return (node.children ?? []).map(child => {
    const { children = [] } = child as Drawn
    return children.filter((part): part is string => typeof part === 'string').join('')
  })
}

async function draw($: Engine, props: typeof BAND = BAND): Promise<Drawn> {
  const ui = await $.ui.mount({ plugin: 'jarvis-banner', surface: 'terminal', component: 'AbovePrompt', props, viewport: VIEWPORT })
  return (await ui.drawn()) as Drawn
}

// MARK: AbovePrompt

test('draws the JARVIS wordmark and its tagline in the band above the prompt', async $ => {
  const root = await draw($)
  const rows = rowsOf(root)

  expect(root.type).toBe('Box')
  expect(root.props?.flexDirection).toBe('column')
  expect(rows).toHaveLength(7)
  expect(rows[0]).toBe(FIRST_ROW)
  expect(rows[6]).toBe(TAGLINE)
})

test('paints the wordmark cyan and bold, the tagline dim', async $ => {
  const ui = await $.ui.mount({
    plugin: 'jarvis-banner',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: BAND,
    viewport: VIEWPORT,
  })

  expect((await ui.find({ type: 'Text', text: FIRST_ROW }))?.props).toMatchObject({ color: 'cyan', bold: true })
  expect((await ui.find({ type: 'Text', text: TAGLINE }))?.props).toMatchObject({ dimColor: true })
})

test('yields the band to a survey rather than drawing over its questions', async ($, on) => {
  // What sits beneath the mod: the engine's own band, here an engine band the mod must hand on to.
  const reached: string[] = []
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    reached.push(e.component)
    return $.ui.resolve(e).Text({ children: 'engine band' })
  })

  const ui = await $.ui.mount({
    plugin: 'jarvis-banner',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { ...BAND, hasSurvey: true },
    viewport: VIEWPORT,
  })

  expect(reached).toEqual(['AbovePrompt'])
  expect(await ui.find({ type: 'Text', text: FIRST_ROW })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()
})
