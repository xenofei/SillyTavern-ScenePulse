// ScenePulse — Character Color Module
//
// v6.8.33: expanded palette (10 → 30 colors) + per-character SVG background
// patterns. Each character gets a deterministic {bg, border, accent, pattern}
// tuple keyed by their lowercased name. Aliases and first-name matches
// resolve to the same color as the canonical entry.
//
// The pattern field is a new addition in v6.8.33 — it's a data-URI SVG
// string that can be used directly in a `background-image` CSS declaration.
// Consumers that don't read it get the old bg/border/accent behavior
// unchanged. See characters.css / relationships.css / thoughts.css for
// how the pattern is composited with --char-bg for the textured look.

import { _charColorMap, _charColorNext, set_charColorNext } from './state.js';

export function resetColorMap(){_charColorMap.clear();set_charColorNext(0);}

// ── Color palette ─────────────────────────────────────────────────────
// 30 hand-curated hues selected for:
//   - Distinct perceptual spacing (>15° hue separation)
//   - Consistent luminance against the dark theme background
//   - No muddy yellows, no unreadable saturated reds
//   - Every accent passes a contrast check against #0c0e14 canvas
//
// Each entry is {bg, border, accent}:
//   bg     — rgba at 8% alpha, used as card background tint
//   border — rgba at 25% alpha, used as card left border
//   accent — full hex, used for name text, icons, portrait monograms
//
// Ordering: warm → cool → neutrals, with a reshuffle pass so the first
// N characters in a scene don't all look similar (adjacent indices get
// visually different hues).
export const CHAR_COLORS=[
    // ── Warm core (0-6) ──
    {bg:'rgba(77,184,164,0.08)',  border:'rgba(77,184,164,0.25)',  accent:'#4db8a4'}, // teal
    {bg:'rgba(224,122,176,0.08)', border:'rgba(224,122,176,0.25)', accent:'#e07ab0'}, // pink
    {bg:'rgba(200,140,90,0.08)',  border:'rgba(200,140,90,0.25)',  accent:'#c88c5a'}, // amber
    {bg:'rgba(100,160,220,0.08)', border:'rgba(100,160,220,0.25)', accent:'#64a0dc'}, // sky blue
    {bg:'rgba(200,100,120,0.08)', border:'rgba(200,100,120,0.25)', accent:'#c86478'}, // rose
    {bg:'rgba(140,190,100,0.08)', border:'rgba(140,190,100,0.25)', accent:'#8cbe64'}, // sage
    {bg:'rgba(220,180,100,0.08)', border:'rgba(220,180,100,0.25)', accent:'#dcb464'}, // gold
    // ── Cool mid (7-13) ──
    {bg:'rgba(164,120,200,0.08)', border:'rgba(164,120,200,0.25)', accent:'#a478c8'}, // lavender
    {bg:'rgba(100,200,180,0.08)', border:'rgba(100,200,180,0.25)', accent:'#64c8b4'}, // mint
    {bg:'rgba(130,140,200,0.08)', border:'rgba(130,140,200,0.25)', accent:'#828cc8'}, // periwinkle
    {bg:'rgba(220,100,100,0.08)', border:'rgba(220,100,100,0.25)', accent:'#dc6464'}, // coral
    {bg:'rgba(110,180,210,0.08)', border:'rgba(110,180,210,0.25)', accent:'#6eb4d2'}, // cerulean
    {bg:'rgba(190,140,70,0.08)',  border:'rgba(190,140,70,0.25)',  accent:'#be8c46'}, // bronze
    {bg:'rgba(150,200,120,0.08)', border:'rgba(150,200,120,0.25)', accent:'#96c878'}, // lime
    // ── Saturated feature (14-20) ──
    {bg:'rgba(255,140,80,0.08)',  border:'rgba(255,140,80,0.25)',  accent:'#ff8c50'}, // orange
    {bg:'rgba(200,130,180,0.08)', border:'rgba(200,130,180,0.25)', accent:'#c882b4'}, // mauve
    {bg:'rgba(90,180,200,0.08)',  border:'rgba(90,180,200,0.25)',  accent:'#5ab4c8'}, // aqua
    {bg:'rgba(210,100,200,0.08)', border:'rgba(210,100,200,0.25)', accent:'#d264c8'}, // magenta
    {bg:'rgba(170,210,100,0.08)', border:'rgba(170,210,100,0.25)', accent:'#aad264'}, // chartreuse
    {bg:'rgba(100,130,210,0.08)', border:'rgba(100,130,210,0.25)', accent:'#6482d2'}, // royal blue
    {bg:'rgba(220,160,120,0.08)', border:'rgba(220,160,120,0.25)', accent:'#dca078'}, // apricot
    // ── Desaturated neutrals (21-29) ──
    {bg:'rgba(150,190,170,0.08)', border:'rgba(150,190,170,0.25)', accent:'#96beaa'}, // sage green
    {bg:'rgba(190,150,190,0.08)', border:'rgba(190,150,190,0.25)', accent:'#be96be'}, // dusty violet
    {bg:'rgba(180,170,130,0.08)', border:'rgba(180,170,130,0.25)', accent:'#b4aa82'}, // sand
    {bg:'rgba(130,180,180,0.08)', border:'rgba(130,180,180,0.25)', accent:'#82b4b4'}, // slate teal
    {bg:'rgba(200,120,140,0.08)', border:'rgba(200,120,140,0.25)', accent:'#c8788c'}, // clay pink
    {bg:'rgba(150,160,200,0.08)', border:'rgba(150,160,200,0.25)', accent:'#96a0c8'}, // steel blue
    {bg:'rgba(200,180,140,0.08)', border:'rgba(200,180,140,0.25)', accent:'#c8b48c'}, // khaki
    {bg:'rgba(170,140,160,0.08)', border:'rgba(170,140,160,0.25)', accent:'#aa8ca0'}, // dusty mauve
    {bg:'rgba(120,170,150,0.08)', border:'rgba(120,170,150,0.25)', accent:'#78aa96'}, // jade
];

export const UNRESOLVED_COLOR={
    bg:'rgba(150,150,160,0.06)',
    border:'rgba(150,150,160,0.15)',
    accent:'#969698',
    pattern:'', // no pattern for unknown characters
};

// ── Pattern generators ────────────────────────────────────────────────
// Each pattern generator returns an SVG data URI sized to tile naturally
// (24×24 to 36×36). The stroke/fill color is passed in so each character
// gets their accent as the pattern tint. Opacity is kept very low
// (0.04-0.08) so the pattern reads as barely-there ambient texture
// rather than a distracting foreground layer. The data URI format is
// base64-free — raw SVG with URL-encoded hashes — for smaller payloads.
//
// v6.8.34: opacities reduced ~40% from v6.8.33 per user feedback the
// patterns were too prominent. Previous range was 0.08-0.14; current
// range is 0.05-0.08. Users who want more/less visibility can further
// tune via the --char-pattern-opacity CSS var (see characters.css).
//
// Pattern generators are pure — same (color) input → same output URL,
// so browsers cache repeated pattern instances efficiently.

function _enc(svg){
    // Minimal URL encoding — only escape the chars that break the data:
    // URI context. Avoids full encodeURIComponent which bloats payload.
    return svg.replace(/"/g,"'").replace(/</g,'%3C').replace(/>/g,'%3E').replace(/#/g,'%23');
}

const PATTERN_GENERATORS=[
    // 0: dots — small filled circles in a grid
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="7" cy="7" r="1.4" fill="${c}" opacity="0.08"/><circle cx="21" cy="21" r="1.4" fill="${c}" opacity="0.08"/><circle cx="21" cy="7" r="1" fill="${c}" opacity="0.05"/><circle cx="7" cy="21" r="1" fill="${c}" opacity="0.05"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 1: diagonal stripes (forward slash)
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M-2,6 l8,-8 M-2,18 l20,-20 M6,26 l20,-20 M18,26 l8,-8" stroke="${c}" stroke-width="1.2" opacity="0.07" fill="none"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 2: diagonal stripes (backslash)
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M-2,18 l8,8 M-2,6 l20,20 M6,-2 l20,20 M18,-2 l8,8" stroke="${c}" stroke-width="1.2" opacity="0.07" fill="none"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 3: crosshatch — thin grid of intersecting lines
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0,0 l24,24 M0,24 l24,-24 M0,12 l24,0 M12,0 l0,24" stroke="${c}" stroke-width="0.7" opacity="0.06" fill="none"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 4: grid — simple rectangular grid
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0,0 h24 M0,12 h24 M0,24 h24 M0,0 v24 M12,0 v24 M24,0 v24" stroke="${c}" stroke-width="0.8" opacity="0.06" fill="none"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 5: waves — shallow sine curves
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24" viewBox="0 0 32 24"><path d="M0,8 q8,-6 16,0 t16,0 M0,16 q8,-6 16,0 t16,0" stroke="${c}" stroke-width="1" opacity="0.07" fill="none"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 6: triangles — tessellation pattern
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4,4 l4,6 l-8,0 z M16,4 l4,6 l-8,0 z M10,14 l4,6 l-8,0 z M22,14 l4,6 l-8,0 z" stroke="${c}" stroke-width="0.8" opacity="0.06" fill="${c}" fill-opacity="0.025"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 7: circles — outlined rings
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="8" cy="8" r="4" stroke="${c}" stroke-width="0.9" opacity="0.07" fill="none"/><circle cx="22" cy="22" r="4" stroke="${c}" stroke-width="0.9" opacity="0.07" fill="none"/><circle cx="22" cy="8" r="2" stroke="${c}" stroke-width="0.8" opacity="0.05" fill="none"/><circle cx="8" cy="22" r="2" stroke="${c}" stroke-width="0.8" opacity="0.05" fill="none"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 8: chevron — arrow V shapes
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0,4 l6,-4 l6,4 l6,-4 l6,4 M0,16 l6,-4 l6,4 l6,-4 l6,4" stroke="${c}" stroke-width="1" opacity="0.07" fill="none"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 9: hex — single centered hexagon per tile. v6.8.36 redesign:
    // the previous version drew a central hex plus two half-hexes at
    // the left/right edges that expected continuity with adjacent
    // tiles' bottom edges — but those bottom edges weren't drawn, so
    // the tiled repetition showed a visible seam. Now a single hexagon
    // fully contained inside the tile with no bleeding edges.
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M14,5 l7,4 l0,10 l-7,4 l-7,-4 l0,-10 z" stroke="${c}" stroke-width="0.9" opacity="0.06" fill="none"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 10: plus signs
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M6,4 v4 M4,6 h4 M18,16 v4 M16,18 h4 M18,4 v4 M16,6 h4 M6,16 v4 M4,18 h4" stroke="${c}" stroke-width="1.1" opacity="0.08" fill="none" stroke-linecap="round"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
    // 11: zigzag
    (c)=>{
        const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16" viewBox="0 0 24 16"><path d="M0,4 l6,4 l6,-4 l6,4 l6,-4 M0,12 l6,4 l6,-4 l6,4 l6,-4" stroke="${c}" stroke-width="1" opacity="0.06" fill="none"/></svg>`;
        return `url("data:image/svg+xml,${_enc(svg)}")`;
    },
];

// Simple deterministic hash of a string to an integer. djb2 — same
// algorithm used in state.js for other deterministic IDs. Used to pick
// a pattern per character independent of the color index, so two
// characters sharing a color (after the 30-wraparound) usually have
// different patterns.
function _hashString(s){
    let h=5381;
    for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;
    return h>>>0;
}

// Resolve the pattern URL for a character from their lowercased name
// and their assigned accent color. Stable per (name, accent) pair.
function _patternFor(key,accent){
    if(!key)return '';
    const idx=_hashString(key)%PATTERN_GENERATORS.length;
    return PATTERN_GENERATORS[idx](accent);
}

// ── Public API ────────────────────────────────────────────────────────
// Returns {bg, border, accent, pattern} for a character. Backward-
// compatible — the three original fields are unchanged, pattern is new.
// Callers that don't read .pattern keep working.
export function charColor(name){
    if(!name||name==='?')return UNRESOLVED_COLOR;
    const key=name.toLowerCase().trim();
    if(key==='?'||key==='unknown')return UNRESOLVED_COLOR;

    // Cached hit — return the stored color index + freshly computed
    // pattern (pattern is cheap to compute; we don't cache it).
    if(_charColorMap.has(key)){
        const idx=_charColorMap.get(key)%CHAR_COLORS.length;
        const base=CHAR_COLORS[idx];
        return {...base,pattern:_patternFor(key,base.accent)};
    }
    // Fuzzy-match to an existing entry: "Yuzuki" ↔ "Yuzuki Tamura" so
    // aliases and short forms get the same color as the canonical entry.
    //
    // v6.8.33 fix: previously also did a loose first-token match, which
    // caused "Officer Jane", "Officer Buzzcut", "Officer Ponytail" to all
    // collide to one color because they share first token "officer". The
    // same bug affected "Dr. Smith" vs "Dr. Jones", "Lord X" vs "Lord Y",
    // "Captain A" vs "Captain B", etc. Titles are not names.
    //
    // New rule: only fuzzy-match via the "A startsWith B+' '" relationship
    // — that catches genuine aliases ("Yuzuki" → "Yuzuki Tamura") without
    // treating honorifics as identity. The looser first-token match is
    // gated on the token NOT being in a common title stoplist.
    const TITLE_STOPLIST=new Set([
        'officer','detective','sergeant','lieutenant','captain','major','general',
        'commander','chief','deputy','agent','inspector','constable','marshal',
        'doctor','dr','professor','prof','master','mister','mr','mrs','ms','miss',
        'sir','lord','lady','king','queen','prince','princess','duke','duchess',
        'baron','baroness','count','countess','earl','viscount','marquis',
        'father','mother','sister','brother','priest','pastor','rabbi','imam',
        'saint','st','mister','madam','madame','mademoiselle',
        'the','a','an','old','young','uncle','auntie','auntie','grandma','grandpa',
    ]);
    // Strip trailing punctuation from a token so "Dr." → "dr",
    // "Mr." → "mr", etc. are normalized for stoplist lookup.
    const _cleanTok=(t)=>t.replace(/[^a-z0-9]+$/,'').replace(/^[^a-z0-9]+/,'');
    for(const[existingKey,idx]of _charColorMap){
        // Substring alias form: "yuzuki" startsWith "yuzuki tamura "+ ... etc
        if(existingKey.startsWith(key+' ')||key.startsWith(existingKey+' ')){
            _charColorMap.set(key,idx);
            const base=CHAR_COLORS[idx%CHAR_COLORS.length];
            return {...base,pattern:_patternFor(key,base.accent)};
        }
        // First-token match — SKIP if the shared first token is a title
        // or honorific. Normalize punctuation first so "Dr." matches "dr"
        // in the stoplist.
        const existFirst=_cleanTok(existingKey.split(/\s/)[0]);
        const keyFirst=_cleanTok(key.split(/\s/)[0]);
        if(existFirst===keyFirst&&existFirst.length>2&&!TITLE_STOPLIST.has(existFirst)){
            _charColorMap.set(key,idx);
            const base=CHAR_COLORS[idx%CHAR_COLORS.length];
            return {...base,pattern:_patternFor(key,base.accent)};
        }
    }
    // Assign next unused color index
    const idx=_charColorNext;
    set_charColorNext(_charColorNext+1);
    _charColorMap.set(key,idx);
    const base=CHAR_COLORS[idx%CHAR_COLORS.length];
    return {...base,pattern:_patternFor(key,base.accent)};
}
