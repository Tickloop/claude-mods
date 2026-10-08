# claude-mods

Make your claude code look and feel better. Easier to read so you miss fewer things. 

| Mod | What it does |
| --- | --- |
| `glamour-dark` | Draws the model's text replies with [glamour](https://github.com/charmbracelet/glamour)'s default dark style |
| `tool-lines` | Draws each tool call as one compact `tool_call: Tool(input) - meta` line and hides its result block |

## Installation

Add this repo as a plugin marketplace, then install the mods you want:

```sh
claude plugin marketplace add Tickloop/claude-mods
claude plugin install glamour-dark@claude-mods
claude plugin install tool-lines@claude-mods
```

Or do the same from inside a session with `/plugin marketplace add Tickloop/claude-mods`, then pick the mods from `/plugin`. Run `/reload-plugins` to apply them without restarting.

To pick up new commits later:

```sh
claude plugin marketplace update claude-mods
claude plugin update glamour-dark@claude-mods
```

## Development

Clone the repo, then start Claude Code from its root with both mods loaded:

```sh
claude --plugin-dir ./glamour-dark --plugin-dir ./tool-lines
```

`--plugin-dir` loads a mod for that session only. To load them every time, add an alias to your shell config (`~/.zshrc` or `~/.bashrc`), pointing at where you cloned the repo:

```sh
alias claude='command claude --plugin-dir ~/path/to/claude-mods/glamour-dark --plugin-dir ~/path/to/claude-mods/tool-lines'
```
