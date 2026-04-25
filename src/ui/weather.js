// src/ui/weather.js — Weather Overlay System
import { log } from '../logger.js';
import { currentWeatherType, setCurrentWeatherType } from '../state.js';
import { getSettings } from '../settings.js';
import { spDetectMode } from './mobile.js';

export function updateWeatherOverlay(weatherStr){
    const s=getSettings();
    // v6.12.9 (issue #14): when the user disables weather (or turns on
    // reduceVisualEffects), tear down any existing overlay instead of
    // just early-returning. The old early-return left a stale full-screen
    // overlay with backdrop-filter blur + animated particles attached
    // to the DOM, eating GPU even though the user thought it was off.
    if(s.weatherOverlay===false||s.reduceVisualEffects===true){clearWeatherOverlay();return}
    const mode=spDetectMode();if(mode==='mobile'||mode==='tablet'){clearWeatherOverlay();return}
    const wxLow=(weatherStr||'').toLowerCase();
    // Determine weather types -- multiple can be active simultaneously
    let wxTypes=[];
    if(wxLow.includes('snow')||wxLow.includes('blizzard')||wxLow.includes('sleet')||wxLow.includes('ice')||wxLow.includes('frost'))wxTypes.push('snow');
    if(wxLow.includes('hail')||wxLow.includes('ice storm')||wxLow.includes('ice pellet'))wxTypes.push('hail');
    if(wxLow.includes('sand')||wxLow.includes('dust'))wxTypes.push('sandstorm');
    if(wxLow.includes('ash')||wxLow.includes('volcanic')||wxLow.includes('eruption')||wxLow.includes('cinder')||wxLow.includes('soot'))wxTypes.push('ash');
    if(wxLow.includes('thunder')||wxLow.includes('lightning'))wxTypes.push('storm');
    else if(wxLow.includes('storm')&&!wxLow.includes('sand')&&!wxLow.includes('ice storm'))wxTypes.push('storm');
    if(wxLow.includes('rain')||wxLow.includes('drizzle')||wxLow.includes('shower')||wxLow.includes('downpour'))wxTypes.push('rain');
    if(wxLow.includes('fog')||wxLow.includes('mist')||wxLow.includes('haze'))wxTypes.push('fog');
    if(wxLow.includes('wind')||wxLow.includes('breez')||wxLow.includes('gust'))wxTypes.push('wind');
    if(wxLow.includes('aurora')||wxLow.includes('northern light'))wxTypes.push('aurora');
    // Primary type for SVG icon selection
    const wxType=wxTypes.length?wxTypes[0]:'clear';
    const wxKey=wxTypes.sort().join('+');
    // Skip rebuild if same combination
    if(wxKey===currentWeatherType)return;
    setCurrentWeatherType(wxKey);
    // Get or create overlay
    let ov=document.getElementById('sp-weather-overlay');
    if(!ov){
        ov=document.createElement('div');ov.id='sp-weather-overlay';
        // Insert at start of body so it's behind everything
        document.body.insertBefore(ov,document.body.firstChild);
    }
    ov.innerHTML='';ov.className='sp-wx-ov '+wxTypes.map(t=>'sp-wx-ov-'+t).join(' ');
    // Build particles based on type
    const frag=document.createDocumentFragment();
    const rnd=(min,max)=>Math.random()*(max-min)+min;
    const mkDiv=(cls,styles)=>{const d=document.createElement('div');d.className=cls;Object.assign(d.style,styles);return d};

    // Generate particles for ALL active weather types
    for(const _wt of wxTypes){
    if(_wt==='rain'){
        // Dense rain with varied thickness + mist layer
        for(let i=0;i<90;i++){
            const heavy=i<20;
            const d=mkDiv(heavy?'sp-wx-drop sp-wx-drop-heavy':'sp-wx-drop',{
                left:rnd(0,100)+'%',
                animationDuration:rnd(heavy?0.3:0.4, heavy?0.6:0.9)+'s',
                animationDelay:rnd(0,3)+'s',
                opacity:String(rnd(heavy?0.25:0.1, heavy?0.55:0.4)),
                height:rnd(heavy?18:10, heavy?35:26)+'px',
                '--wx-drift':rnd(-8,8)+'px'
            });
            frag.appendChild(d);
        }
        // Ground mist from splashes
        for(let i=0;i<4;i++){
            const d=mkDiv('sp-wx-rain-mist',{
                left:rnd(-10,80)+'%',
                animationDuration:rnd(12,20)+'s',
                animationDelay:rnd(0,8)+'s',
                opacity:String(rnd(0.03,0.08))
            });
            frag.appendChild(d);
        }
    } else if(_wt==='snow'){
        // Dense snowfall with varied sizes + ground glow
        for(let i=0;i<80;i++){
            const sz=rnd(1.5,7);
            const bright=sz>4.5;
            const d=mkDiv('sp-wx-flake'+(bright?' sp-wx-flake-bright':''),{
                left:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(4,16)+'s',
                animationDelay:rnd(0,10)+'s',
                opacity:String(rnd(0.15,bright?0.85:0.6)),
                '--wx-drift':rnd(-100,100)+'px',
                '--wx-drift2':rnd(-60,60)+'px'
            });
            frag.appendChild(d);
        }
        // Ground snow glow
        const glow=mkDiv('sp-wx-snow-glow',{});frag.appendChild(glow);
    } else if(_wt==='hail'){
        // Rain + bouncing ice chunks
        for(let i=0;i<50;i++){
            const d=mkDiv('sp-wx-drop',{
                left:rnd(0,100)+'%',
                animationDuration:rnd(0.35,0.7)+'s',
                animationDelay:rnd(0,2)+'s',
                opacity:String(rnd(0.12,0.35)),
                height:rnd(10,22)+'px',
                '--wx-drift':rnd(-6,6)+'px'
            });
            frag.appendChild(d);
        }
        for(let i=0;i<30;i++){
            const sz=rnd(5,11);
            const d=mkDiv('sp-wx-hail',{
                left:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(0.5,0.9)+'s',
                animationDelay:rnd(0,3)+'s',
                opacity:String(rnd(0.45,0.85))
            });
            frag.appendChild(d);
        }
    } else if(_wt==='storm'){
        // Very heavy rain + wind-driven angle
        for(let i=0;i<100;i++){
            const d=mkDiv('sp-wx-drop sp-wx-drop-heavy',{
                left:rnd(-5,105)+'%',
                animationDuration:rnd(0.2,0.55)+'s',
                animationDelay:rnd(0,2)+'s',
                opacity:String(rnd(0.2,0.55)),
                height:rnd(18,40)+'px',
                '--wx-drift':rnd(-15,15)+'px'
            });
            frag.appendChild(d);
        }
        // Lightning flash layers -- more frequent
        for(let i=0;i<5;i++){
            const d=mkDiv('sp-wx-lightning',{
                animationDelay:rnd(1,6)+'s',
                animationDuration:rnd(4,9)+'s'
            });
            frag.appendChild(d);
        }
        // Wind streaks during storm
        for(let i=0;i<15;i++){
            const d=mkDiv('sp-wx-wind-streak',{
                top:rnd(0,100)+'%',
                animationDuration:rnd(0.4,1.2)+'s',
                animationDelay:rnd(0,3)+'s',
                opacity:String(rnd(0.06,0.14)),
                width:rnd(60,160)+'px'
            });
            frag.appendChild(d);
        }
        // Dark rumble overlay
        const rumble=mkDiv('sp-wx-rumble',{});frag.appendChild(rumble);
    } else if(_wt==='fog'){
        // Dense multi-layer fog
        for(let i=0;i<10;i++){
            const d=mkDiv('sp-wx-fog-layer',{
                top:rnd(0,90)+'%',
                animationDuration:rnd(15,35)+'s',
                animationDelay:rnd(0,12)+'s',
                opacity:String(rnd(0.06,0.2)),
                height:rnd(18,40)+'%'
            });
            frag.appendChild(d);
        }
        // Ground fog -- thick at bottom
        for(let i=0;i<3;i++){
            const d=mkDiv('sp-wx-fog-ground',{
                animationDuration:rnd(25,45)+'s',
                animationDelay:rnd(0,10)+'s',
                opacity:String(rnd(0.08,0.18))
            });
            frag.appendChild(d);
        }
        // Ambient haze tint
        const haze=mkDiv('sp-wx-fog-haze',{});frag.appendChild(haze);
    } else if(_wt==='sandstorm'){
        // Sweeping dust cloud bands
        for(let i=0;i<8;i++){
            const d=mkDiv('sp-wx-dust-cloud',{
                top:rnd(0,80)+'%',
                animationDuration:rnd(10,25)+'s',
                animationDelay:rnd(0,10)+'s',
                opacity:String(rnd(0.08,0.2)),
                height:rnd(15,35)+'%'
            });
            frag.appendChild(d);
        }
        // Flying sand grains -- angled flight
        for(let i=0;i<80;i++){
            const sz=rnd(1,4);
            const d=mkDiv('sp-wx-dust-particle',{
                top:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(0.6,2)+'s',
                animationDelay:rnd(0,6)+'s',
                opacity:String(rnd(0.15,0.5)),
                '--wx-sand-drift':rnd(-50,50)+'px'
            });
            frag.appendChild(d);
        }
        // Warm haze overlay
        const haze=mkDiv('sp-wx-sand-haze',{});frag.appendChild(haze);
    } else if(_wt==='wind'){
        // Dense streaks at varied angles
        for(let i=0;i<55;i++){
            const d=mkDiv('sp-wx-wind-streak',{
                top:rnd(0,100)+'%',
                animationDuration:rnd(0.4,1.6)+'s',
                animationDelay:rnd(0,5)+'s',
                opacity:String(rnd(0.06,0.22)),
                width:rnd(50,180)+'px'
            });
            frag.appendChild(d);
        }
        // Dust motes
        for(let i=0;i<25;i++){
            const sz=rnd(1,3);
            const d=mkDiv('sp-wx-wind-dust',{
                top:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(1,3)+'s',
                animationDelay:rnd(0,4)+'s',
                opacity:String(rnd(0.1,0.35))
            });
            frag.appendChild(d);
        }
        // Ambient sway
        const sway=mkDiv('sp-wx-wind-sway',{});frag.appendChild(sway);
    } else if(_wt==='aurora'){
        // Bright vivid ribbons
        for(let i=0;i<10;i++){
            const hue=rnd(100,300);
            const d=mkDiv('sp-wx-aurora-ribbon',{
                top:rnd(0,35)+'%',
                animationDuration:rnd(6,14)+'s',
                animationDelay:rnd(0,8)+'s',
                '--wx-hue1':hue,
                '--wx-hue2':hue+rnd(40,100),
                opacity:String(rnd(0.12,0.3)),
                height:rnd(10,25)+'%'
            });
            frag.appendChild(d);
        }
        // Shimmer curtain
        const curtain=mkDiv('sp-wx-aurora-curtain',{});frag.appendChild(curtain);
        // Stars
        for(let i=0;i<35;i++){
            const d=mkDiv('sp-wx-star',{
                left:rnd(0,100)+'%',top:rnd(0,60)+'%',
                animationDuration:rnd(1.5,4)+'s',
                animationDelay:rnd(0,5)+'s',
                width:rnd(1,3)+'px',height:rnd(1,3)+'px'
            });
            frag.appendChild(d);
        }
        // Ground glow
        const aglow=mkDiv('sp-wx-aurora-glow',{});frag.appendChild(aglow);
    } else if(_wt==='ash'){
        // Falling ash flakes -- gray, drifting
        for(let i=0;i<95;i++){
            const sz=rnd(2,7);
            const d=mkDiv('sp-wx-ash-flake',{
                left:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(3,10)+'s',
                animationDelay:rnd(0,8)+'s',
                opacity:String(rnd(0.2,0.65)),
                '--wx-drift':rnd(-70,70)+'px',
                '--wx-drift2':rnd(-35,35)+'px'
            });
            frag.appendChild(d);
        }
        // Ember particles -- orange glow rising from bottom
        for(let i=0;i<25;i++){
            const sz=rnd(1.5,4);
            const d=mkDiv('sp-wx-ember',{
                left:rnd(0,100)+'%',
                width:sz+'px',height:sz+'px',
                animationDuration:rnd(3,7)+'s',
                animationDelay:rnd(0,6)+'s',
                opacity:String(rnd(0.35,0.8))
            });
            frag.appendChild(d);
        }
        // Smoky haze
        const smoke=mkDiv('sp-wx-ash-haze',{});frag.appendChild(smoke);
    }
    } // end for(wxTypes)
    ov.appendChild(frag);
    log('Weather overlay:',wxKey,'types:',wxTypes.length,'particles:',ov.children.length);
}
export function clearWeatherOverlay(){
    const ov=document.getElementById('sp-weather-overlay');
    if(ov){ov.remove();setCurrentWeatherType('')}
}
