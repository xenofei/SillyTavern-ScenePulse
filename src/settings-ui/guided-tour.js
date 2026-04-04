// ScenePulse — Guided Tour Module
// Extracted from index.js lines 4719-4941

import { TOUR_EXAMPLE_DATA, MASCOT_SVG } from '../constants.js';
import { getSettings, saveSettings } from '../settings.js';
import { normalizeTracker } from '../normalize.js';
import { _cachedNormData, currentSnapshotMesIdx, setCurrentSnapshotMesIdx } from '../state.js';
import { updatePanel } from '../ui/update-panel.js';
import { showPanel } from '../ui/panel.js';
import { renderTimeline } from '../ui/timeline.js';
import { spDetectMode } from '../ui/mobile.js';
import { renderCustomPanelsMgr } from './custom-panels.js';

export function startGuidedTour(){
    const _s=(svg)=>`<svg viewBox="0 0 16 16" width="13" height="13" fill="none" style="vertical-align:-2px;display:inline">${svg}</svg>`;
    const _i={
        regen:_s('<path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 3v2.5h-2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>'),
        panels:_s('<rect x="1" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="9" y="2" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" opacity="0.6"/><rect x="1" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.15"/><rect x="9" y="8" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.1"/>'),
        toggle:_s('<rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.2"/>'),
        condense:_s('<rect x="2" y="2" width="12" height="2.5" rx="1" fill="currentColor" opacity="0.3"/><rect x="2" y="6" width="9" height="2" rx="0.8" fill="currentColor" opacity="0.2"/><rect x="2" y="9.5" width="11" height="2" rx="0.8" fill="currentColor" opacity="0.15"/><path d="M14 5.5L14 12" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.3"/>'),
        thoughts:_s('<path d="M2 9.5c0 1.5 1.5 3 4 3l2 2v-2c2.5 0 4-1.5 4-3V6c0-1.5-1.5-3-4-3H6C3.5 3 2 4.5 2 6v3.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" fill="currentColor" opacity="0.15"/><circle cx="5.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="8" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/><circle cx="10.5" cy="7.2" r="0.8" fill="currentColor" opacity="0.6"/>'),
        weather:_s('<path d="M4.5 11.5c-2 0-3.5-1.2-3.5-3 0-1.4 1-2.6 2.4-3C4 2.8 6.2 1 9 1c2.6 0 4.8 1.8 5 4 1.5.3 2.5 1.4 2.5 2.8 0 1.7-1.5 3-3.2 3H4.5z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'),
        time:_s('<circle cx="8" cy="8" r="3" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="1.5" x2="8" y2="3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="8" y1="12.5" x2="8" y2="14.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="1.5" y1="8" x2="3.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><line x1="12.5" y1="8" x2="14.5" y2="8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>'),
        transition:_s('<path d="M2 12V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" stroke="currentColor" stroke-width="1.1" fill="currentColor" opacity="0.08"/><path d="M5 8h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/><path d="M9.5 5.5L12 8l-2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'),
        edit:_s('<path d="M11.5 1.5l3 3-8.5 8.5H3v-3l8.5-8.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="9.5" y1="3.5" x2="12.5" y2="6.5" stroke="currentColor" stroke-width="0.8" opacity="0.4"/>'),
        star:_s('<polygon points="8,1 9.8,5.8 15,6.2 11,9.6 12.2,15 8,12 3.8,15 5,9.6 1,6.2 6.2,5.8" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1"/>'),
        main:_s('<path d="M3 14V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v11l-5-2.5L3 14z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.1"/>'),
        side:_s('<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.1"/><path d="M8 4v4.5l3 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'),
        tasks:_s('<path d="M3.5 8.5l2.5 2.5 6.5-6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1" opacity="0.3"/>'),
        heart:_s('<path d="M8 14s-5.5-3.5-5.5-7A3 3 0 0 1 8 5a3 3 0 0 1 5.5 2c0 3.5-5.5 7-5.5 7z" fill="#d46a7e" opacity="0.6"/>'),
        shield:_s('<path d="M8 1L2 4v4c0 3.5 2.5 5.5 6 7 3.5-1.5 6-3.5 6-7V4L8 1z" fill="#d4a55e" opacity="0.4" stroke="#d4a55e" stroke-width="0.8"/>'),
        flame:_s('<path d="M8 2c-1.5 2-4 4-4 7a4 4 0 0 0 8 0c0-3-2.5-5-4-7z" fill="#c44080" opacity="0.5"/>'),
        bolt:_s('<path d="M9 1L5 8h4l-2 7 6-8H9l2-6z" fill="#f59e0b" opacity="0.6"/>'),
        compat:_s('<circle cx="6" cy="8" r="4" stroke="#40a0c4" stroke-width="1" opacity="0.6"/><circle cx="10" cy="8" r="4" stroke="#40a0c4" stroke-width="1" opacity="0.6"/>'),
        snap:_s('<rect x="1" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.8"/><rect x="9" y="2" width="6" height="12" rx="1" stroke="currentColor" stroke-width="1.2" opacity="0.35"/><path d="M4.5 6.5L2.5 8l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>'),
        ghost:_s('<path d="M10 2C6.5 2 4 4.8 4 7.5v7c0 .4.2.7.5.5l1.5-1.2 1.5 1.2c.3.2.7.2 1 0L10 13.8l1.5 1.2c.3.2.7.2 1 0l1.5-1.2 1.5 1.2c.3.2.5-.1.5-.5v-7C16 4.8 13.5 2 10 2z" fill="currentColor" opacity="0.12" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><ellipse cx="7.8" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/><ellipse cx="12.2" cy="8" rx="1.3" ry="1.6" fill="currentColor" opacity="0.7"/>')
    };
    const _savedData=_cachedNormData?structuredClone(_cachedNormData):null;
    const _savedMesIdx=currentSnapshotMesIdx;
    const exData=normalizeTracker(structuredClone(TOUR_EXAMPLE_DATA));
    updatePanel(exData);showPanel();
    // Fake timeline
    const tl=document.getElementById('sp-timeline');
    if(tl){const bar=tl.querySelector('.sp-timeline-bar')||tl;bar.innerHTML='';for(let i=0;i<12;i++){const w=document.createElement('div');w.className='sp-tl-node-wrap';const d=document.createElement('div');d.className='sp-tl-dot'+(i===11?' sp-tl-dot-active':'');w.appendChild(d);if(i===11){const l=document.createElement('div');l.className='sp-tl-label';l.textContent='#26';w.appendChild(l)}bar.appendChild(w)}}
    function collapseAll(){document.querySelectorAll('#sp-panel-body .sp-section.sp-open').forEach(s=>s.classList.remove('sp-open'))}
    function openSection(key){
        const sec=document.querySelector(`[data-key="${key}"]`);
        if(!sec)return;sec.classList.add('sp-open');
        setTimeout(()=>{
            if(key==='relationships'||key==='characters')sec.querySelectorAll('.sp-rel-block,.sp-char-card').forEach(c=>c.classList.add('sp-card-open'));
            if(key==='quests'){sec.querySelectorAll('.sp-plot-tier').forEach(t=>t.classList.add('sp-tier-open'));sec.querySelectorAll('.sp-plot-entry').forEach(e=>e.classList.add('sp-card-open'))}
            if(key==='branches')sec.querySelectorAll('.sp-idea-card').forEach(c=>c.classList.add('sp-card-open'));
        },30);
    }
    function openPanelMgr(){
        let mgr=document.getElementById('sp-panel-mgr');
        if(!mgr){document.getElementById('sp-tb-panels')?.click();mgr=document.getElementById('sp-panel-mgr')}
        return mgr;
    }
    function closePanelMgr(){
        const mgr=document.getElementById('sp-panel-mgr');
        if(mgr)mgr.remove();
    }
    // Create a temp custom panel for the tour
    let _tourPanelCreated=false;
    function createTourPanel(){
        const s=getSettings();
        if(!s.customPanels)s.customPanels=[];
        s.customPanels.push({name:'RPG Stats (Tour Example)',fields:[
            {key:'health',label:'Health',type:'meter',desc:"{{user}}'s health 0-100"},
            {key:'mana',label:'Mana',type:'meter',desc:"Mana remaining after spellcasting"},
            {key:'reputation',label:'Reputation',type:'text',desc:"Standing with the local guild"}
        ]});
        _tourPanelCreated=true;
        saveSettings();
        // Re-render the custom panels section in the manager
        const cpList=document.getElementById('sp-panel-mgr-custom');
        const body=document.getElementById('sp-panel-body');
        if(cpList&&body)renderCustomPanelsMgr(s,cpList,body);
    }
    function removeTourPanel(){
        if(!_tourPanelCreated)return;
        const s=getSettings();
        const idx=(s.customPanels||[]).findIndex(p=>p.name==='RPG Stats (Tour Example)');
        if(idx>=0){s.customPanels.splice(idx,1);saveSettings()}
        _tourPanelCreated=false;
    }
    let _ghostWasOn=false;
    const _isMobile=spDetectMode()==='mobile';
    let steps=[
        {title:'Welcome to ScenePulse',desc:'ScenePulse is your AI-powered <strong>scene intelligence dashboard</strong>. It tracks characters, relationships, quests, and story state \u2014 all extracted automatically from AI responses.<br><br>This tour loads <strong>example data</strong> so you can see every feature.',sel:'.sp-toolbar',pos:'below'},
        {title:'The Dashboard',desc:'Environment data \u2014 time, date, location, weather, temperature. Updates every message.<br><br>Toggle '+_i.edit+' edit mode to click and modify values manually.',sel:'.sp-env-permanent',pos:'below'},
        {title:'Toolbar Controls',desc:_isMobile
            ?'Left to right:<br><br>'+_i.regen+' <strong>Refresh</strong> \u2014 regenerate tracker<br>'+_i.panels+' <strong>Manager</strong> \u2014 toggle panels & fields<br>'+_i.toggle+' <strong>Expand/Collapse</strong> \u2014 all sections<br>'+_i.transition+' <strong>Transitions</strong> \u2014 scene change alerts<br>'+_i.edit+' <strong>Edit</strong> \u2014 manual value editing'
            :'Left to right:<br><br>'+_i.regen+' <strong>Refresh</strong> \u2014 regenerate tracker<br>'+_i.panels+' <strong>Manager</strong> \u2014 toggle panels & fields<br>'+_i.toggle+' <strong>Expand/Collapse</strong> \u2014 all sections<br>'+_i.condense+' <strong>Condense</strong> \u2014 compact layout<br>'+_i.thoughts+' <strong>Thoughts</strong> \u2014 inner thoughts panel<br>'+_i.weather+' <strong>Weather</strong> \u2014 rain/snow overlay<br>'+_i.time+' <strong>Ambience</strong> \u2014 time-of-day tint<br>'+_i.transition+' <strong>Transitions</strong> \u2014 scene change alerts<br>'+_i.edit+' <strong>Edit</strong> \u2014 manual value editing',sel:'.sp-toolbar',pos:'below'},
        {title:'Scene Details',desc:'Tracks <strong>mood, tension, topic, interaction, and sounds</strong>. Tension is uppercase (CALM \u2192 CRITICAL). Header badge = current mood.',sel:'[data-key="scene"]',pos:'below',open:'scene'},
        {title:'Quest Journal',desc:_i.star+' <strong>North Star</strong> \u2014 life purpose<br>'+_i.main+' <strong>Main Quests</strong> \u2014 critical goals<br>'+_i.side+' <strong>Side Quests</strong> \u2014 optional enrichment<br>'+_i.tasks+' <strong>Active Tasks</strong> \u2014 immediate to-dos<br><br>Tiers and quests collapse independently.',sel:'[data-key="quests"]',pos:_isMobile?'below':'left',open:'quests'},
        {title:'Relationships',desc:_i.heart+' <strong>Affection</strong><br>'+_i.shield+' <strong>Trust</strong><br>'+_i.flame+' <strong>Desire</strong><br>'+_i.bolt+' <strong>Stress</strong> (neutral)<br>'+_i.compat+' <strong>Compatibility</strong><br><br>Deltas (\u25B2/\u25BC) with unique icons. White bar marker = previous value.',sel:'[data-key="relationships"]',pos:_isMobile?'below':'left',open:'relationships'},
        {title:'Characters',desc:'Profiles: <strong>appearance, outfit, inventory, goals</strong>. Role badges match relationship style. First expanded, others collapse.',sel:'[data-key="characters"]',pos:_isMobile?'below':'left',open:'characters'},
        {title:'Story Ideas',desc:'5 AI-generated plot directions per update. Click to expand. <strong>\uD83D\uDCCB Paste</strong> to edit, <strong>\u25B6 Inject</strong> to send immediately.',sel:'[data-key="branches"]',pos:_isMobile?'below':'left',open:'branches'},
    ];
    // Desktop-only steps
    if(!_isMobile){
        steps.push(
            {title:'Inner Thoughts',desc:'Floating panel with each character\u2019s <strong>literal inner monologue</strong>. Drag to reposition. Resize from the corner.',sel:'#sp-thought-panel',pos:'right',
                before:()=>{const tp=document.getElementById('sp-thought-panel');if(tp){_ghostWasOn=tp.classList.contains('sp-tp-ghost');tp.classList.remove('sp-tp-ghost')}}},
            {title:'Thoughts Controls',desc:_i.snap+' <strong>Snap Left</strong> \u2014 dock to chat edge<br>'+_i.ghost+' <strong>Ghost Mode</strong> \u2014 transparent frame<br>'+_i.regen+' <strong>Regenerate</strong> \u2014 refresh thoughts<br><strong>\u2715 Close</strong> \u2014 hide panel<br><br>All toggleable \u2014 click to switch on/off.',sel:'#sp-thought-panel .sp-tp-header',pos:'below',
                after:()=>{if(_ghostWasOn){const tp=document.getElementById('sp-thought-panel');if(tp)tp.classList.add('sp-tp-ghost')}}}
        );
    }
    steps.push(
        {title:'Timeline Scrubber',desc:'Every AI message creates a <strong>snapshot</strong>. The timeline bar at the bottom shows all snapshots as dots. Click any dot to load that moment. The green dot marks the current message.<br><br>Scrub through history and compare how relationships, quests, and characters evolved.',center:true},
        {title:'Panel Manager',desc:'Toggle <strong>built-in panels</strong> on/off with checkboxes. Disabled panels are excluded from the AI prompt \u2014 saving tokens.<br><br>Sub-fields within each panel can also be toggled individually.',sel:'#sp-panel-mgr',pos:_isMobile?'below':'left',
            before:()=>{openPanelMgr()},after:()=>{closePanelMgr()}},
        {title:'Custom Panels',desc:'Create panels to track <strong>anything</strong> \u2014 health, mana, reputation, faction standings.<br><br>Each field gets a <strong>key</strong>, <strong>label</strong>, <strong>type</strong> (text/number/meter/list/enum), and an <strong>LLM hint</strong> telling the AI what to output.',sel:'#sp-panel-mgr-custom',pos:_isMobile?'below':'left',
            before:()=>{
                openPanelMgr();
                createTourPanel();
                setTimeout(()=>{const el=document.getElementById('sp-panel-mgr-custom');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'})},150);
            },
            after:()=>{removeTourPanel();closePanelMgr()}},
        {title:'\u26A0 Performance Tip',desc:'More panels = more tokens = <strong>longer generation times</strong>.<br><br>If responses feel slow, try:<br>\u2022 Disable panels you don\u2019t need (Characters, Story Ideas are heaviest)<br>\u2022 Reduce custom panel fields<br>\u2022 Lower context messages in Separate mode',sel:'#sp-panel-mgr',pos:_isMobile?'below':'left',warn:true,
            before:()=>{openPanelMgr()},after:()=>{closePanelMgr()}},
        {title:'Feedback & Issues',desc:'Found a bug? Have a suggestion?<br><br>Visit the GitHub page to report issues or share ideas:<br><br><a href="https://github.com/xenofei" target="_blank" rel="noopener" style="color:var(--sp-accent);text-decoration:underline;font-weight:600">github.com/xenofei</a><br><br>Your feedback helps make ScenePulse better for everyone.',center:true},
        {title:'Thank You!',desc:'<div style="text-align:center"><span class="sp-tour-finale-pulse">'+MASCOT_SVG+'</span></div><div class="sp-tour-finale-glow">Every scene has a pulse. Now you can feel it.</div><br>Thank you for trying <strong>ScenePulse</strong>. I built this to make every moment in your story feel alive \u2014 tracked, remembered, meaningful.<br><br>Your story matters. Go make it unforgettable.',center:true}
    );
    let step=0;let _prevAfter=null;
    const spotlight=document.createElement('div');spotlight.className='sp-tour-spotlight';
    const card=document.createElement('div');card.className='sp-tour-card';
    document.body.appendChild(spotlight);document.body.appendChild(card);
    function renderStep(){
        if(_prevAfter){_prevAfter();_prevAfter=null}
        const s=steps[step];
        if(s.before)s.before();
        if(s.after)_prevAfter=s.after;
        collapseAll();
        if(s.open)openSection(s.open);
        card.className='sp-tour-card'+(s.warn?' sp-tour-warn':'');
        const isLast=step===steps.length-1;const isFirst=step===0;
        let pips='';for(let i=0;i<steps.length;i++)pips+=`<span class="sp-tour-pip${i===step?' sp-active':''}"></span>`;
        card.innerHTML=`<div class="sp-tour-step-label">Step ${step+1} of ${steps.length}</div><div class="sp-tour-title">${s.title}</div><div class="sp-tour-desc">${s.desc}</div><div class="sp-tour-nav">${isFirst?'':'<button class="sp-tour-btn" data-prev>\u2190 Back</button>'}<button class="sp-tour-btn sp-tour-btn-end" data-end>Skip</button><div class="sp-tour-progress">${pips}</div>${isLast?'<button class="sp-tour-btn sp-tour-btn-next" data-done>\u2713 Finish</button>':'<button class="sp-tour-btn sp-tour-btn-next" data-next>Next \u2192</button>'}</div>`;
        // Delay positioning to allow DOM updates (panel mgr open, scroll, etc.)
        if(s.center){
            // No spotlight, center card on screen
            spotlight.style.display='none';
            setTimeout(()=>{
                const cw=_isMobile?Math.min(340,window.innerWidth-16):340;
                const ch=card.offsetHeight||250;
                card.style.left=Math.max(8,(window.innerWidth-cw)/2)+'px';
                card.style.top=Math.max(8,(window.innerHeight-ch)/2)+'px';
                if(_isMobile)card.style.width=cw+'px';
            },100);
        } else {
        setTimeout(()=>{
            const el=s.sel?document.querySelector(s.sel):null;
            if(el){
                el.scrollIntoView({behavior:'smooth',block:'nearest'});
                setTimeout(()=>{
                    const r=el.getBoundingClientRect();const pad=8;
                    spotlight.style.left=(r.left-pad)+'px';spotlight.style.top=(r.top-pad)+'px';
                    spotlight.style.width=(r.width+pad*2)+'px';spotlight.style.height=(r.height+pad*2)+'px';
                    spotlight.style.display='block';
                    const cw=_isMobile?Math.min(320,window.innerWidth-16):340;
                    const ch=card.offsetHeight||250;
                    if(_isMobile){
                        // Mobile: card always below spotlight, centered
                        const cy=Math.min(r.bottom+12,window.innerHeight-ch-8);
                        card.style.left=Math.max(8,(window.innerWidth-cw)/2)+'px';
                        card.style.top=Math.max(8,cy)+'px';
                        card.style.width=cw+'px';
                    } else {
                    const spB=window.innerHeight-r.bottom,spA=r.top,spR=window.innerWidth-r.right,spL=r.left;
                    let cx,cy;
                    if(s.pos==='left'&&spL>cw+20){cx=r.left-cw-14;cy=Math.max(8,r.top)}
                    else if(s.pos==='right'&&spR>cw+20){cx=r.right+14;cy=Math.max(8,r.top)}
                    else if(s.pos==='above'&&spA>ch+20){cx=Math.max(8,Math.min(r.left,window.innerWidth-cw-8));cy=r.top-ch-14}
                    else if(spB>ch+20){cx=Math.max(8,Math.min(r.left,window.innerWidth-cw-8));cy=r.bottom+14}
                    else if(spA>ch+20){cx=Math.max(8,Math.min(r.left,window.innerWidth-cw-8));cy=r.top-ch-14}
                    else if(spL>cw+20){cx=r.left-cw-14;cy=Math.max(8,r.top)}
                    else if(spR>cw+20){cx=r.right+14;cy=Math.max(8,r.top)}
                    else{cx=Math.max(8,window.innerWidth-cw-8);cy=8}
                    if(cy+ch>window.innerHeight-8)cy=window.innerHeight-ch-8;
                    if(cy<8)cy=8;if(cx<8)cx=8;
                    card.style.left=cx+'px';card.style.top=cy+'px';
                    }
                },250);
            } else spotlight.style.display='none';
        },200);
        }
    }
    function cleanup(){
        if(_prevAfter){_prevAfter();_prevAfter=null}
        removeTourPanel();closePanelMgr();spotlight.remove();card.remove();collapseAll();
        if(_savedData){setCurrentSnapshotMesIdx(_savedMesIdx);updatePanel(_savedData)} else {
            const body=document.getElementById('sp-panel-body');
            if(body)body.innerHTML='<div class="sp-empty-state"><div class="sp-empty-icon">\u2726</div><div class="sp-empty-title">Ready to Go</div><div class="sp-empty-text">Send your first message to start tracking.</div></div>';
        }
        renderTimeline();
    }
    card.addEventListener('click',(e)=>{
        if(e.target.closest('[data-next]')){step++;renderStep()}
        else if(e.target.closest('[data-prev]')){step--;renderStep()}
        else if(e.target.closest('[data-done]')||e.target.closest('[data-end]'))cleanup();
    });
    renderStep();
}
