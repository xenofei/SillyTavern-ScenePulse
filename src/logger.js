// ScenePulse \u2014 Logger Module
// Extracted from index.js lines 366-396

const LOG='[ScenePulse]';

export const debugLog=[];
export const MAX_LOG=500;

// Console buffer -- captures ScenePulse's own log output for easy copying
export const consoleBuf=[];
export const MAX_CONSOLE=500;

function _fmt(x){if(x instanceof Error)return`${x.message} | ${x.stack?.split('\n').slice(0,3).join(' \u2192 ')}`;if(x==null)return'null';if(typeof x==='object')try{const s=JSON.stringify(x);return s.length>300?s.substring(0,297)+'\u2026':s}catch{return String(x)}return String(x)}
function _push(tag,a){if(debugLog.length>=MAX_LOG)debugLog.splice(0,50);debugLog.push(`[${tag} ${new Date().toLocaleTimeString()}] ${a.map(_fmt).join(' ')}`)}
function _pushConsole(level,args){
    const ts=new Date().toLocaleTimeString();
    const parts=args.map(a=>{try{return typeof a==='object'?JSON.stringify(a).substring(0,500):String(a)}catch{return String(a)}});
    consoleBuf.push(`[${level} ${ts}] ${parts.join(' ')}`);
    if(consoleBuf.length>MAX_CONSOLE)consoleBuf.shift();
}

export function log(...a){console.log(LOG,...a);_push('',a);_pushConsole('LOG',a)}
export function warn(...a){console.warn(LOG,...a);_push('WARN',a);_pushConsole('WARN',a)}
export function err(...a){console.error(LOG,...a);_push('ERROR',a);_pushConsole('ERR',a)}
