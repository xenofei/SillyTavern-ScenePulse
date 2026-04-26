// ScenePulse — Setup Guide Module
// Extracted from index.js lines 4588-4717

import { MASCOT_SVG } from '../constants.js';
import { getSettings, saveSettings, getConnectionProfiles, getChatPresets } from '../settings.js';
import { esc } from '../utils.js';
import { spDetectMode } from '../ui/mobile.js';
import { loadUI } from './bind-ui.js';
import { _spSaveLS } from './bind-ui.js';
import { startGuidedTour } from './guided-tour.js';

export function showSetupGuide(){
    // Remove any existing guide
    document.getElementById('sp-setup-overlay')?.remove();
    const s=getSettings();
    const profiles=getConnectionProfiles();
    const presets=getChatPresets();
    const hasProfiles=profiles.length>0;
    const hasFallbackProfile=!!s.fallbackProfile;

    const _setupMobile=spDetectMode()==='mobile';
    const ov=document.createElement('div');ov.id='sp-setup-overlay';ov.className='sp-setup-overlay';
    ov.innerHTML=`
    <div class="sp-setup-dialog">
        <div class="sp-setup-header">
            <div class="sp-setup-icon">${MASCOT_SVG}</div>
            <div class="sp-setup-title">Scene<span style="color:var(--sp-accent)">Pulse</span> Setup</div>
            <button class="sp-setup-close" title="Close">✕</button>
        </div>
        <div class="sp-setup-body" id="sp-setup-body">
            <div class="sp-setup-step sp-setup-active" data-step="1">
                <div class="sp-setup-step-num">1</div>
                <div class="sp-setup-step-content">
                    <div class="sp-setup-step-title">How ScenePulse Works</div>
                    <p>ScenePulse uses <strong>Together mode</strong> by default — it instructs the AI to append scene tracking data (JSON) at the end of every response. This is fast, cheap, and accurate.</p>
                    <p>However, some models occasionally skip the tracker payload. When this happens, ScenePulse can <strong>automatically fall back</strong> to a separate API call to generate the tracker data.</p>
                    ${_setupMobile?'<p style="color:var(--sp-text-dim);font-size:12px"><em>Note: On mobile, some desktop features (weather overlay, time-of-day tint, inner thoughts panel, condense view) are hidden to optimize the experience. They\'ll be available when you switch to desktop.</em></p>':''}
                    <p>This guide helps you configure the fallback so you never lose scene data.</p>
                    <div class="sp-setup-compat">
                        <div class="sp-setup-compat-title">Model Compatibility (April 2026)</div>
                        <div class="sp-setup-compat-tier"><span style="color:var(--sp-green)">Recommended:</span> Claude Opus 4.6 / Sonnet 4.6, GPT-5.4, Gemini 3.1 Pro / 3 Flash, Grok 4, GLM-5.1</div>
                        <div class="sp-setup-compat-tier"><span style="color:var(--sp-amber)">Compatible:</span> DeepSeek V3.2, Mistral Large 3, Qwen 3 32B+, Llama 4 Maverick/Scout, Gemini 3.1 Flash-Lite, GPT-4.1 mini</div>
                        <div class="sp-setup-compat-tier"><span style="color:var(--sp-red)">Not recommended:</span> Models under 14B parameters, heavily quantized (Q3/Q2)</div>
                        <div class="sp-setup-compat-note">Local models: GLM-5.1 (MIT), Qwen 3 32B, DeepSeek V3.2, Mistral Large 3 are top picks. Use Q5_K_M+ quantization. Consider Separate mode for models under 32B.</div>
                    </div>
                    <div class="sp-setup-nav"><button class="sp-setup-btn sp-setup-btn-primary" data-goto="2">Next →</button><button class="sp-setup-btn sp-setup-btn-skip" data-dismiss="true">Skip setup</button></div>
                </div>
            </div>
            <div class="sp-setup-step" data-step="2">
                <div class="sp-setup-step-num">2</div>
                <div class="sp-setup-step-content">
                    <div class="sp-setup-step-title">Create a Connection Profile</div>
                    <p>The fallback uses a <strong>Connection Profile</strong> in SillyTavern to make a dedicated API call. If you already have profiles set up, you can use one of those.</p>
                    <p>To create a new one:</p>
                    <div class="sp-setup-instructions">
                        <div class="sp-setup-inst">1. Open SillyTavern's <strong>API Connections</strong> panel (top-left plug icon)</div>
                        <div class="sp-setup-inst">2. Configure your API provider and model</div>
                        <div class="sp-setup-inst">3. Click the <strong>connection profile</strong> dropdown → <strong>Create New</strong></div>
                        <div class="sp-setup-inst">4. Name it something like <em>"ScenePulse Tracker"</em></div>
                        <div class="sp-setup-inst">5. Save the profile</div>
                    </div>
                    ${hasProfiles?'<p style="color:var(--sp-green)">✓ You have <strong>'+profiles.length+'</strong> connection profile'+(profiles.length>1?'s':'')+'  available.</p>':'<p style="color:var(--sp-amber)">⚠ No connection profiles found. Create one in SillyTavern first, then click Refresh below.</p>'}
                    <div class="sp-setup-nav"><button class="sp-setup-btn" data-goto="1">← Back</button><button class="sp-setup-btn sp-setup-btn-primary" data-goto="3">Next →</button></div>
                </div>
            </div>
            <div class="sp-setup-step" data-step="3">
                <div class="sp-setup-step-num">3</div>
                <div class="sp-setup-step-content">
                    <div class="sp-setup-step-title">Select Your Fallback Profile</div>
                    <p>Choose which connection profile ScenePulse should use when the AI omits tracker data:</p>
                    <div class="sp-setup-select-wrap">
                        <select id="sp-setup-fb-profile" class="sp-setup-select">
                            <option value="">(Same as current — no dedicated profile)</option>
                            ${profiles.map(p=>`<option value="${esc(p.id)}"${p.id===s.fallbackProfile?' selected':''}>${esc(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <p>Optionally pick a different preset for tracker generation. <strong>(Same as current)</strong> uses your active preset unchanged — recommended unless you have a JSON-tuned preset saved.</p>
                    <div class="sp-setup-select-wrap">
                        <select id="sp-setup-fb-preset" class="sp-setup-select">
                            <option value="">(Same as current)</option>
                            ${presets.map(p=>`<option value="${esc(p.id)}"${p.id===s.fallbackPreset?' selected':''}>${esc(p.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="sp-setup-note">Picking a different preset will visibly switch SillyTavern's preset dropdown during tracker generation, then restore. Pick "(Same as current)" to avoid the switch.</div>
                    <div class="sp-setup-nav"><button class="sp-setup-btn" data-goto="2">← Back</button><button class="sp-setup-btn sp-setup-btn-primary" data-goto="4">Next →</button></div>
                </div>
            </div>
            <div class="sp-setup-step" data-step="4">
                <div class="sp-setup-step-num">4</div>
                <div class="sp-setup-step-content">
                    <div class="sp-setup-step-title">Fallback Preference</div>
                    <p>When the AI skips the tracker, should ScenePulse automatically run a separate API call?</p>
                    <label class="sp-setup-radio"><input type="radio" name="sp-setup-fb-enable" value="yes" ${s.fallbackEnabled!==false?'checked':''}> <strong>Yes</strong> — automatically recover missing tracker data <span style="color:var(--sp-text-dim)">(recommended)</span></label>
                    <label class="sp-setup-radio"><input type="radio" name="sp-setup-fb-enable" value="no" ${s.fallbackEnabled===false?'checked':''}> <strong>No</strong> — skip it, I'll regenerate manually if needed</label>
                    <div class="sp-setup-note" id="sp-setup-no-warn" style="display:${s.fallbackEnabled===false?'block':'none'};color:var(--sp-amber)">With fallback disabled, you may occasionally see empty scene data when the AI omits the tracker. Use the ⟳ button in the panel to regenerate manually.</div>
                    <div class="sp-setup-nav"><button class="sp-setup-btn" data-goto="3">← Back</button><button class="sp-setup-btn sp-setup-btn-primary" data-goto="5">Next →</button></div>
                </div>
            </div>
            <div class="sp-setup-step" data-step="5">
                <div class="sp-setup-step-num">5</div>
                <div class="sp-setup-step-content">
                    <div class="sp-setup-step-title">OpenRouter Stats Connector <span style="color:var(--sp-text-dim);font-size:11px;font-weight:normal">(optional)</span></div>
                    <p>The preset browser shows OpenRouter pricing, context window, and roleplay popularity on each preset card. Pricing changes between releases — would you like ScenePulse to refresh the live pricing/context data from OpenRouter's public API when you open the preset browser?</p>
                    <label class="sp-setup-radio"><input type="radio" name="sp-setup-or-enable" value="yes" ${s.orConnectorEnabled?'checked':''}> <strong>Yes</strong> — auto-refresh pricing/context once per session <span style="color:var(--sp-text-dim)">(~30 KB, cached 24h)</span></label>
                    <label class="sp-setup-radio"><input type="radio" name="sp-setup-or-enable" value="no" ${!s.orConnectorEnabled?'checked':''}> <strong>No</strong> — use the static baseline only <span style="color:var(--sp-text-dim)">(default)</span></label>
                    <div class="sp-setup-note" style="margin-top:6px;color:var(--sp-text-dim)">Public endpoint (<code>openrouter.ai/api/v1/models</code>). No auth, no telemetry. Popularity rankings stay static either way. You can change this later under Settings → Generation.</div>
                    <div class="sp-setup-tips">
                        <div class="sp-setup-tips-title">Tips & Hidden Features</div>
                        <div class="sp-setup-tip">Type <strong>/sp help</strong> for all slash commands (/sp regen, /sp refresh, /sp export, /sp debug)</div>
                        <div class="sp-setup-tip">Click the <strong>book icon</strong> in the toolbar to browse the <strong>Character Wiki</strong> — every character who ever appeared</div>
                        <div class="sp-setup-tip">Click the <strong>pencil icon</strong> to enable <strong>Edit mode</strong> — click any field to manually correct it</div>
                        <div class="sp-setup-tip">Open the <strong>Character Wiki</strong> (book icon) and click the <strong>web graph button</strong> to see the <strong>Relationship Web</strong> — force-directed NPC graph</div>
                        <div class="sp-setup-tip">Use <strong>Custom Panels</strong> (Panel Manager → +) to track anything: health, mana, reputation, inventory</div>
                    </div>
                    <div class="sp-setup-nav"><button class="sp-setup-btn" data-goto="4">← Back</button><button class="sp-setup-btn sp-setup-btn-primary sp-setup-btn-finish" data-finish="true">✓ Finish Setup</button></div>
                    <div style="text-align:center;margin-top:8px"><button class="sp-setup-btn sp-setup-btn-tour" data-tour="true">✦ Take a Guided Tour</button></div>
                </div>
            </div>
        </div>
        <div class="sp-setup-progress">
            <div class="sp-setup-dots"><span class="sp-setup-dot sp-dot-active" data-dot="1"></span><span class="sp-setup-dot" data-dot="2"></span><span class="sp-setup-dot" data-dot="3"></span><span class="sp-setup-dot" data-dot="4"></span><span class="sp-setup-dot" data-dot="5"></span></div>
        </div>
    </div>`;
    document.body.appendChild(ov);

    // Navigation
    let currentStep=1;
    function goToStep(n){
        currentStep=n;
        ov.querySelectorAll('.sp-setup-step').forEach(s=>{s.classList.toggle('sp-setup-active',+s.dataset.step===n)});
        ov.querySelectorAll('.sp-setup-dot').forEach(d=>{d.classList.toggle('sp-dot-active',+d.dataset.dot===n)});
    }
    ov.addEventListener('click',(e)=>{
        const btn=e.target.closest('[data-goto]');
        if(btn)goToStep(+btn.dataset.goto);
        if(e.target.closest('.sp-setup-close')||e.target.closest('[data-dismiss]')){
            s.setupDismissed=true;saveSettings();ov.remove();
        }
        if(e.target.closest('[data-finish]')){
            // Save selections
            const prof=ov.querySelector('#sp-setup-fb-profile')?.value||'';
            const pre=ov.querySelector('#sp-setup-fb-preset')?.value||'';
            const enabled=ov.querySelector('input[name="sp-setup-fb-enable"]:checked')?.value!=='no';
            // v6.27.0: OR connector opt-in choice from step 5
            const orEnabled=ov.querySelector('input[name="sp-setup-or-enable"]:checked')?.value==='yes';
            s.fallbackProfile=prof;s.fallbackPreset=pre;s.fallbackEnabled=enabled;s.setupDismissed=true;
            s.orConnectorEnabled=orEnabled;s._spOrConnectorPromptShown=true;
            saveSettings();_spSaveLS();loadUI();
            ov.remove();
            if(enabled&&prof)toastr.success('Fallback configured with profile: '+prof,'ScenePulse Setup');
            else if(enabled)toastr.info('Fallback enabled (using current profile)','ScenePulse Setup');
            else toastr.info('Fallback disabled — use ⟳ for manual recovery','ScenePulse Setup');
        }
        const dot=e.target.closest('.sp-setup-dot');
        if(dot)goToStep(+dot.dataset.dot);
        if(e.target.closest('[data-tour]')){
            const prof=ov.querySelector('#sp-setup-fb-profile')?.value||'';
            const pre=ov.querySelector('#sp-setup-fb-preset')?.value||'';
            const enabled=ov.querySelector('input[name="sp-setup-fb-enable"]:checked')?.value!=='no';
            const orEnabled=ov.querySelector('input[name="sp-setup-or-enable"]:checked')?.value==='yes';
            s.fallbackProfile=prof;s.fallbackPreset=pre;s.fallbackEnabled=enabled;s.setupDismissed=true;
            s.orConnectorEnabled=orEnabled;s._spOrConnectorPromptShown=true;
            saveSettings();_spSaveLS();loadUI();ov.remove();
            startGuidedTour();
        }
    });
    // Radio toggle for warning
    ov.querySelectorAll('input[name="sp-setup-fb-enable"]').forEach(r=>r.addEventListener('change',()=>{
        ov.querySelector('#sp-setup-no-warn').style.display=r.value==='no'?'block':'none';
    }));
}
