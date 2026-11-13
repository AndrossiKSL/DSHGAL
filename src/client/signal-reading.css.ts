export const SIGNAL_READING_CSS=`
.whsig .signal-input select{max-width:6em;min-width:3.8em;color:var(--frame-muted);font-size:.82cqw;background:transparent;border:0;border-bottom:1px solid #91bdcb40;padding:0 .3cqw;cursor:pointer}.whsig .signal-input select option{background:#10253b;color:#e9e0c9}
.whsig .game[data-cast-count="3"]:not([data-view=title]) .signal-actor.is-ensemble{height:126%;bottom:-28%}
.whsig .dialogue-box{outline:none}.whsig .dialogue-box:focus-visible .reader-page-nav{outline:1px solid var(--frame-accent);outline-offset:3px}
.whsig .game:not([data-view=title])>.signal-actor:not(.is-ensemble){left:65%;height:190%;bottom:-89%}
.whsig .signal-page-copy,.whsig .signal-page-measure{font:400 clamp(18px,1.62cqw,28px)/1.7 'Atelier Serif UI','Noto Serif SC',SimSun,serif;letter-spacing:.035em;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;color:var(--frame-ink);text-shadow:var(--frame-shadow)}
.whsig .signal-page-copy{position:absolute;left:12.8%;right:13.6%;top:28.5%;bottom:35.5%;overflow:hidden;z-index:3;pointer-events:none}
.whsig .signal-page-measure{position:absolute;left:0;top:0;height:auto;visibility:hidden;pointer-events:none;z-index:-1}
.whsig .game.character-dialogue .dialogue-box .signal-page-copy .signal-line{position:static;inset:auto;max-height:none;overflow:visible;margin:0;font:inherit;line-height:inherit;letter-spacing:inherit;white-space:inherit;color:inherit;text-shadow:inherit;pointer-events:none}
.whsig .signal-page-copy[data-kind=narration]{color:var(--frame-ink);opacity:.93}
.whsig .reader-footer{position:absolute;left:13%;right:13.5%;top:67%;height:1.5cqw;display:flex;align-items:center;justify-content:space-between;gap:1cqw;color:var(--frame-muted);font:400 .78cqw/1 'Atelier Serif UI',SimSun,serif;letter-spacing:.07em;z-index:4}
.whsig .reader-kind{opacity:.8}.whsig .reader-page-nav{display:flex;align-items:center;gap:.65cqw;font:italic .78cqw/1 Georgia,serif;color:var(--frame-muted)}
.whsig .reader-page-nav button{display:grid;place-items:center;padding:0;border:0;background:transparent;color:var(--frame-accent);width:1.8cqw;height:1.6cqw;font-size:1.05cqw;cursor:pointer;opacity:.8;transition:opacity 150ms ease,translate 150ms ease}
.whsig .reader-page-nav button:hover{opacity:1;translate:2px 0}.whsig .reader-page-nav button:disabled{visibility:hidden}.whsig .reader-page-nav button:focus-visible{outline:1px solid var(--frame-accent);outline-offset:2px}
.whsig .character-dialogue .quick-menu{left:42%;right:14%;bottom:6.7%;height:4.1%;gap:.1cqw}
.whsig .character-dialogue .quick-action{font-size:.93cqw;letter-spacing:.04em;gap:.35cqw;padding:0 .3cqw}
.whsig .character-dialogue .quick-action svg{width:1.2cqw;height:1.2cqw}
.whsig .signal-input{left:14%;right:60.8%;bottom:6.7%;height:3.6%}
.whsig .signal-input input{font-size:.86cqw;border-bottom-color:color-mix(in srgb,var(--frame-accent),transparent 65%)}
.whsig .signal-input button{font-size:.9cqw;border-bottom-color:color-mix(in srgb,var(--frame-accent),transparent 65%)}
.whsig .signal-input[data-expanded=true]{right:14.8%}
.whsig .character-dialogue .choice-stack{left:6.2%;top:20.5%;width:42%;gap:.15cqw;max-height:42%;overflow:visible}
.whsig .character-dialogue .choice{font-size:1.18cqw;font-weight:500;letter-spacing:.025em}
.whsig .character-dialogue .choice-label,.whsig .character-dialogue .choice-label[data-long=true]{left:24%;right:11.8%;top:var(--choice-line-y,50%);font-size:inherit;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;overflow-wrap:normal;word-break:keep-all}
.whsig .character-dialogue .choice-index{font-size:.92cqw}
.whsig .character-dialogue .choice.is-locked{opacity:.65}
.whsig .signal-choice-detail{margin:0 9% 0 15%;max-height:5cqw;overflow:auto;font-size:.9cqw;background:#081727f2}
.whsig .character-dialogue .choice[aria-pressed=true]:disabled .choice-label,.whsig .character-dialogue .choice[aria-pressed=true]:disabled .choice-index{opacity:1}
@container(max-width:720px){
.whsig .signal-input select{font-size:11px;max-width:6em}.whsig .game[data-cast-count="3"]:not([data-view=title]) .signal-actor.is-ensemble{height:75%;bottom:18%;left:var(--ensemble-mobile-x,50%)!important}.whsig .signal-utility{top:10px;right:50px;gap:3px}.whsig .signal-utility button{width:29px;height:30px;padding:5px}.whsig .signal-utility button span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.whsig .game:not([data-view=title])>.signal-actor:not(.is-ensemble){height:90%;bottom:15%;left:63%}
.whsig .signal-page-copy,.whsig .signal-page-measure{font-size:17px;line-height:1.85;letter-spacing:.025em}
.whsig .signal-page-copy{left:18px;right:18px;top:22%;bottom:35%}
.whsig .reader-footer{left:18px;right:18px;top:auto;bottom:28%;height:20px;font-size:11px}.whsig .reader-page-nav{font-size:11px;gap:8px}.whsig .reader-page-nav button{width:27px;height:26px;font-size:15px}
.whsig .character-dialogue .quick-menu{left:16px;right:16px;bottom:8.5%;height:34px;gap:0}.whsig .character-dialogue .quick-action{font-size:10px;gap:5px;padding:4px}.whsig .character-dialogue .quick-action svg{width:13px;height:13px}
.whsig .signal-input,.whsig .signal-input[data-expanded=true]{left:20px;right:20px;bottom:2.4%;height:32px;gap:8px}.whsig .signal-input input,.whsig .signal-input button{font-size:12px}
.whsig .character-dialogue .choice-stack{left:3%;right:3%;width:94%;top:auto;bottom:calc(45% + 16px);gap:4px;max-height:32%;overflow:visible}
.whsig .character-dialogue .choice{height:55px;min-height:55px;aspect-ratio:auto;font-size:14px;letter-spacing:.01em}.whsig .character-dialogue .choice-index{font-size:11px}.whsig .signal-choice-detail{font-size:12px;max-height:80px}
}
@media(prefers-reduced-motion:reduce){.whsig .reader-page-nav button{transition:none}}
`
