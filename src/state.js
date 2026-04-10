// ScenePulse — Mutable State Module
// v6.9.8: Consolidated from 37 individual let+setter pairs into a
// single state object. External exports are preserved as thin wrappers
// for backward compatibility — no import sites need changing.
//
// The state object is the single source of truth. Direct property
// access (state.generating = true) works from within this module;
// external consumers use the exported setter functions as before.

const state = {
    // ── Generation ──
    generating: false,
    cancelRequested: false,
    genNonce: 0,
    genMeta: { promptTokens: 0, completionTokens: 0, elapsed: 0 },
    inlineGenStartMs: 0,
    currentSnapshotMesIdx: -1,
    lastGenSource: '',
    lastRawResponse: '',
    lastDeltaPayload: null,
    pendingInlineIdx: -1,
    inlineExtractionDone: false,

    // ── Mobile ──
    _spMobileMinimized: false,

    // ── Panel update throttle ──
    _lastPanelUpdate: 0,
    _cachedNormData: null,

    // ── Scene transitions ──
    prevLocation: '',
    prevTimePeriod: '',
    _isTimelineScrub: false,
    _tlScrubDebounce: null,
    _tlScrubRaf: null,

    // ── Weather + time tint ──
    currentWeatherType: '',
    currentTimePeriod: '',

    // ── Timers ──
    elapsedInterval: null,
    _inlineWaitTimerId: null,
    _tpLoadingTimerId: null,
    _tpBannerTimerId: null,

    // ── Sampler backup ──
    _savedSamplerValues: null,

    // ── Character colors ──
    _charColorMap: new Map(),
    _charColorNext: 0,

    // ── Stream hider ──
    _streamHiderInterval: null,
    _streamHiderStart: 0,
    _streamHiderStyleEl: null,
    _streamHiderObserver: null,

    // ── Token tracking ──
    _sessionTokensUsed: 0,
    _lastDeltaSavings: 0,
};

// ── Exported getters (ES module live bindings via getter functions) ──
// These are read by external modules as if they were plain variables.
// The export let + Object.defineProperty pattern gives us true live
// bindings that track the state object's current value.

// ES modules don't support Object.defineProperty on the module
// namespace, so we can't dynamically create live-binding exports.
// The standard ESM pattern for mutable shared state is export let +
// setter function, which is what we keep below. The consolidation
// benefit is internal organization — the state object groups related
// fields and makes the module easier to scan. The exported let +
// setter wrappers stay for API compatibility (zero import changes).

// ── Generation state ──
export let generating = state.generating;
export function setGenerating(v) { generating = state.generating = v; }

export let cancelRequested = state.cancelRequested;
export function setCancelRequested(v) { cancelRequested = state.cancelRequested = v; }

export let genNonce = state.genNonce;
export function setGenNonce(v) { genNonce = state.genNonce = v; }

export let genMeta = state.genMeta;
export function setGenMeta(v) { genMeta = state.genMeta = v; }

export let inlineGenStartMs = state.inlineGenStartMs;
export function setInlineGenStartMs(v) { inlineGenStartMs = state.inlineGenStartMs = v; }

export let currentSnapshotMesIdx = state.currentSnapshotMesIdx;
export function setCurrentSnapshotMesIdx(v) { currentSnapshotMesIdx = state.currentSnapshotMesIdx = v; }

export let lastGenSource = state.lastGenSource;
export function setLastGenSource(v) { lastGenSource = state.lastGenSource = v; }

export let lastRawResponse = state.lastRawResponse;
export function setLastRawResponse(v) { lastRawResponse = state.lastRawResponse = v; }

export let lastDeltaPayload = state.lastDeltaPayload;
export function setLastDeltaPayload(v) { lastDeltaPayload = state.lastDeltaPayload = v; }

export let pendingInlineIdx = state.pendingInlineIdx;
export function setPendingInlineIdx(v) { pendingInlineIdx = state.pendingInlineIdx = v; }

export let inlineExtractionDone = state.inlineExtractionDone;
export function setInlineExtractionDone(v) { inlineExtractionDone = state.inlineExtractionDone = v; }

// ── Mobile state ──
export let _spMobileMinimized = state._spMobileMinimized;
export function set_spMobileMinimized(v) { _spMobileMinimized = state._spMobileMinimized = v; }

// ── Panel update throttle ──
export let _lastPanelUpdate = state._lastPanelUpdate;
export function set_lastPanelUpdate(v) { _lastPanelUpdate = state._lastPanelUpdate = v; }

export let _cachedNormData = state._cachedNormData;
export function set_cachedNormData(v) { _cachedNormData = state._cachedNormData = v; }

// ── Scene transitions ──
export let prevLocation = state.prevLocation;
export function setPrevLocation(v) { prevLocation = state.prevLocation = v; }

export let prevTimePeriod = state.prevTimePeriod;
export function setPrevTimePeriod(v) { prevTimePeriod = state.prevTimePeriod = v; }

export let _isTimelineScrub = state._isTimelineScrub;
export function set_isTimelineScrub(v) { _isTimelineScrub = state._isTimelineScrub = v; }

export let _tlScrubDebounce = state._tlScrubDebounce;
export function set_tlScrubDebounce(v) { _tlScrubDebounce = state._tlScrubDebounce = v; }

export let _tlScrubRaf = state._tlScrubRaf;
export function set_tlScrubRaf(v) { _tlScrubRaf = state._tlScrubRaf = v; }

// ── Weather + time tint ──
export let currentWeatherType = state.currentWeatherType;
export function setCurrentWeatherType(v) { currentWeatherType = state.currentWeatherType = v; }

export let currentTimePeriod = state.currentTimePeriod;
export function setCurrentTimePeriod(v) { currentTimePeriod = state.currentTimePeriod = v; }

// ── Timers ──
export let elapsedInterval = state.elapsedInterval;
export function setElapsedInterval(v) { elapsedInterval = state.elapsedInterval = v; }

export let _savedSamplerValues = state._savedSamplerValues;
export function set_savedSamplerValues(v) { _savedSamplerValues = state._savedSamplerValues = v; }

// ── Character colors ──
export let _charColorMap = state._charColorMap;
export function set_charColorMap(v) { _charColorMap = state._charColorMap = v; }

export let _charColorNext = state._charColorNext;
export function set_charColorNext(v) { _charColorNext = state._charColorNext = v; }

// ── Stream hider ──
export let _streamHiderInterval = state._streamHiderInterval;
export function set_streamHiderInterval(v) { _streamHiderInterval = state._streamHiderInterval = v; }

export let _streamHiderStart = state._streamHiderStart;
export function set_streamHiderStart(v) { _streamHiderStart = state._streamHiderStart = v; }

export let _streamHiderStyleEl = state._streamHiderStyleEl;
export function set_streamHiderStyleEl(v) { _streamHiderStyleEl = state._streamHiderStyleEl = v; }

export let _streamHiderObserver = state._streamHiderObserver;
export function set_streamHiderObserver(v) { _streamHiderObserver = state._streamHiderObserver = v; }

// ── Token tracking ──
export let _sessionTokensUsed = state._sessionTokensUsed;
export function addSessionTokens(n) { _sessionTokensUsed = state._sessionTokensUsed += n; }
export function resetSessionTokens() { _sessionTokensUsed = state._sessionTokensUsed = 0; }

export let _lastDeltaSavings = state._lastDeltaSavings;
export function setLastDeltaSavings(v) { _lastDeltaSavings = state._lastDeltaSavings = v; }

// ── Timer leak fixes ──
export let _inlineWaitTimerId = state._inlineWaitTimerId;
export function set_inlineWaitTimerId(v) { _inlineWaitTimerId = state._inlineWaitTimerId = v; }

export let _tpLoadingTimerId = state._tpLoadingTimerId;
export function set_tpLoadingTimerId(v) { _tpLoadingTimerId = state._tpLoadingTimerId = v; }

export let _tpBannerTimerId = state._tpBannerTimerId;
export function set_tpBannerTimerId(v) { _tpBannerTimerId = state._tpBannerTimerId = v; }
