// src/ui/time-tint.js — Time-of-Day Ambient Tint
import { getSettings } from '../settings.js';
import { currentTimePeriod, setCurrentTimePeriod } from '../state.js';
import { spDetectMode } from './mobile.js';

export function updateTimeTint(timeStr){
    const s=getSettings();
    if(s.timeTint===false)return;
    const mode=spDetectMode();if(mode==='mobile'||mode==='tablet'){clearTimeTint();return}
    const h=parseInt((timeStr||'').match(/(\d+):/)?.[1]||'12');
    let period='day';
    if(h>=5&&h<7)period='dawn';
    else if(h>=7&&h<11)period='morning';
    else if(h>=11&&h<14)period='day';
    else if(h>=14&&h<17)period='afternoon';
    else if(h>=17&&h<20)period='dusk';
    else if(h>=20&&h<22)period='evening';
    else period='night';
    if(period===currentTimePeriod)return;
    setCurrentTimePeriod(period);
    let ov=document.getElementById('sp-time-tint');
    if(!ov){ov=document.createElement('div');ov.id='sp-time-tint';document.body.insertBefore(ov,document.body.firstChild)}
    ov.className='sp-time-tint sp-time-'+period;
}
export function clearTimeTint(){
    const ov=document.getElementById('sp-time-tint');if(ov)ov.remove();setCurrentTimePeriod('');
}
