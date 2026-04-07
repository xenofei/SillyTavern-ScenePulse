# Tests

Manual dev scripts. **Not** an automated test suite — there is no runner, no CI hookup, and the SillyTavern extension loader does not load anything in this directory.

Each script is a standalone Node ES module. Run with bare `node`:

```bash
node tests/vendor/jsonrepair.test.mjs   # 106-case smoke suite for the vendored jsonrepair lib
node tests/vendor/compare.test.mjs      # head-to-head: old in-house regex repair vs jsonrepair
```

Add new manual tests as `tests/<area>/<name>.test.mjs`. Keep them dependency-free so `node tests/<...>.test.mjs` always works without `npm install`.
