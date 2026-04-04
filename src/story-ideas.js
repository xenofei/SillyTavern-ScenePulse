// ScenePulse — Story Idea Injection
import { log, warn } from './logger.js';
import { getSettings } from './settings.js';

export function injectStoryIdea(idea,cat){
    if(!getSettings().enabled){log('injectStoryIdea: extension disabled');return}
    const typeLabel=(cat?.label||idea.type||'Story').toUpperCase();
    // Build the OOC direction message
    const direction=`[OOC: Take the story in a ${idea.type} direction — "${idea.name}". ${idea.hook}]`;
    log('Injecting story idea:',idea.type,idea.name);
    // Method 1: Use ST's textarea + send
    const textarea=document.getElementById('send_textarea');
    const sendBtn=document.getElementById('send_but');
    if(textarea&&sendBtn){
        // Save any existing user input
        const prevText=textarea.value;
        textarea.value=direction;
        // Trigger input event so ST recognizes the change
        textarea.dispatchEvent(new Event('input',{bubbles:true}));
        // Small delay then click send
        setTimeout(()=>{
            sendBtn.click();
            log('Story idea sent via textarea');
            // Flash the card to confirm
            toastr?.success?.(`${cat?.label}: ${idea.name}`,'Story direction sent');
        },100);
    } else {
        // Fallback: try context API
        try{
            const ctx=SillyTavern.getContext();
            if(typeof ctx.sendMessage==='function'){
                ctx.sendMessage(direction);
                log('Story idea sent via context API');
                toastr?.success?.(`${cat?.label}: ${idea.name}`,'Story direction sent');
            } else {
                // Last resort: copy to clipboard
                navigator.clipboard.writeText(direction).then(()=>{
                    toastr?.info?.('Story idea copied — paste it in the chat input','Copied');
                });
            }
        }catch(e){warn('injectStoryIdea fallback:',e)}
    }
}
