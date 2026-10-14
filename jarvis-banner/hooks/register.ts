import type { Register } from 'claude-code'

// MARK: Banner

/**
 * The JARVIS wordmark, one row per line, drawn in the band above the prompt.
 * The rows are fixed-width block glyphs, so they read whole at any `bodyColumns`.
 */
const ROWS = [
  '     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗',
  '     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝',
  '     ██║███████║██████╔╝██║   ██║██║███████╗',
  '██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║',
  '╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║',
  ' ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝',
]
const TAGLINE = '  your assistant, at your service'

// MARK: Hooks

/**
 * Draws the banner in the `AbovePrompt` band, the one render site the engine
 * leaves empty. A survey holds the band while it is open, so the hook yields
 * to it rather than drawing over the questions.
 *
 * @param on the engine's registrar
 */
export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    return Box({
      flexDirection: 'column',
      children: [
        ...ROWS.map(row => Text({ color: 'cyan', bold: true, children: [row] })),
        Text({ dimColor: true, children: [TAGLINE] }),
      ],
    })
  })
}
