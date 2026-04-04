// ScenePulse — Mutable State Module
// Collects all module-level mutable variables from throughout index.js

// ── Generation state (line ~1359-1368) ──
export let generating = false;
export function setGenerating(v) { generating = v; }

export let cancelRequested = false;
export function setCancelRequested(v) { cancelRequested = v; }

export let genNonce = 0;
export function setGenNonce(v) { genNonce = v; }

export let genMeta = {promptTokens:0, completionTokens:0, elapsed:0};
export function setGenMeta(v) { genMeta = v; }

export let inlineGenStartMs = 0;
export function setInlineGenStartMs(v) { inlineGenStartMs = v; }

export let currentSnapshotMesIdx = -1;
export function setCurrentSnapshotMesIdx(v) { currentSnapshotMesIdx = v; }

export let lastGenSource = '';
export function setLastGenSource(v) { lastGenSource = v; }

export let lastRawResponse = '';
export function setLastRawResponse(v) { lastRawResponse = v; }

export let pendingInlineIdx = -1;
export function setPendingInlineIdx(v) { pendingInlineIdx = v; }

export let inlineExtractionDone = false;
export function setInlineExtractionDone(v) { inlineExtractionDone = v; }

// ── Mobile state (line ~120) ──
export let _spMobileMinimized = false;
export function set_spMobileMinimized(v) { _spMobileMinimized = v; }

// ── Panel update throttle (line ~3031) ──
export let _lastPanelUpdate = 0;
export function set_lastPanelUpdate(v) { _lastPanelUpdate = v; }

// ── Cached normalized data (line ~3032) ──
export let _cachedNormData = null;
export function set_cachedNormData(v) { _cachedNormData = v; }

// ── Scene transition state (line ~2800) ──
export let prevLocation = '';
export function setPrevLocation(v) { prevLocation = v; }

export let prevTimePeriod = '';
export function setPrevTimePeriod(v) { prevTimePeriod = v; }

export let _isTimelineScrub = false;
export function set_isTimelineScrub(v) { _isTimelineScrub = v; }

export let _tlScrubDebounce = null;
export function set_tlScrubDebounce(v) { _tlScrubDebounce = v; }

export let _tlScrubRaf = null;
export function set_tlScrubRaf(v) { _tlScrubRaf = v; }

// ── Weather state (line ~2491) ──
export let currentWeatherType = '';
export function setCurrentWeatherType(v) { currentWeatherType = v; }

// ── Time tint state (line ~2775) ──
export let currentTimePeriod = '';
export function setCurrentTimePeriod(v) { currentTimePeriod = v; }

// ── Elapsed timer (line ~1540) ──
export let elapsedInterval = null;
export function setElapsedInterval(v) { elapsedInterval = v; }

// ── Sampler values backup (line ~897) ──
export let _savedSamplerValues = null;
export function set_savedSamplerValues(v) { _savedSamplerValues = v; }

// ── Character color state (line ~622-623) ──
export let _charColorMap = new Map();
export function set_charColorMap(v) { _charColorMap = v; }

export let _charColorNext = 0;
export function set_charColorNext(v) { _charColorNext = v; }

// ── Stream hider state (line ~1444-1447) ──
export let _streamHiderInterval = null;
export function set_streamHiderInterval(v) { _streamHiderInterval = v; }

export let _streamHiderStart = 0;
export function set_streamHiderStart(v) { _streamHiderStart = v; }

export let _streamHiderStyleEl = null;
export function set_streamHiderStyleEl(v) { _streamHiderStyleEl = v; }

export let _streamHiderObserver = null;
export function set_streamHiderObserver(v) { _streamHiderObserver = v; }
