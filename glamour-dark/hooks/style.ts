// MARK: Shape

// Keys and values follow glamour's style JSON (ansi.StyleConfig), so any glamour theme file
// (dracula.json, tokyo-night.json, ...) can be pasted in as another StyleConfig unchanged.

/** A color as glamour writes it: an xterm-256 index ("252") or a hex value ("#C4C4C4"). */
export type StyleColor = string

export type StylePrimitive = {
  block_prefix?: string
  block_suffix?: string
  prefix?: string
  suffix?: string
  color?: StyleColor
  background_color?: StyleColor
  underline?: boolean
  bold?: boolean
  italic?: boolean
  crossed_out?: boolean
  faint?: boolean
  inverse?: boolean
  /** A Go template whose `{{.text}}` is replaced by the element's text. */
  format?: string
}

export type StyleBlock = StylePrimitive & {
  indent?: number
  indent_token?: string
  margin?: number
}

export type StyleList = StyleBlock & {
  level_indent?: number
}

export type StyleTask = StylePrimitive & {
  ticked?: string
  unticked?: string
}

/** The chroma token classes glamour themes a code block by. */
export type ChromaToken =
  | 'text'
  | 'error'
  | 'comment'
  | 'comment_preproc'
  | 'keyword'
  | 'keyword_reserved'
  | 'keyword_namespace'
  | 'keyword_type'
  | 'operator'
  | 'punctuation'
  | 'name'
  | 'name_builtin'
  | 'name_tag'
  | 'name_attribute'
  | 'name_class'
  | 'name_constant'
  | 'name_decorator'
  | 'name_exception'
  | 'name_function'
  | 'name_other'
  | 'literal'
  | 'literal_number'
  | 'literal_date'
  | 'literal_string'
  | 'literal_string_escape'
  | 'generic_deleted'
  | 'generic_emph'
  | 'generic_inserted'
  | 'generic_strong'
  | 'generic_subheading'
  | 'background'

export type StyleCodeBlock = StyleBlock & {
  theme?: string
  chroma?: Partial<Record<ChromaToken, StylePrimitive>>
}

export type StyleTable = StyleBlock & {
  center_separator?: string
  column_separator?: string
  row_separator?: string
}

export type StyleConfig = {
  document: StyleBlock
  block_quote: StyleBlock
  paragraph: StyleBlock
  list: StyleList
  heading: StyleBlock
  h1: StyleBlock
  h2: StyleBlock
  h3: StyleBlock
  h4: StyleBlock
  h5: StyleBlock
  h6: StyleBlock
  text: StylePrimitive
  strikethrough: StylePrimitive
  emph: StylePrimitive
  strong: StylePrimitive
  hr: StylePrimitive
  item: StylePrimitive
  enumeration: StylePrimitive
  task: StyleTask
  link: StylePrimitive
  link_text: StylePrimitive
  image: StylePrimitive
  image_text: StylePrimitive
  code: StyleBlock
  code_block: StyleCodeBlock
  table: StyleTable
  definition_list: StyleBlock
  definition_term: StylePrimitive
  definition_description: StylePrimitive
  html_block: StyleBlock
  html_span: StyleBlock
}

// MARK: Dark

// glamour's default dark style: styles/dark.json on charmbracelet/glamour master.
export const DARK: StyleConfig = {
  document: {
    block_prefix: '\n',
    block_suffix: '\n',
    color: '252',
    margin: 2,
  },
  block_quote: {
    indent: 1,
    indent_token: '│ ',
  },
  paragraph: {},
  list: {
    level_indent: 2,
  },
  heading: {
    block_suffix: '\n',
    color: '39',
    bold: true,
  },
  h1: {
    prefix: ' ',
    suffix: ' ',
    color: '228',
    background_color: '63',
    bold: true,
  },
  h2: {
    prefix: '## ',
  },
  h3: {
    prefix: '### ',
  },
  h4: {
    prefix: '#### ',
  },
  h5: {
    prefix: '##### ',
  },
  h6: {
    prefix: '###### ',
    color: '35',
    bold: false,
  },
  text: {},
  strikethrough: {
    crossed_out: true,
  },
  emph: {
    italic: true,
  },
  strong: {
    bold: true,
  },
  hr: {
    color: '240',
    format: '\n--------\n',
  },
  item: {
    block_prefix: '• ',
  },
  enumeration: {
    block_prefix: '. ',
  },
  task: {
    ticked: '[✓] ',
    unticked: '[ ] ',
  },
  link: {
    color: '30',
    underline: true,
  },
  link_text: {
    color: '35',
    bold: true,
  },
  image: {
    color: '212',
    underline: true,
  },
  image_text: {
    color: '243',
    format: 'Image: {{.text}} →',
  },
  code: {
    prefix: ' ',
    suffix: ' ',
    color: '203',
    background_color: '236',
  },
  code_block: {
    color: '244',
    margin: 2,
    chroma: {
      text: { color: '#C4C4C4' },
      error: { color: '#F1F1F1', background_color: '#F05B5B' },
      comment: { color: '#676767' },
      comment_preproc: { color: '#FF875F' },
      keyword: { color: '#00AAFF' },
      keyword_reserved: { color: '#FF5FD2' },
      keyword_namespace: { color: '#FF5F87' },
      keyword_type: { color: '#6E6ED8' },
      operator: { color: '#EF8080' },
      punctuation: { color: '#E8E8A8' },
      name: { color: '#C4C4C4' },
      name_builtin: { color: '#FF8EC7' },
      name_tag: { color: '#B083EA' },
      name_attribute: { color: '#7A7AE6' },
      name_class: { color: '#F1F1F1', underline: true, bold: true },
      name_constant: {},
      name_decorator: { color: '#FFFF87' },
      name_exception: {},
      name_function: { color: '#00D787' },
      name_other: {},
      literal: {},
      literal_number: { color: '#6EEFC0' },
      literal_date: {},
      literal_string: { color: '#C69669' },
      literal_string_escape: { color: '#AFFFD7' },
      generic_deleted: { color: '#FD5B5B' },
      generic_emph: { italic: true },
      generic_inserted: { color: '#00D787' },
      generic_strong: { bold: true },
      generic_subheading: { color: '#777777' },
      background: { background_color: '#373737' },
    },
  },
  table: {},
  definition_list: {},
  definition_term: {},
  definition_description: {
    block_prefix: '\n🠶 ',
  },
  html_block: {},
  html_span: {},
}

// MARK: Light

// glamour's default light style: styles/light.json on charmbracelet/glamour master. Drawn when the person's
// Claude Code theme is a light one, so body text stays readable on a light terminal background.
export const LIGHT: StyleConfig = {
  document: {
    block_prefix: '\n',
    block_suffix: '\n',
    color: '234',
    margin: 2,
  },
  block_quote: {
    indent: 1,
    indent_token: '│ ',
  },
  paragraph: {},
  list: {
    level_indent: 2,
  },
  heading: {
    block_suffix: '\n',
    color: '27',
    bold: true,
  },
  h1: {
    prefix: ' ',
    suffix: ' ',
    color: '228',
    background_color: '63',
    bold: true,
  },
  h2: {
    prefix: '## ',
  },
  h3: {
    prefix: '### ',
  },
  h4: {
    prefix: '#### ',
  },
  h5: {
    prefix: '##### ',
  },
  h6: {
    prefix: '###### ',
    bold: false,
  },
  text: {},
  strikethrough: {
    crossed_out: true,
  },
  emph: {
    italic: true,
  },
  strong: {
    bold: true,
  },
  hr: {
    color: '249',
    format: '\n--------\n',
  },
  item: {
    block_prefix: '• ',
  },
  enumeration: {
    block_prefix: '. ',
  },
  task: {
    ticked: '[✓] ',
    unticked: '[ ] ',
  },
  link: {
    color: '36',
    underline: true,
  },
  link_text: {
    color: '29',
    bold: true,
  },
  image: {
    color: '205',
    underline: true,
  },
  image_text: {
    color: '243',
    format: 'Image: {{.text}} →',
  },
  code: {
    prefix: ' ',
    suffix: ' ',
    color: '203',
    background_color: '254',
  },
  code_block: {
    color: '242',
    margin: 2,
    chroma: {
      text: { color: '#2A2A2A' },
      error: { color: '#F1F1F1', background_color: '#FF5555' },
      comment: { color: '#8D8D8D' },
      comment_preproc: { color: '#FF875F' },
      keyword: { color: '#279EFC' },
      keyword_reserved: { color: '#FF5FD2' },
      keyword_namespace: { color: '#FB406F' },
      keyword_type: { color: '#7049C2' },
      operator: { color: '#FF2626' },
      punctuation: { color: '#FA7878' },
      name: {},
      name_builtin: { color: '#0A1BB1' },
      name_tag: { color: '#581290' },
      name_attribute: { color: '#8362CB' },
      name_class: { color: '#212121', underline: true, bold: true },
      name_constant: { color: '#581290' },
      name_decorator: { color: '#A3A322' },
      name_exception: {},
      name_function: { color: '#019F57' },
      name_other: {},
      literal: {},
      literal_number: { color: '#22CCAE' },
      literal_date: {},
      literal_string: { color: '#7E5B38' },
      literal_string_escape: { color: '#00AEAE' },
      generic_deleted: { color: '#FD5B5B' },
      generic_emph: { italic: true },
      generic_inserted: { color: '#00D787' },
      generic_strong: { bold: true },
      generic_subheading: { color: '#777777' },
      // light.json keeps glamour's dark #373737 here, which swallows its own dark token colors on a light
      // terminal; a light grey keeps the block visible as a block and the tokens readable.
      background: { background_color: '#EBEBEB' },
    },
  },
  table: {},
  definition_list: {},
  definition_term: {},
  definition_description: {
    block_prefix: '\n🠶 ',
  },
  html_block: {},
  html_span: {},
}

/** The style for a Claude Code theme name: glamour's light style for a light theme (`light`, `light-daltonized`, ...), dark otherwise. */
export function styleForTheme(theme: unknown): StyleConfig {
  return typeof theme === 'string' && theme.startsWith('light') ? LIGHT : DARK
}
