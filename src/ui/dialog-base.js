// src/ui/dialog-base.js — v6.27.12 shared overlay lifecycle
//
// Pattern review (round 1 + 2 panel) flagged that 12 dialog modules
// each independently re-implement the same overlay lifecycle: open,
// register a keydown listener for Escape, register a click handler
// that closes when the click hits the backdrop, prevent pointer/click
// bubbling so ST's own click handlers don't fire, and tear all of it
// down on close. The v6.23.x backdrop/popover regression chain
// (commits 4990217, 3e0e40c, 085212c, a8e6f65, cce787a — four
// successive fixes for the same shape of bug) is direct evidence the
// duplication produces recurring defects.
//
// This module is the canonical lifecycle helper. The two branded-
// dialog modules (or-connector-prompt.js, preset-suggestion-prompt.js)
// migrate to it in v6.27.12 as proof points. The other ten dialog
// callers (prompt-editor, preset-browser, debug-inspector, character-
// wiki, update-panel, edit-mode, relationship-web, timeline,
// analytics, sparklines) keep their own bespoke wiring for now and
// can migrate incrementally in follow-up commits without rushing.

/**
 * Mount an overlay onto document.body and wire its standard lifecycle.
 *
 * The caller builds and styles the overlay element. This helper does
 * NOT inject any DOM. It only adds event listeners and provides a
 * close() function that resolves the caller's promise / triggers their
 * onClose callback.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.root              Already-built overlay root.
 *                                             Must be a backdrop element
 *                                             that contains the dialog.
 * @param {(reason: 'esc'|'backdrop'|'manual'|'enter') => void} opts.onClose
 *                                             Called when the dialog closes.
 *                                             Reason argument tells the caller
 *                                             which path triggered the close.
 * @param {boolean} [opts.closeOnEsc=true]     Close when Escape is pressed.
 * @param {boolean} [opts.closeOnEnter=false]  Close when Enter is pressed.
 *                                             Used by spConfirm-style dialogs
 *                                             where Enter == primary action.
 * @param {boolean} [opts.closeOnBackdrop=true] Close when the user clicks the
 *                                              backdrop (event.target === root).
 * @param {string}  [opts.closingClass='sp-confirm-closing']
 *                                             Class added to root just before
 *                                             unmount, so existing exit-anim
 *                                             CSS still fires.
 * @param {number}  [opts.unmountDelayMs=200]  Delay between adding the closing
 *                                             class and removing the element.
 *                                             Defaults match the existing
 *                                             sp-confirm-overlay 0.2s exit.
 * @returns {{ close: (reason?: string) => void }}
 *          Manual close handle. Pass to the caller's button handlers
 *          or whatever else needs to close the dialog programmatically.
 */
export function mountOverlay(opts) {
    const {
        root,
        onClose,
        closeOnEsc = true,
        closeOnEnter = false,
        closeOnBackdrop = true,
        closingClass = 'sp-confirm-closing',
        unmountDelayMs = 200,
    } = opts || {};
    if (!root) throw new Error('mountOverlay: opts.root is required');

    let _settled = false;

    const _close = (reason) => {
        if (_settled) return;
        _settled = true;
        document.removeEventListener('keydown', _onKey, true);
        try { root.classList.add(closingClass); } catch {}
        setTimeout(() => { try { root.remove(); } catch {} }, unmountDelayMs);
        try { onClose?.(reason || 'manual'); } catch {}
    };

    const _onKey = (e) => {
        if (closeOnEsc && e.key === 'Escape') {
            _close('esc');
            e.stopPropagation();
        } else if (closeOnEnter && e.key === 'Enter') {
            _close('enter');
            e.stopPropagation();
        }
    };

    if (closeOnBackdrop) {
        root.addEventListener('click', (e) => { if (e.target === root) _close('backdrop'); });
    }

    // Stop pointer/click bubbling so ST's settings-panel close handlers
    // (or any other parent listener) don't fire when interacting inside
    // the dialog. Mirrors the v6.23.6 "rename .sp-pb-overlay" fix —
    // every dialog needs this isolation.
    const _stop = (e) => e.stopPropagation();
    root.addEventListener('mousedown', _stop);
    root.addEventListener('pointerdown', _stop);

    document.addEventListener('keydown', _onKey, true);
    document.body.appendChild(root);

    return { close: _close };
}
