// ScenePulse — Custom Panels Module
// Extracted from index.js lines 4969-5130

import { getSettings, saveSettings } from '../settings.js';
import { esc, str, clamp, spConfirm } from '../utils.js';
import { _cachedNormData } from '../state.js';
import { buildDynamicSchema, buildDynamicPrompt } from '../schema.js';
import { t } from '../i18n.js';

// v6.9.12: refreshCustomSection mirrors the upgraded rendering from
// update-panel.js so live-refresh during panel editing shows the same
// visual treatment (threshold meters, enum pills, list chips, etc.)
export function refreshCustomSection(cp,panelBody){
    if(!panelBody||!cp?.name)return;
    const cpKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
    const existing=panelBody.querySelector(`.sp-section[data-key="${cpKey}"]`);
    if(!existing)return;
    const content=existing.querySelector('.sp-section-content');
    if(!content)return;
    const d=_cachedNormData||{};
    content.innerHTML='';
    for(const f of(cp.fields||[])){
        const r=document.createElement('div');r.className='sp-row';
        r.innerHTML=`<div class="sp-row-label">${esc(f.label||f.key)}</div>`;
        if(f.type==='meter'){
            const num=clamp(parseInt(d[f.key])||0,0,100);
            const invert=!!f.invert;
            const effective=invert?(100-num):num;
            const danger=effective<25?'low':effective<50?'mid':'ok';
            const wrap=document.createElement('div');wrap.className='sp-row-value sp-cp-meter-wrap';
            wrap.innerHTML=`<div class="sp-cp-meter"><div class="sp-cp-meter-fill" data-danger="${danger}" style="width:${Math.max(num,3)}%"></div></div><span class="sp-cp-meter-val">${num}</span>`;
            r.appendChild(wrap);
        } else if(f.type==='enum'){
            const val=str(d[f.key])||'';
            const opts=Array.isArray(f.options)?f.options:[];
            const idx=opts.findIndex(o=>o.toLowerCase()===val.toLowerCase());
            const severity=opts.length>1&&idx>=0?Math.min(3,Math.floor((idx/(opts.length-1))*4)):0;
            const chip=document.createElement('span');chip.className='sp-cp-enum-chip';chip.dataset.severity=severity;
            chip.textContent=val||'\u2014';
            const vd=document.createElement('div');vd.className='sp-row-value';vd.appendChild(chip);r.appendChild(vd);
        } else if(f.type==='list'){
            const arr=Array.isArray(d[f.key])?d[f.key]:[];
            const vd=document.createElement('div');vd.className='sp-row-value sp-cp-list-chips';
            if(!arr.length){vd.textContent='\u2014'}
            else{for(const item of arr){const chip=document.createElement('span');chip.className='sp-cp-list-chip';chip.textContent=item;vd.appendChild(chip)}}
            r.appendChild(vd);
        } else if(f.type==='number'){
            const vd=document.createElement('div');vd.className='sp-row-value';
            const numSpan=document.createElement('span');numSpan.className='sp-cp-number-val';numSpan.textContent=str(d[f.key])||'0';
            vd.appendChild(numSpan);r.appendChild(vd);
        } else {
            const val=document.createElement('div');val.className='sp-row-value';val.textContent=str(d[f.key])||'\u2014';
            r.appendChild(val);
        }
        content.appendChild(r);
    }
}

export function renderCustomPanelsMgr(s,container,panelBody){
    const panels=s.customPanels||[];

    const _openState={};container.querySelectorAll('.sp-custom-panel-card').forEach((c,i)=>{_openState[i]=c.classList.contains('sp-cp-open')});
    container.innerHTML='';
    // Info button + popup
    const infoRow=document.createElement('div');infoRow.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:6px';
    const infoBtn=document.createElement('button');infoBtn.className='sp-cp-info-btn';infoBtn.textContent='?';infoBtn.title='How custom panels work';
    const infoPopup=document.createElement('div');infoPopup.className='sp-cp-info-popup';
    infoPopup.innerHTML=`<b>Custom Panels</b> let you track anything the AI should monitor.<br><br><b>Keys</b> must be <code>lowercase_snake_case</code> (auto-enforced). Examples: <code>health</code>, <code>mana_pool</code>, <code>street_rep</code><br><br><b>LLM Hint</b> tells the AI what to output. Be specific:<br>\u2022 <code>{{user}}'s current health 0-100, reduced by damage</code><br>\u2022 <code>Mana remaining after spellcasting, starts at 100</code><br>\u2022 <code>Reputation with the merchant guild</code><br><br><b>Types:</b> <code>text</code> = free string, <code>number</code> = integer, <code>meter</code> = 0-100 bar, <code>list</code> = array, <code>enum</code> = pick from options<br><br><b>Drag</b> the \u2807 handle to reorder fields within or between panels.`;
    infoBtn.addEventListener('click',()=>infoPopup.classList.toggle('sp-visible'));
    infoRow.appendChild(infoBtn);
    const infoLabel=document.createElement('span');infoLabel.style.cssText='font-size:9px;color:var(--sp-text-dim);opacity:0.6';infoLabel.textContent='How custom panels work';
    infoRow.appendChild(infoLabel);
    container.appendChild(infoRow);container.appendChild(infoPopup);
    if(!panels.length){
        container.appendChild(Object.assign(document.createElement('div'),{className:'sp-cp-empty',textContent:t('No custom panels yet')+'.'}));
        return;
    }
    panels.forEach((cp,cpIdx)=>{
        const card=document.createElement('div');card.className='sp-custom-panel-card';if(_openState[cpIdx]!==undefined?_openState[cpIdx]:true)card.classList.add('sp-cp-open');
        const liveRefresh=()=>{refreshCustomSection(cp,panelBody);
            // Auto-refresh schema/prompt when custom panel changes
            const schemaEl=document.getElementById('sp-schema');
            const promptEl=document.getElementById('sp-sysprompt');
            if(schemaEl&&!s.schema)schemaEl.value=JSON.stringify(buildDynamicSchema(s),null,2);
            if(promptEl&&!s.systemPrompt)promptEl.value=buildDynamicPrompt(s);
        };
        // Header: chevron + toggle + name + duplicate + delete
        const header=document.createElement('div');header.className='sp-cp-header';
        const chevron=document.createElement('span');chevron.className='sp-cp-chevron';chevron.textContent='\u25B6';
        // v6.9.11: enable/disable toggle per panel
        const toggle=document.createElement('input');toggle.type='checkbox';toggle.className='sp-cp-toggle';
        toggle.checked=cp.enabled!==false;toggle.title=t('Enable/disable this panel');
        toggle.addEventListener('click',e=>e.stopPropagation());
        toggle.addEventListener('change',()=>{
            cp.enabled=toggle.checked;saveSettings();liveRefresh();
            // Show/hide the section in the main panel
            const cpKey='custom_'+(cp.name||'untitled').replace(/\s+/g,'_').toLowerCase();
            const sec=panelBody?.querySelector(`.sp-section[data-key="${cpKey}"]`);
            if(sec)sec.classList.toggle('sp-panel-hidden',!toggle.checked);
            card.classList.toggle('sp-cp-disabled',!toggle.checked);
        });
        const nameInput=document.createElement('input');nameInput.className='sp-cp-name';nameInput.type='text';nameInput.value=cp.name||'';nameInput.placeholder=t('Panel name');nameInput.spellcheck=false;
        nameInput.addEventListener('click',e=>e.stopPropagation());
        nameInput.addEventListener('change',()=>{
            const oldKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
            cp.name=nameInput.value.trim()||'Untitled';saveSettings();
            const sec=panelBody?.querySelector(`.sp-section[data-key="${oldKey}"]`);
            if(sec){
                const newKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
                sec.dataset.key=newKey;
                const titleEl=sec.querySelector('.sp-section-title');if(titleEl)titleEl.textContent=cp.name;
            }
        });
        // v6.9.11: duplicate panel button
        const dupBtn=document.createElement('button');dupBtn.className='sp-btn sp-btn-sm sp-cp-dup';dupBtn.textContent='\u2398';dupBtn.title=t('Duplicate panel');
        dupBtn.addEventListener('click',(e)=>{
            e.stopPropagation();
            const clone=JSON.parse(JSON.stringify(cp));
            clone.name=(cp.name||'Untitled')+' (copy)';
            s.customPanels.splice(cpIdx+1,0,clone);
            saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh();
            toastr.info('Panel duplicated');
        });
        const delBtn=document.createElement('button');delBtn.className='sp-btn sp-btn-sm sp-cp-del';delBtn.textContent='\u2715';delBtn.title=t('Delete panel');
        delBtn.addEventListener('click',async(e)=>{
            e.stopPropagation();
            if(!await spConfirm('Delete Panel',`Remove "${cp.name||'Untitled'}" and all its fields? This cannot be undone.`))return;
            s.customPanels.splice(cpIdx,1);saveSettings();
            renderCustomPanelsMgr(s,container,panelBody);
            const cpKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
            const sec=panelBody?.querySelector(`.sp-section[data-key="${cpKey}"]`);
            if(sec){sec.classList.add('sp-panel-hidden');setTimeout(()=>sec.remove(),350)}
            toastr.info('Panel deleted');
        });
        header.appendChild(chevron);header.appendChild(toggle);header.appendChild(nameInput);header.appendChild(dupBtn);header.appendChild(delBtn);
        header.addEventListener('click',(e)=>{if(e.target===nameInput||e.target===toggle)return;card.classList.toggle('sp-cp-open')});
        if(cp.enabled===false)card.classList.add('sp-cp-disabled');
        card.appendChild(header);
        // Collapsible body
        const body=document.createElement('div');body.className='sp-cp-body';
        // Column headers
        if(cp.fields?.length){
            const labels=document.createElement('div');labels.className='sp-cp-field-labels';
            labels.innerHTML=`<span></span><span>${t('Key')}</span><span>${t('Label')}</span><span>${t('Type')}</span><span>${t('LLM Hint')}</span><span></span>`;
            body.appendChild(labels);
        }
        // Fields with drag/drop
        const fieldsList=document.createElement('div');fieldsList.className='sp-cp-fields';
        let _dragSrcIdx=null,_dragSrcCpIdx=null;
        (cp.fields||[]).forEach((f,fIdx)=>{
            const row=document.createElement('div');row.className='sp-cp-field-row';
            row.dataset.fidx=fIdx;row.dataset.cpidx=cpIdx;
            // Drag handle
            const handle=document.createElement('span');handle.className='sp-cp-drag-handle';handle.draggable=true;handle.textContent='\u2807';handle.title=t('Drag to reorder');
            // Drag events
            handle.addEventListener('dragstart',(e)=>{e.stopPropagation();_dragSrcIdx=fIdx;_dragSrcCpIdx=cpIdx;row.classList.add('sp-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',cpIdx+':'+fIdx)});
            handle.addEventListener('dragend',()=>{row.classList.remove('sp-dragging');container.querySelectorAll('.sp-drag-over').forEach(r=>r.classList.remove('sp-drag-over'))});
            row.addEventListener('dragover',(e)=>{e.preventDefault();e.dataTransfer.dropEffect='move';row.classList.add('sp-drag-over')});
            row.addEventListener('dragleave',()=>row.classList.remove('sp-drag-over'));
            row.addEventListener('drop',(e)=>{
                e.preventDefault();row.classList.remove('sp-drag-over');
                const data=e.dataTransfer.getData('text/plain').split(':');
                const srcCp=parseInt(data[0]),srcF=parseInt(data[1]);
                const dstCp=cpIdx,dstF=fIdx;
                if(srcCp===dstCp&&srcF===dstF)return;
                const srcPanel=s.customPanels[srcCp];const dstPanel=s.customPanels[dstCp];
                if(!srcPanel||!dstPanel)return;
                const [moved]=srcPanel.fields.splice(srcF,1);
                dstPanel.fields.splice(dstF,0,moved);
                saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh();
            });
            // Key: enforce lowercase_snake_case
            const keyIn=document.createElement('input');keyIn.className='sp-cp-field-key';keyIn.placeholder='key';keyIn.value=f.key||'';keyIn.spellcheck=false;keyIn.title='JSON key \u2014 lowercase_snake_case only.\nExamples: health, mana_pool, reputation';
            keyIn.addEventListener('change',()=>{f.key=keyIn.value.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').replace(/^[0-9]/,'_$&').replace(/_+/g,'_');keyIn.value=f.key;saveSettings();liveRefresh()});
            const labelIn=document.createElement('input');labelIn.className='sp-cp-field-label';labelIn.placeholder='Label';labelIn.value=f.label||'';
            labelIn.title='Display name shown in the panel.\nExamples: Health, Mana Pool, Street Rep';
            labelIn.addEventListener('change',()=>{f.label=labelIn.value;saveSettings();liveRefresh()});
            const typeSel=document.createElement('select');typeSel.className='sp-cp-field-type';
            typeSel.title='Field type:\n\u2022 text \u2014 free-form string\n\u2022 number \u2014 integer\n\u2022 meter \u2014 0-100 bar\n\u2022 list \u2014 array of strings\n\u2022 enum \u2014 pick from options';
            for(const ft of['text','number','meter','list','enum']){const o=document.createElement('option');o.value=ft;o.textContent=ft;o.selected=f.type===ft;typeSel.appendChild(o)}
            typeSel.addEventListener('change',()=>{f.type=typeSel.value;saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh()});
            const descIn=document.createElement('input');descIn.className='sp-cp-field-desc';descIn.placeholder='Describe for AI...';descIn.value=f.desc||'';
            descIn.title='Instructions for the LLM.\n\u2022 "{{user}}\'s health 0-100, reduced by damage"\n\u2022 "Mana remaining after spellcasting"\n\u2022 "Items the character carries"';
            descIn.addEventListener('change',()=>{f.desc=descIn.value;saveSettings()});
            const rmBtn=document.createElement('button');rmBtn.className='sp-btn sp-btn-sm sp-cp-field-rm';rmBtn.textContent='\u2212';rmBtn.title=t('Remove this field');
            rmBtn.addEventListener('click',()=>{cp.fields.splice(fIdx,1);saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh()});
            row.appendChild(handle);row.appendChild(keyIn);row.appendChild(labelIn);row.appendChild(typeSel);row.appendChild(descIn);row.appendChild(rmBtn);
            if(f.type==='enum'){
                const optRow=document.createElement('div');optRow.className='sp-cp-field-opt-row';
                const optIn=document.createElement('input');optIn.placeholder='Enum options (comma-separated)';optIn.value=(f.options||[]).join(', ');optIn.spellcheck=false;
                optIn.title='Comma-separated list of allowed values.\nExamples: low, medium, high, critical';
                optIn.addEventListener('change',()=>{f.options=optIn.value.split(',').map(s=>s.trim()).filter(Boolean);saveSettings()});
                optRow.appendChild(optIn);
                const wrapper=document.createElement('div');wrapper.appendChild(row);wrapper.appendChild(optRow);
                fieldsList.appendChild(wrapper);
            } else fieldsList.appendChild(row);
        });
        body.appendChild(fieldsList);
        // Validation warning for incomplete fields
        const hasIncomplete=(cp.fields||[]).some(f=>!f.key||!f.desc);
        if(hasIncomplete&&cp.fields?.length){
            const warn=document.createElement('div');warn.className='sp-cp-warn';
            warn.innerHTML='<svg viewBox="0 0 16 16" width="11" height="11" fill="none" style="flex-shrink:0"><path d="M8 1L1 14h14L8 1z" stroke="#f59e0b" stroke-width="1.2" fill="none"/><line x1="8" y1="6" x2="8" y2="9.5" stroke="#f59e0b" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.8" fill="#f59e0b"/></svg><span>Fill in keys and LLM hints so the AI knows what to track.</span>';
            body.appendChild(warn);
        }
        // v6.9.11: key collision detection — warn if any field key
        // in this panel duplicates a key in another panel
        const _allKeys=new Map();
        for(let pi=0;pi<panels.length;pi++){
            for(const pf of(panels[pi].fields||[])){
                const k=(pf.key||'').toLowerCase().trim();
                if(!k)continue;
                if(!_allKeys.has(k))_allKeys.set(k,[]);
                _allKeys.get(k).push(panels[pi].name||'Untitled');
            }
        }
        const _dupeKeys=(cp.fields||[]).filter(f=>{const k=(f.key||'').toLowerCase().trim();return k&&(_allKeys.get(k)||[]).length>1}).map(f=>f.key);
        if(_dupeKeys.length){
            const warn=document.createElement('div');warn.className='sp-cp-warn sp-cp-warn-collision';
            warn.innerHTML=`<svg viewBox="0 0 16 16" width="11" height="11" fill="none" style="flex-shrink:0"><path d="M8 1L1 14h14L8 1z" stroke="#ef4444" stroke-width="1.2" fill="none"/><line x1="8" y1="6" x2="8" y2="9.5" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.8" fill="#ef4444"/></svg><span>Key collision: <b>${_dupeKeys.join(', ')}</b> used in multiple panels. Values will overwrite each other.</span>`;
            body.appendChild(warn);
        }
        const addFieldBtn=document.createElement('button');addFieldBtn.className='sp-btn sp-btn-sm sp-cp-add-field';addFieldBtn.textContent='+ '+t('Add Field');
        addFieldBtn.addEventListener('click',()=>{
            if(!cp.fields)cp.fields=[];
            cp.fields.push({key:'',label:'',type:'text',desc:''});
            saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh();
        });
        body.appendChild(addFieldBtn);card.appendChild(body);container.appendChild(card);
    });
}
