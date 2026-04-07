# Vendored dependencies

Third-party libraries pinned in source. Used by ScenePulse internals only — never re-exported as a public API.

## jsonrepair

| | |
|---|---|
| **File** | `jsonrepair.mjs` |
| **Version** | 3.12.0 |
| **License** | ISC (see [`jsonrepair.LICENSE`](./jsonrepair.LICENSE)) |
| **Upstream** | https://github.com/josdejong/jsonrepair |
| **Source** | https://esm.sh/jsonrepair@3.12.0/es2022/jsonrepair.bundle.mjs |
| **Vendored** | 2026-04-06 |
| **Local patches** | None |
| **Used by** | [`src/generation/extraction.js`](../generation/extraction.js) — `cleanJson()` repair pass for malformed inline tracker JSON |

### Why vendored

ScenePulse is a no-build SillyTavern extension loaded by the browser as a `<script type="module">`. There's no `package.json`, no bundler, no `npm install` step. Vendoring is the only way to pull in third-party ESM code while keeping installation a single `git clone`. Pinning the source also makes upgrades auditable — every byte that runs in user browsers is in this directory.

### Upgrading

```bash
curl -L https://esm.sh/jsonrepair@<NEW_VERSION>/es2022/jsonrepair.bundle.mjs > src/vendor/jsonrepair.mjs
# Update the version + date in this README and in the header comment of jsonrepair.mjs
# Re-fetch the LICENSE file if upstream license text has changed:
curl -L https://raw.githubusercontent.com/josdejong/jsonrepair/main/LICENSE.md > src/vendor/jsonrepair.LICENSE
# Re-run the validation suite:
node tests/vendor/jsonrepair.test.mjs
node tests/vendor/compare.test.mjs
```

The `esm.sh` bundle ships as a single-line minified ESM module that exports `jsonrepair` and `JSONRepairError`. ScenePulse only consumes `jsonrepair`.

### Validation

`jsonrepair` is validated against 106 test cases covering valid pass-through, unescaped quotes, trailing commas, missing commas, single quotes, smart quotes, Python literals, comments, markdown fences, number edge cases, brace/bracket issues, unicode, whitespace, mixed quote types, realistic ScenePulse-style tracker payloads, and edge cases. See [`tests/vendor/`](../../tests/vendor).
