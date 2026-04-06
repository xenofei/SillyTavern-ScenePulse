# Contributing to ScenePulse

Thank you for your interest in contributing to ScenePulse!

## Reporting Bugs

1. Check [existing issues](https://github.com/xenofei/SillyTavern-ScenePulse/issues) first
2. Use the bug report template when creating a new issue
3. Include: ScenePulse version, SillyTavern version, browser, AI model/provider, steps to reproduce
4. Attach the SP debug log (Settings > Advanced > SP Log) and any console output

## Feature Requests

Open an issue using the feature request template describing:
- What you want to achieve
- Why existing features don't cover it
- Any implementation ideas

## Code Contributions

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test with at least one AI model in both Together and Separate modes
5. Bump the version in `manifest.json` and `src/constants.js`
6. Submit a pull request

## Translation Contributions

ScenePulse supports 29 languages. To improve or add translations:

1. Edit `src/i18n.js`
2. Each language is a simple key-value object (344 keys)
3. Use the English keys as reference
4. Submit a PR with your changes

## Code Style

- ES modules (`import`/`export`) — no bundler required
- No external dependencies — everything runs natively in the browser
- CSS split by component in `css/` directory, loaded via `@import` in `style.css`
- Follow existing naming conventions (`sp-` prefix for CSS classes, camelCase for JS)
- All mutable state in `src/state.js` with explicit setter functions

## Questions?

Open a [discussion](https://github.com/xenofei/SillyTavern-ScenePulse/discussions) or [issue](https://github.com/xenofei/SillyTavern-ScenePulse/issues).
