// ScenePulse — Character Color Module
// Extracted from index.js lines 609-648

import { _charColorMap, _charColorNext, set_charColorNext } from './state.js';
import { log } from './logger.js';

export function resetColorMap(){_charColorMap.clear();set_charColorNext(0);}

// Character color palette -- muted, dark-theme-friendly hues
export const CHAR_COLORS=[
    {bg:'rgba(77,184,164,0.08)', border:'rgba(77,184,164,0.25)', accent:'#4db8a4'},  // teal
    {bg:'rgba(164,120,200,0.08)', border:'rgba(164,120,200,0.25)', accent:'#a478c8'},  // lavender
    {bg:'rgba(200,140,90,0.08)', border:'rgba(200,140,90,0.25)', accent:'#c88c5a'},   // amber
    {bg:'rgba(100,160,220,0.08)', border:'rgba(100,160,220,0.25)', accent:'#64a0dc'},  // sky blue
    {bg:'rgba(200,100,120,0.08)', border:'rgba(200,100,120,0.25)', accent:'#c86478'},  // rose
    {bg:'rgba(140,190,100,0.08)', border:'rgba(140,190,100,0.25)', accent:'#8cbe64'},  // sage
    {bg:'rgba(220,180,100,0.08)', border:'rgba(220,180,100,0.25)', accent:'#dcb464'},  // gold
    {bg:'rgba(130,140,200,0.08)', border:'rgba(130,140,200,0.25)', accent:'#828cc8'},  // periwinkle
    {bg:'rgba(200,130,180,0.08)', border:'rgba(200,130,180,0.25)', accent:'#c882b4'},  // mauve
    {bg:'rgba(100,200,180,0.08)', border:'rgba(100,200,180,0.25)', accent:'#64c8b4'},  // mint
];

export const UNRESOLVED_COLOR={bg:'rgba(150,150,160,0.06)', border:'rgba(150,150,160,0.15)', accent:'#969698'}; // neutral gray for unresolved characters

export function charColor(name){
    if(!name||name==='?')return UNRESOLVED_COLOR;
    const key=name.toLowerCase().trim();
    if(key==='?'||key==='unknown')return UNRESOLVED_COLOR;
    if(_charColorMap.has(key))return CHAR_COLORS[_charColorMap.get(key)%CHAR_COLORS.length];
    // Check for fuzzy match to existing entry (first name match, contains match)
    for(const[existingKey,idx]of _charColorMap){
        // "yuzuki" matches "yuzuki tamura" and vice versa
        if(existingKey.startsWith(key+' ')||key.startsWith(existingKey+' ')){
            _charColorMap.set(key,idx); // Register alias so future lookups are O(1)
            return CHAR_COLORS[idx%CHAR_COLORS.length];
        }
        // First-name match: "yuzuki" === "yuzuki"
        const existFirst=existingKey.split(/\s/)[0];const keyFirst=key.split(/\s/)[0];
        if(existFirst===keyFirst&&existFirst.length>2){
            _charColorMap.set(key,idx);
            return CHAR_COLORS[idx%CHAR_COLORS.length];
        }
    }
    // Assign next unused color
    const idx=_charColorNext;
    set_charColorNext(_charColorNext + 1);
    _charColorMap.set(key,idx);
    return CHAR_COLORS[idx%CHAR_COLORS.length];
}
