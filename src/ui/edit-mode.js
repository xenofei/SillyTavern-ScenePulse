// src/ui/edit-mode.js — Inline editing support for panel fields
import { log } from '../logger.js';
import { getLatestSnapshot } from '../settings.js';

// Makes an element click-to-edit when edit mode is on
export function mkEditable(el,getValue,setValue){
    el.classList.add('sp-editable');
    el.addEventListener('click',(e)=>{
        e.stopPropagation();
        const panel=document.getElementById('sp-panel');
        if(!panel?.classList.contains('sp-edit-mode'))return;
        if(el.contentEditable==='true')return;
        el.contentEditable='true';
        el.classList.add('sp-editing');
        el.focus();
        const range=document.createRange();range.selectNodeContents(el);
        const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range);
    });
    function save(){
        if(el.contentEditable!=='true')return;
        el.contentEditable='false';
        el.classList.remove('sp-editing');
        const newVal=el.textContent.trim();
        if(newVal!==getValue()){
            setValue(newVal);
            const snap=getLatestSnapshot();
            if(snap){SillyTavern.getContext().saveMetadata();log('Field edited:',newVal.substring(0,40))}
        }
    }
    el.addEventListener('blur',save);
    el.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();save()}});
}
