// ScenePulse \u2014 Logger Module
// Extracted from index.js lines 366-396

const LOG='[ScenePulse]';

export const debugLog=[];
export const MAX_LOG=500;

function _fmt(x){if(x instanceof Error)return`${x.message} | ${x.stack?.split('\n').slice(0,3).join(' \u2192 ')}`;if(x==null)return'null';if(typeof x==='object')try{const s=JSON.stringify(x);return s.length>300?s.substring(0,297)+'\u2026':s}catch{return String(x)}return String(x)}
function _push(tag,a){if(debugLog.length>=MAX_LOG)debugLog.splice(0,50);debugLog.push(`[${tag} ${new Date().toLocaleTimeString()}] ${a.map(_fmt).join(' ')}`)}

// v6.12.5 (issue #13): optional bridge for the crash log. Set via
// setErrorListener() so the crash-log module can capture every err()
// call without circular imports.
let _errorListener = null;
export function setErrorListener(fn) { _errorListener = (typeof fn === 'function') ? fn : null; }

export function log(...a){console.log(LOG,...a);_push('',a)}
export function warn(...a){console.warn(LOG,...a);_push('WARN',a)}
export function err(...a){
    console.error(LOG,...a);_push('ERROR',a);
    if (_errorListener) { try { _errorListener(a); } catch {} }
}
