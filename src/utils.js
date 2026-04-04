// ScenePulse — Utilities Module
// Extracted from index.js lines 397-412

import { log, warn } from './logger.js';

export function esc(s){if(s==null)return'';if(typeof s==='object')return esc(str(s));return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
export function str(v){if(v==null)return'';if(typeof v==='string')return v;if(typeof v==='number'||typeof v==='boolean')return String(v);if(Array.isArray(v))return v.map(str).filter(Boolean).join(', ');if(typeof v==='object'){for(const val of Object.values(v)){if(typeof val==='string')return val}return''}return String(v)}
export function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,Number(v)||0))}

export function spConfirm(title,message){
    return new Promise(resolve=>{
        const overlay=document.createElement('div');overlay.className='sp-confirm-overlay';
        overlay.innerHTML=`<div class="sp-confirm-dialog"><div class="sp-confirm-title">${esc(title)}</div><div class="sp-confirm-msg">${esc(message)}</div><div class="sp-confirm-actions"><button class="sp-confirm-btn sp-confirm-cancel">Cancel</button><button class="sp-confirm-btn sp-confirm-ok">Confirm</button></div></div>`;
        const close=(result)=>{overlay.classList.add('sp-confirm-closing');setTimeout(()=>overlay.remove(),200);resolve(result)};
        overlay.querySelector('.sp-confirm-cancel').addEventListener('click',()=>close(false));
        overlay.querySelector('.sp-confirm-ok').addEventListener('click',()=>close(true));
        overlay.addEventListener('click',e=>{if(e.target===overlay)close(false)});
        document.body.appendChild(overlay);
        requestAnimationFrame(()=>overlay.classList.add('sp-confirm-visible'));
        overlay.querySelector('.sp-confirm-ok').focus();
    });
}

// Field audit: logs which expected fields are present/missing/empty
export function auditFields(label,obj,expected){
    const present=[],empty=[],missing=[];
    for(const k of expected){
        if(obj[k]===undefined||obj[k]===null)missing.push(k);
        else if(obj[k]===''||(Array.isArray(obj[k])&&obj[k].length===0))empty.push(k);
        else present.push(k);
    }
    log(`AUDIT [${label}]: \u2713 ${present.length} present, \u25CB ${empty.length} empty, \u2717 ${missing.length} missing`);
    if(empty.length)log(`  empty: ${empty.join(', ')}`);
    if(missing.length)warn(`  missing: ${missing.join(', ')}`);
}
