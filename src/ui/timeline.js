// src/ui/timeline.js — Timeline Scrubber
import { log } from '../logger.js';
import { t } from '../i18n.js';
import { currentSnapshotMesIdx, setCurrentSnapshotMesIdx, _isTimelineScrub, set_isTimelineScrub, _tlScrubDebounce, set_tlScrubDebounce, _tlScrubRaf, set_tlScrubRaf } from '../state.js';
import { getTrackerData } from '../settings.js';
import { normalizeTracker } from '../normalize.js';
import { updatePanel } from './update-panel.js';
import { showPanel } from './panel.js';

export function renderTimeline(){
    const _tlStart=performance.now();
    const body=document.getElementById('sp-panel-body');if(!body)return;
    let tl=document.getElementById('sp-timeline');
    if(tl)tl.remove();
    const all=getTrackerData();const sorted=Object.keys(all.snapshots).map(Number).sort((a,b)=>a-b);
    if(sorted.length<2)return;
    const latest=sorted[sorted.length-1];
    let selectedKey=currentSnapshotMesIdx>=0?currentSnapshotMesIdx:latest;
    // Display max 8 nodes on scrubber (sampled), but all snapshots remain stored for graphs/analytics
    const MAX_DISPLAY=8;
    let displayKeys=sorted;
    if(sorted.length>MAX_DISPLAY){
        displayKeys=[sorted[0]];
        const middle=sorted.slice(1,-1);
        const step=middle.length/(MAX_DISPLAY-2);
        for(let i=0;i<MAX_DISPLAY-2;i++){
            displayKeys.push(middle[Math.min(Math.round(i*step),middle.length-1)]);
        }
        displayKeys.push(sorted[sorted.length-1]);
        // Deduplicate and sort
        displayKeys=[...new Set(displayKeys)].sort((a,b)=>a-b);
    }
    // Ensure selectedKey is in displayKeys
    if(selectedKey>=0&&!displayKeys.includes(selectedKey)){
        // Replace the nearest sampled node with the selected one
        let nearest=0,minDist=Infinity;
        for(let i=1;i<displayKeys.length-1;i++){
            const d=Math.abs(displayKeys[i]-selectedKey);
            if(d<minDist){minDist=d;nearest=i}
        }
        if(nearest>0)displayKeys[nearest]=selectedKey;
        displayKeys.sort((a,b)=>a-b);
    }
    tl=document.createElement('div');tl.id='sp-timeline';tl.className='sp-timeline';
    const bar=document.createElement('div');bar.className='sp-tl-bar';
    for(let i=0;i<displayKeys.length;i++){
        const k=displayKeys[i];
        const pct=displayKeys.length>1?8+((i/(displayKeys.length-1))*84):50;
        const wrap=document.createElement('div');wrap.className='sp-tl-node';
        wrap.style.left=pct+'%';
        const isSelected=k===selectedKey;
        const isLatest=k===latest;
        const dot=document.createElement('div');
        dot.className='sp-tl-dot'+(isLatest?' sp-tl-dot-latest':'')+(isSelected?' sp-tl-dot-selected':'');
        dot.style.position='relative';
        // Ring INSIDE dot -- inset centers it perfectly regardless of dot size
        if(isSelected){
            const ring=document.createElement('div');ring.className='sp-tl-ring';
            dot.appendChild(ring);
        }
        wrap.appendChild(dot);
        // Extract snapshot data
        const snap=all.snapshots[String(k)];
        let dateLabel='',tooltipParts=[];
        tooltipParts.push('Msg #'+k);
        if(snap){
            // Lightweight extraction -- skip full normalizeTracker for performance
            const _loc=snap.location||snap.Location||'';
            if(_loc)tooltipParts.push(_loc.split('>')[0].trim());
            const rawDate=snap.date||snap.Date||'';
            const rawTime=snap.time||snap.Time||'';
            // Attempt standard date parse (MM/DD/YYYY, DD/MM/YYYY, etc)
            const mo=[t('Jan'),t('Feb'),t('Mar'),t('Apr'),t('May'),t('Jun'),t('Jul'),t('Aug'),t('Sep'),t('Oct'),t('Nov'),t('Dec')];
            const dm=rawDate.match(/(\d{1,2})\D+(\d{1,2})/);
            const tm=rawTime.match(/(\d{1,2}):(\d{2})/);
            // Year: match any number >= 2 digits that could be a year (handles 2024, 3247, 42, etc)
            const ym=rawDate.match(/\b(\d{2,})\b/g);
            // Pick the longest number as year (avoid picking day/month)
            let year='';
            if(ym){
                const candidates=ym.filter(n=>n.length>=4||parseInt(n)>31);
                if(candidates.length)year=candidates[candidates.length-1];
            }
            let datePart='';
            if(dm){
                const mIdx=parseInt(dm[1])-1;
                const monthStr=(mIdx>=0&&mIdx<12)?mo[mIdx]:dm[1];
                datePart=monthStr+' '+dm[2];
                tooltipParts.push(datePart+(year?', '+year:''));
            } else if(rawDate.trim()){
                // Sci-fi / fictional date -- use raw text, trimmed
                datePart=rawDate.trim().substring(0,30);
                tooltipParts.push(datePart);
            }
            let timePart='';
            if(tm){
                const h=parseInt(tm[1]);const m=tm[2];
                timePart=String(h).padStart(2,'0')+':'+m;
                tooltipParts.push((h%12||12)+':'+m+' '+(h>=12?'PM':'AM'));
            }
            // Label format: "Dec 18, 2024 . 23:48"
            if(datePart||timePart){
                const lp=[];
                if(datePart)lp.push(datePart+(year?', '+year:''));
                if(timePart)lp.push(timePart);
                dateLabel=lp.join(' \u00B7 ');
            }
            if(!dateLabel)dateLabel='#'+k;
        } else {
            dateLabel='#'+k;
        }
        dot.title=tooltipParts.join(' \u00B7 ');
        const lbl=document.createElement('div');lbl.className='sp-tl-label'+(isSelected?' sp-tl-label-active':'');
        lbl.textContent='#'+k;
        wrap.appendChild(lbl);
        wrap.addEventListener('click',()=>{
            const snap=all.snapshots[String(k)];if(!snap)return;
            if(currentSnapshotMesIdx===k)return;
            set_isTimelineScrub(true);
            // Cancel any pending debounced update
            if(_tlScrubDebounce)clearTimeout(_tlScrubDebounce);
            if(_tlScrubRaf)cancelAnimationFrame(_tlScrubRaf);
            setCurrentSnapshotMesIdx(k);
            // Visually update selected dot immediately (cheap CSS toggle, no DOM rebuild)
            tl.querySelectorAll('.sp-tl-dot').forEach(d=>{d.classList.remove('sp-tl-dot-selected');d.querySelector('.sp-tl-ring')?.remove()});
            tl.querySelectorAll('.sp-tl-label').forEach(l=>l.classList.remove('sp-tl-label-active'));
            const myDot=wrap.querySelector('.sp-tl-dot');
            if(myDot){myDot.classList.add('sp-tl-dot-selected');const ring=document.createElement('div');ring.className='sp-tl-ring';myDot.appendChild(ring)}
            const myLabel=wrap.querySelector('.sp-tl-label');
            if(myLabel)myLabel.classList.add('sp-tl-label-active');
            // 200ms trailing-edge debounce — only last click in burst triggers expensive work
            set_tlScrubDebounce(setTimeout(()=>{
                const norm=normalizeTracker(snap);
                updatePanel(norm);
                if(!document.getElementById('sp-panel')?.classList.contains('sp-visible'))showPanel();
                // Clear scrub flag and rebuild timeline (updatePanel skips it during scrub)
                set_isTimelineScrub(false);
                renderTimeline();
            },200));
        });
        bar.appendChild(wrap);
    }
    tl.appendChild(bar);
    // "Browse All" button — opens full snapshot list
    if(sorted.length>1){
        const browseBtn=document.createElement('button');
        browseBtn.className='sp-tl-browse-btn';
        browseBtn.textContent=t('Browse All')+` (${sorted.length})`;
        browseBtn.addEventListener('click',()=>_showSnapshotBrowser(all,sorted));
        tl.appendChild(browseBtn);
    }
    if(selectedKey!==latest){
        const disc=document.createElement('div');disc.className='sp-tl-disclaimer';
        disc.innerHTML=`<span class="sp-tl-disc-icon">\u26A0</span> Viewing scene from an older message (msg #${selectedKey}) \u2014 not the current scene. <button class="sp-tl-disc-btn">${t('Jump to latest')}</button>`;
        disc.querySelector('.sp-tl-disc-btn').addEventListener('click',()=>{
            const latestSnap=all.snapshots[String(latest)];if(!latestSnap)return;
            if(currentSnapshotMesIdx===latest)return;
            set_isTimelineScrub(true);
            if(_tlScrubDebounce)clearTimeout(_tlScrubDebounce);
            setCurrentSnapshotMesIdx(latest);
            set_tlScrubDebounce(setTimeout(()=>{
                const _norm=normalizeTracker(latestSnap);
                updatePanel(_norm);
                if(!document.getElementById('sp-panel')?.classList.contains('sp-visible'))showPanel();
                set_isTimelineScrub(false);
                renderTimeline();
            },200));
        });
        tl.appendChild(disc);
    }
    body.appendChild(tl);
    log('\u23F1 renderTimeline:',((performance.now()-_tlStart)|0)+'ms','nodes:',displayKeys.length);
}

function _showSnapshotBrowser(all,sorted){
    document.querySelectorAll('.sp-browse-overlay').forEach(el=>el.remove());
    const overlay=document.createElement('div');overlay.className='sp-browse-overlay';
    let html=`<div class="sp-browse-container"><div class="sp-browse-header"><span class="sp-browse-title">${t('All Snapshots')} (${sorted.length})</span><button class="sp-browse-close">\u2715</button></div><div class="sp-browse-list">`;
    for(const k of sorted){
        const snap=all.snapshots[String(k)];if(!snap)continue;
        const time=snap.time||'';
        const loc=(snap.location||'').split('>')[0].trim();
        const topic=snap.sceneTopic||'';
        const tension=snap.sceneTension||'';
        const chars=(snap.characters||[]).length;
        const meta=snap._spMeta||{};
        const tokens=(meta.promptTokens||0)+(meta.completionTokens||0);
        const elapsed=meta.elapsed||0;
        const isSelected=k===currentSnapshotMesIdx;
        html+=`<div class="sp-browse-item${isSelected?' sp-browse-selected':''}" data-key="${k}">
            <span class="sp-browse-idx">#${k}</span>
            <span class="sp-browse-info">${time?time+' \u00B7 ':''}${loc||topic||'\u2014'}</span>
            <span class="sp-browse-meta">${tension?tension+' \u00B7 ':''}${chars} chars${tokens?' \u00B7 ~'+tokens+'t':''}</span>
        </div>`;
    }
    html+=`</div></div>`;
    overlay.innerHTML=html;
    // Click handlers
    overlay.querySelector('.sp-browse-close').addEventListener('click',()=>overlay.remove());
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
    overlay.querySelectorAll('.sp-browse-item').forEach(item=>{
        item.addEventListener('click',()=>{
            const k=Number(item.dataset.key);
            const snap=all.snapshots[String(k)];if(!snap)return;
            overlay.remove();
            setCurrentSnapshotMesIdx(k);
            const norm=normalizeTracker(snap);
            updatePanel(norm);
            if(!document.getElementById('sp-panel')?.classList.contains('sp-visible'))showPanel();
            renderTimeline();
        });
    });
    const escH=(e)=>{if(e.key==='Escape'){overlay.remove();document.removeEventListener('keydown',escH)}};
    document.addEventListener('keydown',escH);
    document.documentElement.appendChild(overlay);
}
