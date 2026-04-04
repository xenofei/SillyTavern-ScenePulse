// ScenePulse — Custom Panels Module
// Extracted from index.js lines 4969-5130

import { getSettings, saveSettings } from '../settings.js';
import { esc, str, clamp, spConfirm } from '../utils.js';
import { _cachedNormData } from '../state.js';
import { buildDynamicSchema, buildDynamicPrompt } from '../schema.js';

export function refreshCustomSection(cp,panelBody){
    if(!panelBody||!cp?.name)return;
    const cpKey='custom_'+cp.name.replace(/\s+/g,'_').toLowerCase();
    const existing=panelBody.querySelector(`.sp-section[data-key="${cpKey}"]`);
    if(!existing)return;
    // Re-render just the content inside the section body
    const content=existing.querySelector('.sp-section-content');
    if(!content)return;
    const d=_cachedNormData||{};
    content.innerHTML='';
    for(const f of(cp.fields||[])){
        const r=document.createElement('div');r.className='sp-row';
        r.innerHTML=`<div class="sp-row-label">${esc(f.label||f.key)}</div>`;
        if(f.type==='meter'){
            const num=parseInt(d[f.key])||0;
            const wrap=document.createElement('div');wrap.className='sp-row-value sp-cp-meter-wrap';
            wrap.innerHTML=`<div class="sp-cp-meter"><div class="sp-cp-meter-fill" style="width:${clamp(num,0,100)}%"></div></div><span class="sp-cp-meter-val">${num}</span>`;
            r.appendChild(wrap);
        } else if(f.type==='list'&&Array.isArray(d[f.key])){
            const val=document.createElement('div');val.className='sp-row-value';val.textContent=d[f.key].join(', ')||'\u2014';
            r.appendChild(val);
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
        container.appendChild(Object.assign(document.createElement('div'),{className:'sp-cp-empty',textContent:'No custom panels yet. Create one to track custom data.'}));
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
        // Header: chevron + name + delete
        const header=document.createElement('div');header.className='sp-cp-header';
        const chevron=document.createElement('span');chevron.className='sp-cp-chevron';chevron.textContent='\u25B6';
        const nameInput=document.createElement('input');nameInput.className='sp-cp-name';nameInput.type='text';nameInput.value=cp.name||'';nameInput.placeholder='Panel name';nameInput.spellcheck=false;
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
        const delBtn=document.createElement('button');delBtn.className='sp-btn sp-btn-sm sp-cp-del';delBtn.textContent='\u2715';delBtn.title='Delete panel';
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
        header.appendChild(chevron);header.appendChild(nameInput);header.appendChild(delBtn);
        header.addEventListener('click',(e)=>{if(e.target===nameInput)return;card.classList.toggle('sp-cp-open')});
        card.appendChild(header);
        // Collapsible body
        const body=document.createElement('div');body.className='sp-cp-body';
        // Column headers
        if(cp.fields?.length){
            const labels=document.createElement('div');labels.className='sp-cp-field-labels';
            labels.innerHTML='<span></span><span>Key</span><span>Label</span><span>Type</span><span>LLM Hint</span><span></span>';
            body.appendChild(labels);
        }
        // Fields with drag/drop
        const fieldsList=document.createElement('div');fieldsList.className='sp-cp-fields';
        let _dragSrcIdx=null,_dragSrcCpIdx=null;
        (cp.fields||[]).forEach((f,fIdx)=>{
            const row=document.createElement('div');row.className='sp-cp-field-row';
            row.dataset.fidx=fIdx;row.dataset.cpidx=cpIdx;
            // Drag handle
            const handle=document.createElement('span');handle.className='sp-cp-drag-handle';handle.draggable=true;handle.textContent='\u2807';handle.title='Drag to reorder';
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
            for(const t of['text','number','meter','list','enum']){const o=document.createElement('option');o.value=t;o.textContent=t;o.selected=f.type===t;typeSel.appendChild(o)}
            typeSel.addEventListener('change',()=>{f.type=typeSel.value;saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh()});
            const descIn=document.createElement('input');descIn.className='sp-cp-field-desc';descIn.placeholder='Describe for AI...';descIn.value=f.desc||'';
            descIn.title='Instructions for the LLM.\n\u2022 "{{user}}\'s health 0-100, reduced by damage"\n\u2022 "Mana remaining after spellcasting"\n\u2022 "Items the character carries"';
            descIn.addEventListener('change',()=>{f.desc=descIn.value;saveSettings()});
            const rmBtn=document.createElement('button');rmBtn.className='sp-btn sp-btn-sm sp-cp-field-rm';rmBtn.textContent='\u2212';rmBtn.title='Remove this field';
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
        const addFieldBtn=document.createElement('button');addFieldBtn.className='sp-btn sp-btn-sm sp-cp-add-field';addFieldBtn.textContent='+ Add Field';
        addFieldBtn.addEventListener('click',()=>{
            if(!cp.fields)cp.fields=[];
            cp.fields.push({key:'',label:'',type:'text',desc:''});
            saveSettings();renderCustomPanelsMgr(s,container,panelBody);liveRefresh();
        });
        body.appendChild(addFieldBtn);card.appendChild(body);container.appendChild(card);
    });
}
