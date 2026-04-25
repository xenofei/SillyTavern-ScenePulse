// ScenePulse — Utilities Module
// Extracted from index.js lines 397-412

import { log, warn } from './logger.js';

export function esc(s){if(s==null)return'';if(typeof s==='object')return esc(str(s));return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
export function str(v){if(v==null)return'';if(typeof v==='string')return v;if(typeof v==='number'||typeof v==='boolean')return String(v);if(Array.isArray(v))return v.map(str).filter(Boolean).join(', ');if(typeof v==='object'){for(const val of Object.values(v)){if(typeof val==='string')return val}return''}return String(v)}
export function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,Number(v)||0))}

export function spConfirm(title,message,opts){
    const okLabel=opts?.okLabel||'Confirm';
    const cancelLabel=opts?.cancelLabel||'Cancel';
    const okClass=opts?.danger===false?'sp-confirm-ok-safe':'sp-confirm-ok';
    return new Promise(resolve=>{
        const overlay=document.createElement('div');overlay.className='sp-confirm-overlay';
        overlay.innerHTML=`<div class="sp-confirm-dialog"><div class="sp-confirm-title">${esc(title)}</div><div class="sp-confirm-msg">${esc(message)}</div><div class="sp-confirm-actions"><button class="sp-confirm-btn sp-confirm-cancel">${esc(cancelLabel)}</button><button class="sp-confirm-btn ${okClass}">${esc(okLabel)}</button></div></div>`;
        const close=(result)=>{overlay.classList.add('sp-confirm-closing');setTimeout(()=>overlay.remove(),200);document.removeEventListener('keydown',onKey,true);resolve(result)};
        const onKey=(e)=>{if(e.key==='Escape'){close(false);e.stopPropagation()}else if(e.key==='Enter'){close(true);e.stopPropagation()}};
        overlay.querySelector('.sp-confirm-cancel').addEventListener('click',()=>close(false));
        overlay.querySelector('.'+okClass).addEventListener('click',()=>close(true));
        overlay.addEventListener('click',e=>{if(e.target===overlay)close(false)});
        // Stop pointer/key events bubbling to ST handlers (e.g. settings-panel close)
        const stop=(e)=>e.stopPropagation();
        overlay.addEventListener('mousedown',stop);overlay.addEventListener('click',stop);overlay.addEventListener('pointerdown',stop);
        document.addEventListener('keydown',onKey,true);
        document.body.appendChild(overlay);
        requestAnimationFrame(()=>overlay.classList.add('sp-confirm-visible'));
        overlay.querySelector('.'+okClass).focus();
    });
}

/**
 * spPrompt — styled text-input dialog. Returns Promise<string|null>;
 * resolves to null on cancel/escape/empty submit, trimmed string on OK.
 *
 * @param {string} title
 * @param {string} message
 * @param {object} [opts]
 * @param {string} [opts.value]        Initial input value
 * @param {string} [opts.placeholder]  Input placeholder
 * @param {string} [opts.okLabel]      OK button label (default "OK")
 * @param {string} [opts.cancelLabel]  Cancel button label (default "Cancel")
 * @param {(v:string)=>string|null} [opts.validate]
 *        Optional sync validator. Return error string to block submit;
 *        return null/undefined to allow.
 */
export function spPrompt(title,message,opts={}){
    const okLabel=opts.okLabel||'OK';
    const cancelLabel=opts.cancelLabel||'Cancel';
    return new Promise(resolve=>{
        const overlay=document.createElement('div');overlay.className='sp-confirm-overlay sp-prompt-overlay';
        overlay.innerHTML=`<div class="sp-confirm-dialog sp-prompt-dialog"><div class="sp-confirm-title">${esc(title)}</div>${message?`<div class="sp-confirm-msg">${esc(message)}</div>`:''}<input type="text" class="sp-prompt-input" placeholder="${esc(opts.placeholder||'')}" value="${esc(opts.value||'')}"><div class="sp-prompt-error" style="display:none"></div><div class="sp-confirm-actions"><button class="sp-confirm-btn sp-confirm-cancel">${esc(cancelLabel)}</button><button class="sp-confirm-btn sp-confirm-ok-safe">${esc(okLabel)}</button></div></div>`;
        const input=overlay.querySelector('.sp-prompt-input');
        const errEl=overlay.querySelector('.sp-prompt-error');
        const close=(result)=>{overlay.classList.add('sp-confirm-closing');setTimeout(()=>overlay.remove(),200);document.removeEventListener('keydown',onKey,true);resolve(result)};
        const submit=()=>{
            const v=input.value.trim();
            if(typeof opts.validate==='function'){
                const err=opts.validate(v);
                if(err){errEl.textContent=err;errEl.style.display='block';input.focus();return}
            }
            close(v||null);
        };
        const onKey=(e)=>{if(e.key==='Escape'){close(null);e.stopPropagation()}else if(e.key==='Enter'&&document.activeElement===input){submit();e.stopPropagation()}};
        overlay.querySelector('.sp-confirm-cancel').addEventListener('click',()=>close(null));
        overlay.querySelector('.sp-confirm-ok-safe').addEventListener('click',submit);
        overlay.addEventListener('click',e=>{if(e.target===overlay)close(null)});
        const stop=(e)=>e.stopPropagation();
        overlay.addEventListener('mousedown',stop);overlay.addEventListener('click',stop);overlay.addEventListener('pointerdown',stop);
        document.addEventListener('keydown',onKey,true);
        document.body.appendChild(overlay);
        requestAnimationFrame(()=>overlay.classList.add('sp-confirm-visible'));
        input.focus();input.select();
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
