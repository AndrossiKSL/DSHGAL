/** Story presentation only; existing whg selectors and event wiring stay intact. */
export const ATELIER_CSS = `
.whg-root,.whg-root-tab{overflow:clip;--gal-ink:#080c14;--gal-line:rgba(255,255,255,.16);--gal-text:#f2eee7;--gal-accent:#d7b57a;--gal-serif:"Source Han Serif SC","Noto Serif SC","Songti SC","STSong","SimSun",serif;--gal-ease:cubic-bezier(.22,.61,.36,1)}
.whg-gal,.whg-gal *{box-sizing:border-box}
.whg-gal{position:absolute;overflow:clip;inset:0;background:#09111b;color:var(--gal-text)}
.whg-gal-bg{z-index:0;background-position:center 45%}
.whg-gal-veil{z-index:1;pointer-events:none;background:radial-gradient(ellipse at 50% 42%,transparent 30%,rgba(0,0,0,.5) 100%),linear-gradient(rgba(20,24,48,.09),rgba(20,24,48,.09))}
.whg-gal-cast{z-index:2}
.whg-gal-actor{bottom:-10%;height:108%;filter:brightness(1);transition:filter 220ms var(--gal-ease),opacity 220ms var(--gal-ease)}
.whg-gal-actor.is-quiet{filter:brightness(.57) saturate(.85);opacity:1}
.whg-gal-actor.is-speaking{filter:brightness(1)}
.whg-gal-box{left:0;right:0;bottom:0;min-height:27%;padding:32px 6cqw 72px;gap:12px;border:0;border-top:1px solid var(--gal-line);border-radius:0;background:linear-gradient(rgba(8,12,20,.79),rgba(8,12,20,.95));box-shadow:none}
.whg-gal-speaker{position:absolute;top:-17px;left:6cqw;padding:7px 23px;border:1px solid rgba(215,181,122,.4);border-radius:0;background:rgba(12,18,28,.96);font:13px/1.4 var(--gal-serif);font-weight:400;letter-spacing:.2em;color:var(--gal-accent)}
.whg-gal-text{font:clamp(15px,1.38cqw,21px)/2.05 var(--gal-serif);letter-spacing:.035em;min-height:2.1em;color:var(--gal-text);max-height:24vh;overflow:auto;scrollbar-width:thin}
.whg-gal-narr{font:clamp(12px,1.1cqw,15px)/1.85 var(--gal-serif);color:#c1beb5;max-height:12vh;overflow:auto}
.whg-gal-caret{display:none}
.whg-gal-next{position:absolute;right:28px;top:43px;color:var(--gal-accent);font-size:15px;animation:whg-next-breathe 1400ms ease-in-out infinite}
@keyframes whg-next-breathe{0%,100%{opacity:.25;translate:0 -2px}50%{opacity:1;translate:0 1px}}
.whg-gal-say{margin:2px 0 0;gap:12px;max-width:min(680px,80%)}
.whg-gal-say-input{padding:7px 0;border:0;border-bottom:1px solid rgba(255,255,255,.19);border-radius:0;background:transparent;color:#e5dfd2;font-size:12px;line-height:1.5}
.whg-gal-say-input:focus{border-color:var(--gal-accent)}
.whg-gal-say-input::placeholder{color:rgba(220,217,207,.45)}
.whg-gal-say-send{padding:7px 8px;background:none;border:0;border-bottom:1px solid rgba(215,181,122,.4);border-radius:0;color:var(--gal-accent);font-size:11px}
.whg-gal-clock{position:absolute;left:6cqw;bottom:19px;align-self:auto;padding:0;border:0;border-radius:0;background:none;font:10px/1.5 var(--gal-serif);letter-spacing:.14em;color:#b9b0a2}
.whg-gal-hint{right:6cqw;bottom:46px;font-size:9px;color:#b9b4a68a;pointer-events:none}
.whg-gal-tools{top:auto;right:28px;bottom:14px;gap:20px;flex-wrap:wrap;justify-content:flex-end;max-width:80%}
.whg-gal-tools .whg-tool{padding:4px 0;background:none;border:0;border-bottom:1px solid transparent;border-radius:0;color:rgba(255,255,255,.56);font-size:10px;line-height:1.4;letter-spacing:.15em;transition:color 160ms var(--gal-ease),border-color 160ms var(--gal-ease)}
.whg-gal-tools .whg-tool:hover,.whg-gal-tools .whg-tool.is-on{background:none;color:#f5e8cd;border-color:rgba(215,181,122,.7)}
.whg-gal-choices{bottom:calc(var(--gal-box-height,29%) + 24px);width:min(58%,640px);gap:10px;max-height:55%;overflow:auto;scrollbar-width:thin}
.whg-gal-choice{min-height:52px;flex-direction:row;align-items:center;gap:18px;padding:13px 24px;border:0;border-top:1px solid rgba(255,255,255,.16);border-left:3px solid #b59a6d;border-radius:0;background:rgba(8,12,20,.78);transition:padding 160ms var(--gal-ease),background 160ms var(--gal-ease),border-color 160ms var(--gal-ease)}
.whg-gal-choice:hover{padding-left:32px;transform:none;background:rgba(8,12,20,.94);border-left-color:#f3d79c}
.whg-gal-choice-label{font:15px/1.7 var(--gal-serif);letter-spacing:.04em}
.whg-gal-choice-tag{min-width:2.5em;color:#c3aa7b;font-size:9px;font-weight:400;letter-spacing:.1em}
.whg-gal-title-bg{position:absolute;inset:0;background-size:cover;background-position:center}
.whg-gal--paper{background:#09111b}
.whg-gal-hero{left:40%;right:0;top:1%;bottom:-17%;z-index:1;background-size:contain;background-repeat:no-repeat;background-position:70% bottom;background-color:transparent}
.whg-gal-hero-seam{inset:0;z-index:2;background:linear-gradient(90deg,rgba(7,16,27,.96) 0%,rgba(7,16,27,.85) 27%,rgba(7,16,27,.4) 48%,transparent 73%)}
.whg-gal-paper{left:6.5%;top:9%;bottom:126px;width:40%;min-width:0;padding:0;z-index:3;gap:11px;background:none;box-shadow:none;overflow:auto;scrollbar-width:thin}
.whg-gal-paper-kicker{color:#cab48d;font-size:9px;letter-spacing:.26em}
.whg-gal-paper-title{font:400 clamp(30px,4.1cqw,62px)/1.4 var(--gal-serif);letter-spacing:.16em;color:#f0e9dc;margin:7px 0}
.whg-gal-paper-sub{font-size:9px;letter-spacing:.27em;color:#b5afa2}
.whg-gal-paper-rule{height:1px;flex-shrink:0;width:65%;background:linear-gradient(90deg,#d7b57a80,transparent);margin:10px 0 13px}
.whg-gal-paper-primary{display:flex;align-items:center;justify-content:space-between;width:80%;padding:13px 0;border:0;border-top:1px solid #d7b57a70;border-bottom:1px solid #d7b57a70;border-radius:0;background:none;box-shadow:none;color:#ecd4a8;font:16px/1.5 var(--gal-serif);letter-spacing:.24em;transition:padding 180ms var(--gal-ease)}
.whg-gal-paper-primary:after{content:"→";font-size:22px}
.whg-gal-paper-primary:hover:not(:disabled){filter:none;padding-left:7px}
.whg-gal-paper-row{width:85%;gap:14px}
.whg-gal-paper-btn{position:relative;flex:1;padding:7px 0;border:0;border-radius:0;background:none;color:#c4bdb0;font-size:11px;letter-spacing:.12em;text-align:left;transition:color 160ms var(--gal-ease),padding 160ms var(--gal-ease)}
.whg-gal-paper-btn:hover:not(:disabled){background:none;color:#fff0d1;padding-left:10px}
.whg-gal-paper-btn:hover:not(:disabled):before{content:"◆";position:absolute;left:0;top:10px;font-size:6px;color:var(--gal-accent)}
.whg-gal-paper-free{padding:7px 0;border:0;border-radius:0;background:none;color:#c5ab82;font-size:11px;letter-spacing:.06em;text-align:left}
.whg-gal-paper-free:hover:not(:disabled){background:none;color:#f8e6c5}
.whg-gal-paper-grid{width:85%;gap:0 16px;padding-top:4px}
.whg-gal-paper-foot{margin-top:auto;padding-top:14px;justify-content:flex-start;gap:28px;color:#8c918f;font-size:10px}
.whg-gal-paper-link{color:#c8b591;letter-spacing:.12em;text-decoration:none}
.whg-gal-hero-strip{z-index:4;height:96px;gap:12px;padding:0 6.5% 17px;align-items:flex-end;background:linear-gradient(transparent,rgba(7,16,27,.88));scrollbar-width:thin;scrollbar-color:#ffffff30 transparent}
.whg-gal-strip-face{width:42px;height:56px;flex-shrink:0;border:0;border-bottom:1px solid transparent;border-radius:0;background-color:transparent;background-size:cover;filter:brightness(.65) saturate(.85)}
.whg-gal-strip-face:hover,.whg-gal-strip-face.is-current{border-color:var(--gal-accent);filter:none;transform:translateY(-2px)}
.whg-gal-hero-name{z-index:3;right:5%;bottom:124px;font:clamp(18px,2cqw,30px)/1.5 var(--gal-serif);letter-spacing:.24em;color:#f0e7d8;text-shadow:0 2px 12px #000}
.whg-gal-panel{z-index:20;background:rgba(4,8,14,.79)}
.whg-gal-panel-card{width:min(640px,90%);max-height:84%;padding:25px 28px;border:0;border-top:1px solid var(--gal-line);border-bottom:1px solid var(--gal-line);border-radius:0;background:rgba(10,14,21,.97);scrollbar-width:thin;scrollbar-color:#ffffff30 transparent;box-shadow:0 25px 70px #0005}
.whg-gal-panel-head{font-size:11px;letter-spacing:.16em;color:#d1bd96;border-color:var(--gal-line)}
.whg-gal-panel-card button{font-family:inherit}
.whg-gal-panel-card .whg-gal-slot,.whg-gal-panel-card .whg-catalog-row,.whg-gal-panel-card .whg-bond-row,.whg-gal-panel-card .whg-gal-ending-card{border-radius:0;background:rgba(255,255,255,.025);border-color:var(--gal-line)}
.whg-gal-panel-card .whg-gal-setting-chip{border-radius:0;background:none;border-color:var(--gal-line);color:#c9c3b7}
.whg-gal-panel-card .whg-gal-setting-chip.is-on{background:rgba(215,181,122,.1);color:#e5c994;border-color:#d7b57a70}
.whg-gal-panel-card .whg-gal-ending-thumb{border-radius:0}
.whg-gal-ending{z-index:3;align-items:flex-start;text-align:left;padding:0 7%;gap:35px;background:linear-gradient(90deg,rgba(5,10,17,.82),rgba(5,10,17,.38) 40%,transparent 70%)}
.whg-gal-ending-text{max-width:48%;padding:0;border-radius:0;background:none}
.whg-gal-ending .whg-gal-title-sub{font-size:10px;letter-spacing:.4em;color:var(--gal-accent);margin-bottom:22px}
.whg-gal-ending h2{font:400 clamp(26px,3.3cqw,48px)/1.5 var(--gal-serif);letter-spacing:.18em;margin:0 0 20px}
.whg-gal-ending p{font:14px/2 var(--gal-serif);color:#d3ccbf;max-width:28em}
.whg-gal-ending .whg-gal-menu{position:static;transform:none;width:auto;max-width:45%;flex-direction:row;flex-wrap:wrap;gap:10px 24px}
.whg-gal-ending .whg-gal-menu button{padding:8px 0;border:0;border-bottom:1px solid #d7b57a60;border-radius:0;background:none;font-size:11px;letter-spacing:.12em;color:#d6c5a9}
.whg-gal button:focus-visible{outline:1px solid var(--gal-accent);outline-offset:4px}
@container whg (max-width:900px){.whg-gal-paper{left:6%;width:47%;top:8%;bottom:110px;gap:9px}.whg-gal-paper-title{font-size:5.5cqw}.whg-gal-hero{left:35%;right:-13%}.whg-gal-paper-primary{font-size:15px;width:90%}.whg-gal-paper-grid,.whg-gal-paper-row{width:95%}.whg-gal-paper-btn{font-size:10px}.whg-gal-choices{width:84%}.whg-gal-box{left:0;right:0;min-height:29%;padding:29px 6cqw 78px}.whg-gal-say{max-width:92%}.whg-gal-tools{top:auto;bottom:14px;right:24px;gap:18px}.whg-gal-tools .whg-tool{padding:4px 0;font-size:10px}.whg-gal-clock{bottom:44px}.whg-gal-hint{bottom:44px;font-size:8px}.whg-gal-ending-text{max-width:60%}}
@container whg (max-width:620px){.whg-gal-paper{width:59%;top:7%;gap:8px;bottom:100px}.whg-gal-paper-title{font-size:7.4cqw;line-height:1.5}.whg-gal-paper-kicker{font-size:8px}.whg-gal-paper-sub{font-size:8px;letter-spacing:.13em}.whg-gal-paper-rule{margin:6px 0}.whg-gal-hero{left:30%;right:-35%;bottom:-6%;top:6%;background-position:70% bottom;opacity:.82}.whg-gal-hero-seam{background:linear-gradient(90deg,#07101bf2,#07101b80 64%,transparent)}.whg-gal-paper-primary{font-size:14px;padding:11px 0}.whg-gal-paper-free{font-size:10px;line-height:1.8}.whg-gal-paper-row{gap:10px}.whg-gal-paper-grid{gap:0 8px}.whg-gal-paper-btn{font-size:10px;letter-spacing:.02em}.whg-gal-paper-foot{gap:16px;font-size:9px}.whg-gal-hero-name{font-size:17px;bottom:104px;right:6%}.whg-gal-hero-strip{height:84px;gap:9px;padding:0 6% 14px}.whg-gal-strip-face{width:35px;height:46px}.whg-gal-actor{height:103%;bottom:-8%}.whg-gal-box{min-height:30%;padding:28px 6cqw 81px}.whg-gal-text{font-size:15px;line-height:2}.whg-gal-speaker{font-size:12px}.whg-gal-say{max-width:94%;gap:8px}.whg-gal-say-input{font-size:11px}.whg-gal-tools{max-width:calc(100% - 36px);right:18px;left:18px;gap:17px;bottom:13px}.whg-gal-tools .whg-tool{font-size:9px;letter-spacing:.08em}.whg-gal-choices{width:90%}.whg-gal-choice{padding:11px 17px;min-height:48px;gap:12px}.whg-gal-choice-label{font-size:13px}.whg-gal-panel-card{width:92%;padding:20px;max-height:88%}.whg-gal-ending{justify-content:flex-end;padding:0 7% 12%;background:linear-gradient(0deg,#050a11f0,#050a1190 53%,transparent)}.whg-gal-ending-text{max-width:100%}.whg-gal-ending .whg-gal-menu{max-width:100%}.whg-gal--ending .whg-gal-bg{background-position:68% center}}
@container whg (max-width:620px){.whg-gal-actor.is-quiet{z-index:1}.whg-gal-actor.is-speaking{z-index:2}.whg-gal-cast[data-narration="true"] .whg-gal-actor:nth-child(2){z-index:3}}
@media(prefers-reduced-motion:reduce){.whg-gal *{animation:none!important;transition:none!important}}
`
