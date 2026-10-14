# jarvis-banner

Draws the JARVIS wordmark in the band above the prompt, the one render site the
engine leaves empty (`AbovePrompt`). The band keeps it pinned in both inline and
fullscreen modes, and a survey takes the band while it is open, so the banner
steps aside for the questions rather than drawing over them.

## Installation

```sh
claude --plugin-dir ./jarvis-banner
```

Or install it from the marketplace this repo publishes:

```sh
claude plugin marketplace add Tickloop/claude-mods
claude plugin install jarvis-banner@claude-mods
```

## Testing

```sh
claude plugin test jarvis-banner
```
