import {FolioCard} from './folio-ui'
import {CastPanel} from './cast-panel'
import {SignalGame} from './signal-game'
import {DirectedReading,DIRECTED_CSS} from './directed-reading'
import {WorldJournal} from './world-journal'
/**
 * dsh-whale-galgame — browser client half.
 * Q版桌宠 is the default form on the main UI; clicking it opens the
 * fullscreen one-line-per-screen visual novel. The heroine follows the
 * main UI's current model; three dialogue options are generated after
 * every reply; level-up CG rewards pop as modals and may be saved inside
 * the galgame scene without changing the workspace background.
 */
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { WHALE_ART } from './art.generated'
import { ATELIER_CSS } from './atelier.css'
import { SceneEditor } from './scene-editor'
import { SceneCanvas } from './scene-canvas'
import { SCENE_EDITOR_CSS } from './scene-editor.css'
import { GalSystemsPanel } from './systems-panel'

const CSS = [
  // ── pet ────────────────────────────────────────────────────────────────
  '.whg-pet{--whg-scale:1.15;--whg-y:0px;position:fixed;right:18px;bottom:124px;width:calc(192px * var(--whg-scale));height:calc(208px * var(--whg-scale));padding:0;border:0;border-radius:18px;background:transparent;cursor:zoom-in;filter:drop-shadow(0 10px 16px rgb(0 0 0 / 36%));transition:width 180ms ease,height 180ms ease,filter 180ms ease;z-index:9999}',
  '.whg-pet[data-mode="running"]{--whg-y:-1456px}',
  '.whg-pet[data-mode="waiting"]{--whg-y:-1248px}',
  '.whg-pet-sprite{display:block;width:192px;height:208px;background-repeat:no-repeat;background-size:1536px 2288px;background-position:0 var(--whg-y);transform:scale(var(--whg-scale));transform-origin:left top;animation:whgPetFrames 1.7s step-end infinite}',
  '.whg-pet[data-mode="running"] .whg-pet-sprite{animation-duration:900ms}',
  '.whg-pet[data-mode="waiting"] .whg-pet-sprite{animation-duration:1.35s}',
  '.whg-pet[data-looking="true"] .whg-pet-sprite{animation:none;background-position:var(--whg-look-x) var(--whg-look-y)}',
  '@keyframes whgPetFrames{0%,16.66%{background-position:0 var(--whg-y)}16.67%,33.32%{background-position:-192px var(--whg-y)}33.33%,49.99%{background-position:-384px var(--whg-y)}50%,66.65%{background-position:-576px var(--whg-y)}66.66%,83.32%{background-position:-768px var(--whg-y)}83.33%,99.99%{background-position:-960px var(--whg-y)}100%{background-position:0 var(--whg-y)}}',
  '.whg-pet-status{position:absolute;right:8px;bottom:-28px;max-width:184px;overflow:hidden;padding:5px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;color:var(--dsw-alias-text-secondary);background:color-mix(in srgb,var(--dsw-alias-bg-base) 88%,transparent);font:12px/1.2 system-ui,sans-serif;text-overflow:ellipsis;white-space:nowrap;opacity:0;transform:translateY(4px);transition:opacity 150ms ease,transform 150ms ease;pointer-events:none}',
  '.whg-pet:hover .whg-pet-status,.whg-pet:focus-visible .whg-pet-status{opacity:1;transform:translateY(0)}',
  '.whg-pet:focus-visible{outline:2px solid var(--dsw-alias-border-l3);outline-offset:4px}',
  '@media (max-width:760px){.whg-pet{--whg-scale:.9;right:8px;bottom:106px}}',
  '@media (prefers-reduced-motion:reduce){.whg-pet-sprite{animation:none}}',
  // ── fullscreen VN ──────────────────────────────────────────────────────
  '.whg-root{container-type:inline-size;container-name:whg;position:fixed;inset:0;z-index:8000;font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif;user-select:none;pointer-events:auto;overflow:hidden;background:#050b18;color:#eaf5ff}',
  '.whg-root-tab{container-type:inline-size;container-name:whg;position:relative;flex:1 1 0;width:100%;height:100%;min-height:0;box-sizing:border-box;z-index:auto;font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif;user-select:none;overflow:hidden;background:#050b18;color:#eaf5ff;border:0;border-radius:0}',
  '.whg-root-tab .whg-sprite-wrap{height:88vh;margin-bottom:0}',
  '.whg-root-tab .whg-dialogue-wrap{bottom:0}',
  '.whg-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.94)}',
  '.whg-bg-fallback{background:linear-gradient(180deg,#0a1e3d,#06203f)}',
  '.whg-vignette{position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,8,20,.4) 0%,rgba(3,8,20,0) 28%,rgba(3,8,20,0) 55%,rgba(3,8,20,.82) 100%);pointer-events:none}',
  '.whg-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:10px;padding:14px 20px;z-index:5}',
  '.whg-title{font-size:17px;font-weight:800;letter-spacing:1px;color:#dcecff;text-shadow:0 2px 12px rgba(0,20,60,.9)}',
  '.whg-chip-wrap{position:relative;display:flex;min-width:0}',
  '.whg-chip{display:flex;align-items:center;gap:6px;min-width:0;white-space:nowrap;font-size:11px;color:#bcd6f2;background:rgba(6,18,38,.55);border:1px solid rgba(140,200,255,.25);border-radius:999px;padding:4px 10px;font-family:inherit}',
  '.whg-chip-button{appearance:none;cursor:pointer;text-align:left;transition:border-color .16s ease,background .16s ease}',
  '.whg-chip-button:hover,.whg-chip-button[aria-expanded="true"]{border-color:rgba(159,232,255,.58);background:rgba(16,49,72,.82)}',
  '.whg-chip-button:focus-visible{outline:2px solid #9fe8ff;outline-offset:2px}',
  '.whg-chip strong{max-width:170px;overflow:hidden;color:#eff9ff;font-weight:700;text-overflow:ellipsis}',
  '.whg-chip-caret{color:#8bc8da;font-size:9px;transition:transform .16s ease}',
  '.whg-chip-button[aria-expanded="true"] .whg-chip-caret{transform:rotate(180deg)}',
  '.whg-dot{width:7px;height:7px;border-radius:50%;background:#46d98a;box-shadow:0 0 8px #46d98a}',
  '.whg-dot.off{background:#8aa0bd;box-shadow:none}',
  '.whg-spacer{flex:1}',
  '.whg-top-actions{display:flex;align-items:center;gap:8px}',
  '.whg-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);color:#cfe6ff;border-radius:10px;padding:6px 12px;font-size:13px;cursor:pointer;line-height:1.3;font-family:inherit}',
  '.whg-btn:hover{background:rgba(255,255,255,.18)}',
  '.whg-btn:focus-visible,.whg-choice:focus-visible,.whg-cg-btn:focus-visible{outline:2px solid #9fe8ff;outline-offset:2px}',
  '.whg-btn[aria-pressed="true"]{border-color:rgba(126,222,244,.62);background:rgba(68,164,198,.24);color:#effcff}',
  '.whg-count{display:inline-grid;place-items:center;min-width:16px;height:16px;margin-left:5px;padding:0 4px;border-radius:999px;background:rgba(143,216,239,.18);color:#dff8ff;font:700 10px/1 Consolas,monospace}',
  '.whg-btn:disabled{opacity:.45;cursor:default}',
  '.whg-btn.back{background:linear-gradient(135deg,#2f7fd6,#7a5fd6);border:none;color:#fff;font-weight:700;padding:8px 16px;font-size:14px}',
  '.whg-picker{position:absolute;top:calc(100% + 8px);left:0;z-index:18;width:min(330px,calc(100vw - 28px));max-height:min(430px,70vh);overflow:auto;padding:7px;border:1px solid rgba(215,182,108,.48);border-radius:14px;background:linear-gradient(180deg,rgba(7,30,45,.985),rgba(3,17,31,.995));box-shadow:0 20px 55px rgba(0,5,16,.72);scrollbar-color:rgba(143,216,239,.45) transparent}',
  '.whg-picker.right{right:0;left:auto}',
  '.whg-picker-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 9px 9px;color:#d7c48f;font:700 10px/1.3 Consolas,monospace;letter-spacing:1.4px}',
  '.whg-picker-note{padding:7px 9px;color:#8fb1c5;font-size:11px;line-height:1.55}',
  '.whg-picker-option{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;padding:9px 10px;border:0;border-radius:9px;background:transparent;color:#dff3ff;cursor:pointer;text-align:left;font-family:inherit}',
  '.whg-picker-option:hover,.whg-picker-option:focus-visible{background:rgba(143,216,239,.12);outline:none}',
  '.whg-picker-option[aria-selected="true"]{background:linear-gradient(90deg,rgba(47,127,214,.28),rgba(215,182,108,.12));color:#fff}',
  '.whg-picker-option-main{display:block;overflow:hidden;font-size:12px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}',
  '.whg-picker-option-sub{display:block;overflow:hidden;margin-top:2px;color:#83a9bd;font:10px/1.35 Consolas,monospace;text-overflow:ellipsis;white-space:nowrap}',
  '.whg-picker-check{color:#f0d99d;font-size:12px}',
  '.whg-bg-picker{width:min(360px,calc(100vw - 28px));padding:12px}',
  '.whg-bg-preview{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;margin:2px 0 10px;border:1px solid rgba(143,216,239,.28);border-radius:10px;background:#020a14}',
  '.whg-bg-empty{display:grid;place-items:center;width:100%;aspect-ratio:16/9;margin:2px 0 10px;border:1px dashed rgba(143,216,239,.28);border-radius:10px;color:#7f9cae;font-size:11px;background:rgba(1,10,20,.25)}',
  '.whg-bg-builtins{margin:2px 0 12px;padding:10px;border:1px solid rgba(143,216,239,.18);border-radius:11px;background:rgba(1,10,20,.24)}',
  '.whg-bg-builtins-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;color:#dff3ff;font-size:11px;font-weight:700}',
  '.whg-bg-builtins-role{max-width:170px;overflow:hidden;color:#83a9bd;font:10px/1.3 Consolas,monospace;text-overflow:ellipsis;white-space:nowrap}',
  '.whg-bg-builtins-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
  '.whg-bg-builtin{position:relative;min-width:0;overflow:hidden;padding:0;border:1px solid rgba(143,216,239,.2);border-radius:9px;background:#041422;color:#dff3ff;cursor:pointer;text-align:left;font-family:inherit}',
  '.whg-bg-builtin:hover,.whg-bg-builtin:focus-visible{border-color:rgba(143,216,239,.58);outline:none}',
  '.whg-bg-builtin[aria-pressed="true"]{border-color:rgba(215,182,108,.72);box-shadow:0 0 0 1px rgba(215,182,108,.18)}',
  '.whg-bg-builtin:only-child{grid-column:1/-1}',
  '.whg-bg-builtin:disabled{opacity:.48;cursor:default}',
  '.whg-bg-builtin-img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#020a14}',
  '.whg-bg-builtin-fallback{display:grid;place-items:center;color:#607f91;font:10px/1.3 Consolas,monospace}',
  '.whg-bg-builtin-meta{display:flex;align-items:center;gap:5px;min-width:0;padding:7px 8px}',
  '.whg-bg-builtin-name{min-width:0;flex:1;overflow:hidden;font-size:11px;font-weight:700;text-overflow:ellipsis;white-space:nowrap}',
  '.whg-bg-builtin-tag{flex:none;color:#d7c48f;font:700 9px/1 Consolas,monospace}',
  '.whg-bg-override-note{margin:-3px 0 9px;padding:7px 9px;border-left:2px solid rgba(215,182,108,.52);background:rgba(215,182,108,.07);color:#b9a978;font-size:10px;line-height:1.5}',
  '.whg-bg-actions{display:flex;flex-wrap:wrap;gap:7px}',
  '.whg-bg-file{display:none}',
  '.whg-bg-error{margin:8px 1px 0;color:#ffb5bd;font-size:11px;line-height:1.5}',
  '.whg-sprite-picker{width:min(340px,calc(100vw - 28px));padding:12px}',
  // AI generation panel, shared by the sprite and background pickers.
  '.whg-gen{margin:2px 0 10px;padding:9px;border:1px solid rgba(215,182,108,.28);border-radius:11px;background:rgba(2,12,22,.42)}',
  '.whg-gal{position:fixed;inset:0;z-index:9000;background:#04080f;color:#eaf5ff;overflow:hidden;font-family:inherit}',
  '.whg-gal-bg{position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat}',
  '.whg-gal-veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,8,15,.72) 0%,rgba(4,8,15,.18) 26%,rgba(4,8,15,.06) 46%,rgba(4,8,15,.88) 100%)}',
  // ---- 纸质标题页 ----
  '.whg-gal--paper{background:#f3ece0}',
  '.whg-gal-hero{position:absolute;left:42%;right:0;top:0;bottom:0;background-size:cover;background-position:center 22%;background-color:#e8dfd0;transition:background-image .2s ease}',
  '.whg-gal-hero-seam{position:absolute;left:36%;right:40%;top:0;bottom:0;background:linear-gradient(90deg,#f3ece0 0%,rgba(243,236,224,.85) 45%,rgba(243,236,224,0) 100%);pointer-events:none}',
  '.whg-gal-hero-name{position:absolute;right:26px;bottom:132px;font-family:"Songti SC","STSong",serif;font-size:clamp(20px,2.2cqw,30px);letter-spacing:.2em;color:#fff;text-shadow:0 2px 16px rgba(60,30,20,.75)}',
  '.whg-gal-hero-strip{position:absolute;left:0;right:0;bottom:0;height:112px;display:flex;gap:6px;align-items:flex-end;padding:0 12px 10px;overflow-x:auto;background:linear-gradient(180deg,rgba(243,236,224,0),rgba(238,229,214,.96) 55%)}',
  '.whg-gal-strip-face{flex:0 0 auto;width:58px;height:76px;border-radius:9px;border:2px solid transparent;background-size:cover;background-position:center top;background-color:#e3d8c8;cursor:pointer;transition:transform .12s ease,border-color .12s ease;appearance:none;padding:0}',
  '.whg-gal-strip-face:hover{transform:translateY(-3px)}',
  '.whg-gal-strip-face.is-current{border-color:#b8627d;transform:translateY(-4px)}',
  '.whg-gal-paper{position:absolute;left:0;top:0;bottom:112px;width:44%;min-width:340px;padding:clamp(70px,8.4vh,86px) clamp(20px,2.6cqw,34px) clamp(20px,3.2vh,38px);display:flex;flex-direction:column;gap:12px;background:linear-gradient(160deg,#faf4e8 0%,#f2e8d8 100%);box-shadow:inset -18px 0 36px -22px rgba(120,90,60,.2)}',
  '.whg-gal-paper-kicker{font-size:11px;letter-spacing:.34em;color:#9c8a76}',
  '.whg-gal-paper-title{font-family:"Songti SC","STSong",serif;font-size:clamp(26px,3.4cqw,40px);letter-spacing:.14em;color:#33291f;line-height:1.2}',
  '.whg-gal-paper-sub{font-size:10.5px;letter-spacing:.3em;color:#a8967f}',
  '.whg-gal-paper-rule{height:1px;background:linear-gradient(90deg,rgba(150,120,90,.45),rgba(150,120,90,0));margin:2px 0 6px}',
  '.whg-gal-paper-primary{appearance:none;padding:13px 22px;border-radius:10px;border:1px solid #a8516b;background:linear-gradient(180deg,#c0687f,#a8516b);color:#fff;font-family:inherit;font-size:16px;letter-spacing:.24em;cursor:pointer;box-shadow:0 8px 20px -10px rgba(120,50,70,.8)}',
  '.whg-gal-paper-primary:hover:not(:disabled){filter:brightness(1.06)}',
  '.whg-gal-paper-primary:disabled{opacity:.5;cursor:default}',
  '.whg-gal-paper-row{display:flex;gap:8px}',
  '.whg-gal-paper-btn{flex:1;appearance:none;padding:9px 10px;border-radius:9px;border:1px solid rgba(150,120,90,.42);background:rgba(255,252,246,.85);color:#4a3f33;font-family:inherit;font-size:12.5px;letter-spacing:.06em;cursor:pointer;transition:background .12s ease,border-color .12s ease}',
  '.whg-gal-paper-btn:hover:not(:disabled){background:#fff;border-color:rgba(180,100,130,.6)}',
  '.whg-gal-paper-btn:disabled{opacity:.45;cursor:default}',
  '.whg-gal-paper-free{appearance:none;padding:11px 16px;border-radius:9px;border:1px dashed rgba(168,81,107,.55);background:rgba(255,250,244,.7);color:#a8516b;font-family:inherit;font-size:13px;letter-spacing:.08em;cursor:pointer}',
  '.whg-gal-paper-free:hover:not(:disabled){background:#fff}',
  '.whg-gal-paper-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
  '.whg-gal-paper-foot{display:flex;align-items:center;justify-content:space-between;margin-top:auto;font-size:11px;letter-spacing:.1em;color:#9c8a76}',
  '.whg-gal-paper-link{cursor:pointer;text-decoration:underline}',
  // ---- 剧情树 / 故事目录 ----
  '.whg-tree-chapter{margin-bottom:12px}',
  '.whg-tree-chapter-head{display:flex;align-items:baseline;justify-content:space-between;color:#e8cf94;font-size:12px;letter-spacing:.06em}',
  '.whg-tree-chapter-head span{color:#7f9db3;font-size:11px}',
  '.whg-tree-bar{height:3px;border-radius:999px;background:rgba(255,255,255,.08);margin:5px 0 7px;overflow:hidden}',
  '.whg-tree-bar span{display:block;height:100%;background:linear-gradient(90deg,#7fb6ff,#e8cf94)}',
  '.whg-tree-nodes{display:flex;flex-direction:column;gap:3px;max-height:180px;overflow:auto}',
  '.whg-tree-node{display:flex;align-items:center;gap:7px;font-size:11.5px;color:#6f8395}',
  '.whg-tree-node.is-seen{color:#dceaf7}',
  '.whg-tree-node.is-choice{color:#e8cf94}',
  '.whg-tree-dot{width:6px;height:6px;border-radius:50%;border:1px solid currentColor;flex:0 0 auto}',
  '.whg-tree-node.is-seen .whg-tree-dot{background:currentColor}',
  '.whg-tree-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.whg-tree-routes{margin-top:14px;padding-top:12px;border-top:1px solid rgba(143,216,239,.15);color:#cfe6f8;font-size:12px}',
  '.whg-tree-route-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:8px}',
  '.whg-tree-route{font-size:11px;color:#6f8395;padding:4px 6px;border-radius:6px;background:rgba(6,18,34,.6)}',
  '.whg-tree-route.is-seen{color:#dceaf7}',
  '.whg-catalog-row{display:flex;flex-direction:column;gap:3px;text-align:left;appearance:none;padding:9px 12px;margin-bottom:7px;border-radius:9px;border:1px solid rgba(143,216,239,.18);background:rgba(6,18,34,.7);color:#cfe6f8;font-family:inherit;cursor:pointer;font-size:12px}',
  '.whg-catalog-row b{color:#e8cf94;font-size:12px;letter-spacing:.05em}',
  '.whg-catalog-row span{color:#7f9db3;font-size:11px}',
  '.whg-catalog-row:hover:not(:disabled){border-color:rgba(159,232,255,.5)}',
  '.whg-catalog-row:disabled{opacity:.45;cursor:default}',
  '.whg-gal-cast{position:absolute;inset:0;pointer-events:none}',
  '.whg-gal-actor{position:absolute;bottom:16%;height:80%;object-fit:contain;object-position:bottom center;transform-origin:bottom center;filter:drop-shadow(0 18px 40px rgba(0,4,12,.65));transition:filter .25s ease,opacity .3s ease}',
  '.whg-gal-enter-fade{animation:whg-enter-fade .45s ease both}',
  '.whg-gal-enter-left{animation:whg-enter-left .5s cubic-bezier(.2,.8,.25,1) both}',
  '.whg-gal-enter-right{animation:whg-enter-right .5s cubic-bezier(.2,.8,.25,1) both}',
  '.whg-gal-enter-up{animation:whg-enter-up .5s cubic-bezier(.2,.8,.25,1) both}',
  '@keyframes whg-enter-fade{from{opacity:0}to{opacity:1}}',
  '@keyframes whg-enter-left{from{opacity:0;margin-left:-14%}to{opacity:1;margin-left:0}}',
  '@keyframes whg-enter-right{from{opacity:0;margin-left:14%}to{opacity:1;margin-left:0}}',
  '@keyframes whg-enter-up{from{opacity:0;margin-bottom:-8%}to{opacity:1;margin-bottom:0}}',
  '.whg-gal-actor.is-quiet{filter:brightness(.62) saturate(.85) drop-shadow(0 12px 30px rgba(0,4,12,.6));opacity:.9}',
  '.whg-gal-actor.is-speaking{filter:brightness(1) drop-shadow(0 20px 44px rgba(0,4,12,.7))}',
  '.whg-gal-bg{animation:whg-bg-in .5s ease both}',
  '@keyframes whg-bg-in{from{opacity:.25}to{opacity:1}}',
  '.whg-fx-shake{animation:whg-shake .45s ease both}',
  '@keyframes whg-shake{0%,100%{transform:translate(0,0)}20%{transform:translate(-7px,3px)}40%{transform:translate(6px,-4px)}60%{transform:translate(-4px,2px)}80%{transform:translate(3px,-1px)}}',
  '.whg-fx-flash::after{content:"";position:absolute;inset:0;background:#fff;pointer-events:none;animation:whg-flash .45s ease both}',
  '@keyframes whg-flash{0%{opacity:.85}100%{opacity:0}}',
  '.whg-fx-fade .whg-gal-bg{animation:whg-fade .7s ease both}',
  '@keyframes whg-fade{from{opacity:0}to{opacity:1}}',
  '.whg-gal-sprite{position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:92%;max-height:92%;filter:drop-shadow(0 18px 50px rgba(0,6,16,.7))}',
  '.whg-gal-title-wrap{position:absolute;left:0;right:0;top:4%;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:26px 6vw 40px;background:linear-gradient(180deg,rgba(3,8,16,.82) 0%,rgba(3,8,16,.55) 55%,rgba(3,8,16,0) 100%)}',
  '.whg-gal-title-main{font-size:clamp(20px,4.8cqw,52px);font-weight:800;letter-spacing:.12em;text-shadow:0 6px 40px rgba(0,10,30,.85);color:#f2f8ff}',
  '.whg-gal-title-sub{font-size:clamp(10px,1.5cqw,16px);letter-spacing:.4em;color:#d6ecfb;text-shadow:0 2px 14px rgba(0,8,20,.95),0 0 3px rgba(0,8,20,.9)}',
  '.whg-gal-roles{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(13% + 268px);display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:5px;width:min(940px,88%);z-index:3}',
  '.whg-gal-role{appearance:none;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 3px 5px;border-radius:9px;border:1px solid rgba(143,216,239,.24);background:rgba(6,16,30,.72);color:#cfe6f8;font-family:inherit;font-size:11px;letter-spacing:.02em;cursor:pointer;overflow:hidden;transition:border-color .15s ease,background .15s ease,transform .12s ease}',
  '.whg-gal-role:hover{transform:translateY(-1px)}',
  '.whg-gal-role-face{width:100%;aspect-ratio:5/4;border-radius:6px;background-size:cover;background-position:center top;background-color:rgba(14,26,42,.9)}',
  '.whg-gal-role-name{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.whg-gal-role:hover{border-color:rgba(232,203,138,.9);background:rgba(18,40,66,.9)}',
  '.whg-gal-role.is-current{border-color:rgba(232,203,138,.95);color:#ffe9b0;background:rgba(46,36,14,.8)}',
  '.whg-gal-role-label{display:none}',
  '.whg-gal-menu{position:absolute;left:50%;bottom:13%;transform:translateX(-50%);display:flex;flex-direction:column;gap:10px;width:min(320px,72%)}',
  '.whg-gal-menu button{appearance:none;padding:9px 18px;border-radius:10px;border:1px solid rgba(215,182,108,.5);background:linear-gradient(180deg,rgba(14,32,54,.9),rgba(6,16,30,.94));color:#e9f4ff;font-family:inherit;font-size:13.5px;letter-spacing:.12em;cursor:pointer;transition:border-color .16s ease,transform .12s ease}',
  '.whg-gal-menu button:hover:not(:disabled){border-color:rgba(232,203,138,.95);transform:translateY(-1px)}',
  '.whg-gal-menu button:disabled{opacity:.4;cursor:default}',
  '.whg-gal-menu button.ghost{background:rgba(6,16,30,.6);font-size:13px;letter-spacing:.1em}',
  '.whg-gal-box{position:absolute;left:4%;right:4%;bottom:3vh;z-index:6;padding:clamp(14px,2.4vh,26px) clamp(14px,2.6cqw,34px);border-radius:16px;border:1px solid rgba(215,182,108,.55);background:linear-gradient(180deg,rgba(10,26,46,.94),rgba(4,12,24,.96));box-shadow:0 22px 60px rgba(0,6,16,.7);cursor:pointer;min-height:19vh;display:flex;flex-direction:column;gap:10px}',
  '.whg-gal-speaker{align-self:flex-start;padding:3px 16px;border-radius:999px;background:rgba(215,182,108,.16);border:1px solid rgba(215,182,108,.55);color:#ffe9b0;font-size:clamp(11px,1.2cqw,15px);font-weight:700;letter-spacing:.1em}',
  '.whg-gal-text{font-size:clamp(12px,1.55cqw,20px);line-height:1.9;color:#eef5ff;white-space:pre-wrap;word-break:break-word;min-height:2.6em}',
  '.whg-gal-narr{font-size:clamp(11px,1.3cqw,15px);line-height:1.8;color:#a8c4d8;letter-spacing:.02em}',
  '.whg-gal-caret{margin-left:2px;color:#cfe4ff;opacity:.8;animation:whg-blink 1s steps(2) infinite}',
  '.whg-gal-ending-card{display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:10px;border:1px solid rgba(143,216,239,.22);background:rgba(6,18,34,.8)}',
  '.whg-gal-ending-thumb{width:100%;aspect-ratio:16/9;border-radius:7px;background-size:cover;background-position:center;background-color:rgba(10,24,44,.9);filter:saturate(.95)}',
  '.whg-gal-ending-thumb.locked{filter:grayscale(1) brightness(.35)}',
  '.whg-gal-ending-cap{color:#e8cf94;font-size:11.5px;letter-spacing:.06em}',
  '.whg-gal-ending-note{color:#7f9db3;font-size:10.5px}',
  '.whg-gal-say{display:flex;gap:8px;align-items:center;margin-top:2px}',
  '.whg-gal-say-input{flex:1;min-width:0;appearance:none;padding:9px 14px;border-radius:999px;border:1px solid rgba(143,216,239,.35);background:rgba(4,12,24,.85);color:#e8f3ff;font-family:inherit;font-size:13px;outline:none}',
  '.whg-gal-say-input::placeholder{color:rgba(150,180,205,.55)}',
  '.whg-gal-say-input:focus{border-color:rgba(215,182,108,.8)}',
  '.whg-gal-say-send{appearance:none;padding:9px 18px;border-radius:999px;border:1px solid rgba(215,182,108,.65);background:linear-gradient(180deg,rgba(24,48,74,.95),rgba(8,20,36,.98));color:#ffe9b0;font-family:inherit;font-size:13px;letter-spacing:.1em;cursor:pointer}',
  '.whg-gal-say-send:disabled{opacity:.4;cursor:default}',
  '.whg-gal-clock{align-self:flex-start;font:700 11px/1 Consolas,monospace;letter-spacing:2px;color:#e8cf94;background:rgba(215,182,108,.12);border:1px solid rgba(215,182,108,.4);border-radius:999px;padding:4px 12px}',
  '.whg-bond-list{display:flex;flex-direction:column;gap:6px;max-height:62vh;overflow:auto}',
  '.whg-bond-row{display:grid;grid-template-columns:38px minmax(0,1fr);gap:9px;align-items:center;padding:6px 8px;border-radius:9px;background:rgba(6,18,34,.6);border:1px solid rgba(143,216,239,.12)}',
  '.whg-bond-row.is-open{border-color:rgba(215,182,108,.5);background:rgba(16,30,48,.75)}',
  '.whg-bond-face{width:38px;height:38px;border-radius:8px;background-size:cover;background-position:center top;background-color:rgba(14,26,42,.9)}',
  '.whg-bond-main{display:flex;flex-direction:column;gap:3px;min-width:0}',
  '.whg-bond-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px}',
  '.whg-bond-stage{color:#e8cf94;font-size:11px;letter-spacing:.06em}',
  '.whg-bond-bar{height:4px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}',
  '.whg-bond-bar span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#7fb6ff,#e8cf94)}',
  '.whg-bond-note{color:#7f9db3;font-size:10.5px}',
  '.whg-gal-setting-row{display:flex;flex-direction:column;gap:7px;padding:11px 0;border-bottom:1px solid rgba(143,216,239,.12)}',
  '.whg-gal-setting-label{display:flex;align-items:baseline;gap:9px}',
  '.whg-gal-setting-label b{color:#e8cf94;font-size:12.5px;letter-spacing:.06em}',
  '.whg-gal-setting-label span{color:#7f9db3;font-size:11px}',
  '.whg-gal-setting-options{display:flex;gap:6px;flex-wrap:wrap}',
  '.whg-gal-setting-chip{appearance:none;padding:6px 13px;border-radius:999px;border:1px solid rgba(143,216,239,.28);background:rgba(6,18,34,.8);color:#cfe6f8;font-family:inherit;font-size:12px;cursor:pointer}',
  '.whg-gal-setting-chip.is-on{border-color:rgba(215,182,108,.85);background:rgba(215,182,108,.16);color:#ffe9b0}',
  '.whg-gal-panel-close{appearance:none;background:none;border:0;color:#8fb0c6;font-family:inherit;font-size:11px;letter-spacing:.1em;cursor:pointer}',
  '.whg-gal-hint{position:absolute;right:18px;bottom:10px;font-size:11px;color:rgba(180,210,235,.6);letter-spacing:.1em}',
  '.whg-gal-choices{position:absolute;left:50%;bottom:calc(3vh + 19vh + 26px);transform:translateX(-50%);z-index:7;display:flex;flex-direction:column;gap:9px;width:min(62%,560px)}',
  '.whg-gal-choice{display:flex;flex-direction:column;gap:3px;text-align:left;appearance:none;padding:11px 18px;border-radius:11px;border:1px solid rgba(215,182,108,.5);background:linear-gradient(180deg,rgba(16,38,62,.94),rgba(6,18,32,.96));color:#eaf4ff;font-family:inherit;cursor:pointer;transition:border-color .15s ease,transform .12s ease}',
  '.whg-gal-choice:hover{border-color:rgba(232,203,138,.95);transform:translateX(3px)}',
  '.whg-gal-choice-tag{font-size:10px;letter-spacing:.12em;color:rgba(230,200,128,.95);font-weight:700}',
  '.whg-gal-choice-label{font-size:clamp(12px,1.35cqw,16px)}',
  '.whg-gal-tools{position:absolute;right:4vw;top:16px;z-index:8;display:flex;gap:6px}',
  '.whg-gal-panel{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(3,8,16,.82);backdrop-filter:blur(3px)}',
  '.whg-gal-panel-card{width:min(560px,92vw);max-height:84vh;overflow:auto;padding:20px;border-radius:16px;border:1px solid rgba(143,216,239,.28);background:rgba(7,18,32,.98)}',
  '.whg-gal-panel-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px;color:#d7c48f;font:700 11px/1 Consolas,monospace;letter-spacing:1.4px}',
  '.whg-gal-slots{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
  '.whg-gal-slot{display:flex;flex-direction:column;gap:3px;text-align:left;appearance:none;padding:9px 12px;border-radius:10px;border:1px solid rgba(143,216,239,.22);background:rgba(6,18,34,.8);color:#cfe6f8;font-family:inherit;cursor:pointer;font-size:12px}',
  '.whg-gal-slot:hover:not(:disabled){border-color:rgba(159,232,255,.6)}',
  '.whg-gal-slot:disabled{opacity:.45;cursor:default}',
  '.whg-gal-slot b{color:#f0dfb4;font-size:11px;letter-spacing:.08em}',
  '.whg-gal-slot span{color:#7f9db3;font-size:10.5px}',
  '.whg-gal-log{display:flex;flex-direction:column;gap:9px}',
  '.whg-gal-log-row{display:flex;flex-direction:column;gap:2px;padding:7px 10px;border-radius:8px;background:rgba(6,18,34,.7);border-left:2px solid rgba(215,182,108,.5)}',
  '.whg-gal-log-row b{color:#e8cf94;font-size:11px;letter-spacing:.06em}',
  '.whg-gal-log-row span{color:#dceaf7;font-size:12.5px;line-height:1.6}',
  '.whg-gal-empty{color:#7f9db3;font-size:12px;text-align:center;padding:18px 0}',
  // 结局画面要整屏铺满，否则 CG 只覆盖上半部分，下面留一条黑。
  '.whg-gal.whg-gal--ending{position:absolute;inset:0;width:100%;height:100%}',
  '.whg-gal-ending{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:0 8vw}',
  // 标题和提示压在 CG 的高光上会糊，加一层居中暗底。
  '.whg-gal-ending-text{padding:22px 34px;border-radius:16px;background:radial-gradient(ellipse at center,rgba(3,8,16,.78) 0%,rgba(3,8,16,.45) 60%,rgba(3,8,16,0) 100%)}',
  '.whg-gal-ending h2{margin:0;font-size:clamp(20px,3.6cqw,40px);letter-spacing:.16em;color:#f4f9ff;text-shadow:0 2px 10px rgba(0,6,16,.95),0 6px 40px rgba(0,10,30,.9)}',
  '.whg-gal-ending p{margin:0;color:#d8e8f5;font-size:clamp(11px,1.3cqw,15px);line-height:1.8;text-shadow:0 2px 8px rgba(0,6,16,.95)}',
  '.whg-cg-cooking{position:absolute;top:64px;left:50%;transform:translateX(-50%);z-index:9;display:flex;align-items:center;gap:9px;padding:8px 16px;border-radius:999px;background:rgba(8,20,38,.9);border:1px solid rgba(215,182,108,.6);color:#f2e4be;font-size:13px;letter-spacing:.03em;box-shadow:0 10px 28px rgba(0,6,16,.6);pointer-events:none}',
  '.whg-cg-cooking b{color:#ffe9b0}',
  '.whg-cg-dot{width:8px;height:8px;border-radius:50%;background:#ffd479;animation:whg-pulse 1.1s ease-in-out infinite}',
  '@keyframes whg-pulse{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}',
  '.whg-gen-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;color:#d7b66c;font-size:10px;font-weight:700;letter-spacing:.06em}',
  '.whg-gen-state{font:10px/1.4 Consolas,monospace;color:#83a9bd;text-transform:none;letter-spacing:0}',
  '.whg-gen-input{display:block;width:100%;min-height:58px;max-height:120px;resize:vertical;padding:7px 8px;border:1px solid rgba(143,216,239,.24);border-radius:8px;background:#03101c;color:#dff3ff;font:11px/1.5 inherit;box-sizing:border-box}',
  '.whg-gen-input:focus-visible{outline:1px solid rgba(143,216,239,.6);outline-offset:-1px}',
  '.whg-gen-row{display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap}',
  '.whg-gen-note{color:#7f9cae;font-size:10px;line-height:1.5;margin-top:6px}',
  '.whg-gen-preview{display:block;width:100%;max-height:210px;object-fit:contain;margin-top:8px;border:1px solid rgba(143,216,239,.28);border-radius:9px;background-color:#061725}',
  '.whg-gen-error{color:#f0928a;font-size:10px;line-height:1.5;margin-top:6px}',
  '.whg-gen select{max-width:100%;padding:3px 5px;border:1px solid rgba(143,216,239,.24);border-radius:6px;background:#03101c;color:#dff3ff;font:10px/1.4 inherit}',
  '.whg-sprite-preview-shell{position:relative;display:grid;place-items:end center;width:100%;height:min(48vh,360px);overflow:hidden;margin:2px 0 10px;border:1px solid rgba(143,216,239,.28);border-radius:12px;background-color:#061725;background-image:linear-gradient(45deg,rgba(143,216,239,.055) 25%,transparent 25%),linear-gradient(-45deg,rgba(143,216,239,.055) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(143,216,239,.055) 75%),linear-gradient(-45deg,transparent 75%,rgba(143,216,239,.055) 75%);background-position:0 0,0 8px,8px -8px,-8px 0;background-size:16px 16px;box-shadow:inset 0 -45px 70px rgba(0,8,18,.34)}',
  '.whg-sprite-preview{display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 12px 24px rgba(0,8,24,.5))}',
  '.whg-sprite-custom{max-width:min(70vw,100%);object-fit:contain;object-position:center bottom}',
  // Built-in appearance chooser: a portrait grid of A/B/C/D, styled to match the
  // background picker's built-in grid so the two panels read as one idea.
  '.whg-sprite-variants{margin:2px 0 10px;padding:9px;border:1px solid rgba(143,216,239,.18);border-radius:11px;background:rgba(1,10,20,.24)}',
  '.whg-sprite-variants-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}',
  '.whg-sprite-variant{position:relative;min-width:0;overflow:hidden;padding:5px 4px 4px;border:1px solid rgba(143,216,239,.2);border-radius:9px;background:#041422;color:#dff3ff;cursor:pointer;text-align:left;font-family:inherit}',
  '.whg-sprite-variant:hover,.whg-sprite-variant:focus-visible{border-color:rgba(143,216,239,.58);outline:none}',
  '.whg-sprite-variant[aria-pressed="true"]{border-color:rgba(215,182,108,.72);box-shadow:0 0 0 1px rgba(215,182,108,.18)}',
  '.whg-sprite-variant:disabled{cursor:progress;opacity:.6}',
  '.whg-sprite-variant-badge{position:absolute;top:5px;left:5px;z-index:1;min-width:14px;padding:0 4px;border-radius:5px;background:rgba(4,18,32,.82);color:#d7b66c;font:700 9px/14px Consolas,monospace;text-align:center}',
  '.whg-sprite-variant-img{display:block;width:100%;height:78px;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 5px 10px rgba(0,8,24,.45))}',
  '.whg-sprite-variant .whg-bg-builtin-meta{padding:3px 1px 0}',
  '.whg-sprite-variant .whg-bg-builtin-name{font-size:9px;line-height:1.25;white-space:normal;word-break:break-word}',
  '.whg-sprite-variant .whg-bg-builtin-tag{font-size:8px}',
  '.whg-stage{position:absolute;inset:0;z-index:2;pointer-events:none;display:flex;align-items:flex-end;justify-content:center}',
  '.whg-tint{position:absolute;inset:0}',
  '.whg-sprite-wrap{position:relative;margin-right:0;margin-bottom:0;height:96vh;display:flex;align-items:flex-end;transform:translateY(clamp(56px,12vh,96px)) scale(1.1);transform-origin:center top}',
  '.whg-sprite{height:100%;width:auto;display:block;filter:drop-shadow(0 18px 40px rgba(0,10,30,.65));transition:filter .5s ease}',
  // Side-story stage: two or three cast slots share the floor line. The speaker
  // keeps full brightness while the rest step back, reusing the same filter
  // idiom as the single-character mood tints above.
  '.whg-cast{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:space-around;gap:2%;padding:0 3%;pointer-events:none}',
  '.whg-cast-slot{position:relative;display:flex;align-items:flex-end;height:82vh;max-width:38%;transition:filter .35s ease,transform .35s ease,opacity .35s ease}',
  '.whg-cast-slot img{height:100%;width:auto;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 18px 40px rgba(0,10,30,.65))}',
  '.whg-cast-slot[data-active="false"]{filter:brightness(.5) saturate(.75);transform:scale(.92) translateY(2%);opacity:.85}',
  '.whg-cast-slot[data-active="true"]{filter:none;transform:scale(1)}',
  '.whg-cast-slot[data-lead="true"]{height:88vh;z-index:1}',
  '.whg-cast-name{position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);padding:2px 10px;border-radius:10px;background:rgba(6,18,38,.72);font-size:12px;white-space:nowrap}',
  '.whg-side-badge{display:inline-flex;align-items:center;gap:5px;margin-right:8px;padding:2px 9px;border-radius:10px;background:rgba(255,190,120,.16);border:1px solid rgba(255,190,120,.4);color:#ffd9a8;font-size:12px}',
  '.whg-side-seed{margin:2px 0 8px;font-size:12px;opacity:.72;line-height:1.5}',
  '.whg-skit-picker{width:min(320px,calc(100vw - 28px));padding:12px}',
  '.whg-skit-picker .whg-input{width:100%;margin-bottom:8px}',
  '.whg-skit-start{width:100%}',
  '.whg-side-sources{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
  '.whg-side-sources a{font-size:11px;color:#9fd4ff;opacity:.8;text-decoration:none;border-bottom:1px dotted rgba(159,212,255,.5)}',
  '@media (max-width:720px){.whg-cast-slot{max-width:48%;height:70vh}.whg-cast-slot[data-lead="true"]{height:74vh}.whg-cast-slot[data-overflow="true"]{display:none}}',
  '.whg-sprite-portrait{height:34vh;width:auto;border-radius:22px;box-shadow:0 10px 50px rgba(0,10,30,.7);background:rgba(6,18,38,.35)}',
  '.whg-mood-happy .whg-sprite{filter:drop-shadow(0 18px 40px rgba(0,10,30,.65)) brightness(1.1) saturate(1.2)}',
  '.whg-mood-shy .whg-sprite{filter:drop-shadow(0 18px 40px rgba(0,10,30,.65)) brightness(1.04) saturate(1.25) hue-rotate(-12deg)}',
  '.whg-mood-angry .whg-sprite{filter:drop-shadow(0 18px 40px rgba(0,10,30,.65)) saturate(1.15) contrast(1.06) hue-rotate(-26deg)}',
  '.whg-blush{position:absolute;left:14%;top:16%;width:72%;height:28%;background:radial-gradient(ellipse at center,rgba(255,120,160,.9),transparent 70%);border-radius:50%;mix-blend-mode:screen;transition:opacity .5s ease}',
  '.whg-sprite-fallback{height:100%;display:flex;align-items:center;font-size:20vh;filter:drop-shadow(0 18px 40px rgba(0,10,30,.6))}',
  // GALGAME dialogue chrome. The frame is one whole image stretched to fill the
  // box, exactly like the reference design: the text lives inside the artwork's
  // own dark panel, so the box reads as drawn art instead of a styled div.
  '.whg-dialogue-wrap{position:absolute;left:4.5vw;right:4.5vw;bottom:0;z-index:5;display:flex;flex-direction:column;gap:6px}',
  '.whg-dialogue{position:relative;width:100%;aspect-ratio:1618/586;min-height:150px;background-size:100% 100%;background-position:center;background-repeat:no-repeat;display:block;padding:0;box-sizing:border-box;cursor:default}',
  // CSS fallback when the bundled frame is unavailable (kept close to the art).
  '.whg-dialogue.is-css-frame{background:linear-gradient(180deg,rgba(13,32,54,.93),rgba(5,16,30,.96));border:2px solid rgba(215,182,108,.75);border-radius:16px;box-shadow:0 18px 48px rgba(0,6,16,.72)}',
  '.whg-speaker{position:absolute;left:8.2%;top:1.4%;width:30%;height:21%;display:flex;align-items:center;justify-content:center;padding:0 3%;box-sizing:border-box;overflow:hidden}',
  '.whg-speaker.has-asset-frame{border:0;background-color:transparent}',
  '.whg-speaker-name{color:#2e3f7a !important;text-shadow:0 1px 0 rgba(255,255,255,.35)}',
  '.whg-speaker-dot{width:6px;height:6px;border-radius:50%;flex:0 0 auto;box-shadow:0 0 6px currentColor}',
  '.whg-speaker-name{font-family:inherit;font-size:clamp(12px,2.1cqw,24px);font-weight:800;letter-spacing:.1em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;width:100%}',
  '.whg-dialogue-text{position:absolute;left:13.2%;top:28.5%;width:76.5%;height:27%;overflow:hidden;color:#eef5ff;font-size:clamp(11px,1.8cqw,20px);line-height:1.9;white-space:pre-wrap;word-break:break-word;text-shadow:0 1px 4px rgba(0,0,0,.65)}',
  '.whg-dialogue-text.narrator{color:#b9cbe0;font-style:italic}',
  '.whg-dialogue-text.user{color:#ffd0e2}',
  '.whg-caret{margin-left:2px;opacity:.8;color:#cfe4ff;animation:whg-blink 1s steps(2) infinite}',
  '@keyframes whg-blink{0%,100%{opacity:.85}50%{opacity:.15}}',
  '.whg-dialogue-meta{position:absolute;right:13%;left:auto;top:23.5%;display:flex;align-items:center;gap:10px;padding:5px 14px;border-radius:999px;background:rgba(6,18,36,.72);border:1px solid rgba(143,216,239,.32);box-shadow:0 2px 10px rgba(0,0,0,.35);font-family:Consolas,monospace;font-size:clamp(10px,1.35cqw,15px);line-height:1.35;color:#dff0ff;pointer-events:none;letter-spacing:.06em}',
  '.whg-dialogue-track{width:clamp(56px,11cqw,140px);height:7px;border-radius:4px;background:rgba(140,200,255,.26);overflow:hidden}',
  '.whg-dialogue-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,#7fd0ff,#d7b66c)}',
  '.whg-choice-float{position:absolute;right:0;bottom:100%;margin-bottom:8px;display:flex;flex-direction:column;gap:7px;width:min(44%,480px)}',
  '.whg-input-row{display:flex;gap:8px;align-items:center}',
  '.whg-dialogue .whg-input-row{position:absolute;left:13.2%;bottom:12.5%;width:76.5%;gap:6px}',
  '.whg-dialogue-tools{display:flex;gap:5px;align-items:center;flex:0 0 auto}',
  '.whg-tool{appearance:none;border:1px solid rgba(215,182,108,.45);border-radius:7px;background:rgba(10,24,48,.72);color:#f0dfb4;cursor:pointer;padding:6px 10px;white-space:nowrap;font-family:inherit;font-size:clamp(9px,1.15cqw,12.5px);line-height:1.1;letter-spacing:.02em;transition:border-color .15s ease,background .15s ease}',
  '.whg-tool:hover:not(:disabled){border-color:rgba(232,203,138,.95);background:rgba(30,52,88,.85)}',
  '.whg-tool:disabled{opacity:.45;cursor:default}',
  '.whg-side-badge{display:inline-block;margin-right:7px;padding:1px 7px;border:1px solid rgba(215,182,108,.55);border-radius:999px;color:#d7b66c;font-size:10px;letter-spacing:.05em}',
  '.whg-side-seed{color:rgba(170,205,230,.85);font-size:clamp(10px,1.02vw,13px);line-height:1.6;margin-bottom:4px}',
  '.whg-plate{position:absolute;top:-17px;left:26px;padding:6px 20px;border-radius:999px;font-weight:800;font-size:15px;color:#04121f;letter-spacing:2px;box-shadow:0 4px 16px rgba(0,10,30,.4)}',
  '.whg-plate.user{background:#ff9cc8}',
  '.whg-plate.narrator{background:#8fb4dd}',
  '.whg-level{position:absolute;top:14px;right:24px;display:flex;align-items:center;gap:8px;font-size:12px;color:#a9c6e8}',
  '.whg-level-track{width:140px;height:6px;border-radius:3px;background:rgba(255,255,255,.14);overflow:hidden}',
  '.whg-level-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#4aa8ff,#ff7ab8);transition:width .6s ease}',
  '.whg-line-now{font-size:clamp(16px,1.7vw,22px);line-height:1.8;animation:whgIn .45s ease;padding-top:6px}',
  '.whg-line-now.narrator{color:#8fb4dd;font-style:italic;font-size:clamp(14px,1.4vw,18px)}',
  '.whg-line-now.user{color:#ffd9ec}',
  '@keyframes whgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
  '.whg-fallback-note{font-size:11px;color:#e8b04b;margin-top:6px}',
  '.whg-choices{display:flex;flex-direction:column;gap:8px;margin-top:10px}',
  '.whg-choice{background:linear-gradient(180deg,rgba(22,46,74,.92),rgba(8,22,38,.94));border:1px solid rgba(215,182,108,.5);color:#dcebff;border-radius:10px;padding:clamp(6px,.9vh,10px) 18px;font-size:clamp(12px,1.25vw,16px);cursor:pointer;text-align:left;line-height:1.5;font-family:inherit;box-shadow:inset 3px 0 0 rgba(215,182,108,.75),0 6px 18px rgba(0,6,16,.45);transition:border-color .15s ease,transform .12s ease}',
  '.whg-choice:hover{background:linear-gradient(180deg,rgba(32,64,100,.95),rgba(12,30,50,.96));border-color:rgba(215,182,108,.95);transform:translateX(2px)}',
  '.whg-choice{display:flex;flex-direction:column;gap:2px}',
  '.whg-choice-tag{font-size:clamp(9px,1.05cqw,12.5px);letter-spacing:.09em;color:rgba(230,200,128,.98);font-weight:700}',
  '.whg-edit{outline:1px dashed rgba(215,182,108,.85);outline-offset:-2px;cursor:grab;touch-action:none}',
  '.whg-edit:active{cursor:grabbing}',
  '.whg-tool.is-on{border-color:rgba(232,203,138,.95);background:rgba(96,76,30,.85);color:#fff6dd}',
  '.whg-edit-band{position:absolute;left:50%;top:0;transform:translate(-50%,-52%);z-index:40;display:flex;align-items:center;gap:10px;padding:6px 14px;border-radius:999px;background:rgba(8,20,38,.92);border:1px solid rgba(215,182,108,.7);color:#f2e4be;font-size:12px;letter-spacing:.03em;white-space:nowrap;box-shadow:0 6px 20px rgba(0,6,16,.6)}',
  '.whg-edit-band b{color:#ffe9b0;font-weight:700}',
  '.whg-edit .whg-sprite-wrap,.whg-edit .whg-dialogue,.whg-edit .whg-speaker,.whg-edit .whg-dialogue-text,.whg-edit .whg-dialogue-meta,.whg-edit .whg-choice-float{outline:1px solid rgba(215,182,108,.55);outline-offset:2px}',
  '.whg-choice-text{font-size:clamp(11px,1.55cqw,17px);line-height:1.45;color:#eaf4ff}',
  '.whg-choice:hover{background:rgba(140,200,255,.22);border-color:rgba(160,215,255,.65)}',
  '.whg-choice:disabled{opacity:.5;cursor:default}',
  '.whg-input-row{display:flex;gap:8px;margin-top:10px}',
  '.whg-dialogue .whg-input{background:rgba(4,16,30,.62);border:1px solid rgba(143,216,239,.3);border-radius:8px;color:#eaf4ff;padding:7px 12px;min-width:0;flex:1 1 auto;font-family:inherit;font-size:clamp(11px,1.3cqw,15px);line-height:1.5;letter-spacing:.01em}',
  '.whg-dialogue .whg-input::placeholder{color:rgba(127,156,174,.85)}',
  '.whg-dialogue .whg-send{border-radius:8px;padding:7px 16px;font-family:inherit;font-size:clamp(11px,1.28cqw,14.5px);background:linear-gradient(180deg,rgba(58,46,20,.95),rgba(28,20,8,.95));border:1px solid rgba(215,182,108,.72);color:#f0dfb4;cursor:pointer;font-family:inherit}',
  '.whg-dialogue .whg-send:hover:not(:disabled){background:linear-gradient(180deg,rgba(92,73,30,.98),rgba(46,33,12,.98));border-color:rgba(232,203,138,.95)}',
  '.whg-dialogue .whg-send:disabled{opacity:.45;cursor:default}',
  '.whg-input{flex:1;background:rgba(255,255,255,.09);border:1px solid rgba(140,200,255,.32);color:#eaf5ff;border-radius:14px;padding:10px 14px;font-size:clamp(13px,1.3vw,16px);outline:none;font-family:inherit;min-width:0}',
  '.whg-input:focus{border-color:rgba(160,215,255,.75)}',
  '.whg-send{background:linear-gradient(135deg,#2f7fd6,#7a5fd6);border:none;color:#fff;border-radius:14px;padding:0 20px;font-size:14px;cursor:pointer;font-weight:700;font-family:inherit}',
  '.whg-send:disabled{opacity:.5;cursor:default}',
  // ── CG reward ──────────────────────────────────────────────────────────
  '.whg-cg-backdrop{position:fixed;inset:0;z-index:9500;background:rgba(2,6,18,.85);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;backdrop-filter:blur(6px)}',
  '.whg-cg-img{max-width:80vw;max-height:72vh;border-radius:18px;box-shadow:0 24px 80px rgba(0,0,0,.7);border:2px solid rgba(140,200,255,.35)}',
  '.whg-cg-title{font-size:18px;font-weight:800;color:#dcecff;letter-spacing:1px}',
  '.whg-cg-btns{display:flex;gap:12px}',
  '.whg-cg-btn{background:linear-gradient(135deg,#2f7fd6,#7a5fd6);border:none;color:#fff;border-radius:12px;padding:9px 18px;font-size:14px;cursor:pointer;font-weight:700;font-family:inherit}',
  '.whg-cg-btn.alt{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#dcebff}',
  '.whg-toast{position:fixed;right:24px;bottom:24px;z-index:9600;background:rgba(6,18,38,.9);border:1px solid rgba(140,200,255,.3);color:#dcebff;border-radius:14px;padding:12px 18px;font-size:13px;font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif;box-shadow:0 12px 40px rgba(0,8,24,.6);max-width:340px}',
  // ── deep-sea archive cabinet ───────────────────────────────────────────
  '.whg-archive-scrim{position:absolute;inset:0;z-index:20;background:linear-gradient(90deg,rgba(1,7,16,.26),rgba(1,7,16,.72));display:flex;justify-content:flex-end;animation:whgArchiveFade .18s ease}',
  '.whg-archive{--whg-brass:#d7b66c;position:relative;box-sizing:border-box;width:min(470px,calc(100% - 42px));height:100%;overflow:visible;color:#eaf7ff;background:linear-gradient(180deg,rgba(7,30,45,.985),rgba(3,17,31,.995));border-left:1px solid rgba(215,182,108,.58);box-shadow:-24px 0 70px rgba(0,5,16,.68),inset 8px 0 24px rgba(27,111,137,.08);display:flex;flex-direction:column;animation:whgArchiveSlide .28s cubic-bezier(.2,.8,.2,1)}',
  '.whg-archive:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.2;background:repeating-linear-gradient(180deg,transparent 0,transparent 46px,rgba(130,216,239,.13) 47px,transparent 48px)}',
  '.whg-archive-spine{position:absolute;left:-33px;top:92px;width:32px;padding:14px 0;border:1px solid rgba(215,182,108,.5);border-right:0;border-radius:9px 0 0 9px;background:#09283a;color:#d7c48f;writing-mode:vertical-rl;text-orientation:mixed;font:700 10px/1 Consolas,monospace;letter-spacing:3px;text-align:center;box-shadow:-8px 8px 22px rgba(0,5,16,.35)}',
  '.whg-archive-head{position:relative;z-index:1;display:flex;align-items:flex-start;gap:14px;padding:24px 24px 18px;border-bottom:1px solid rgba(215,182,108,.32)}',
  '.whg-archive-heading{min-width:0;flex:1}',
  '.whg-archive-kicker{margin-bottom:5px;color:#8fd8e9;font:700 10px/1.4 Consolas,"SFMono-Regular",monospace;letter-spacing:2.3px;text-transform:uppercase}',
  '.whg-archive-title{margin:0;color:#f3fbff;font-family:"STSong","Songti SC",Georgia,serif;font-size:24px;font-weight:700;letter-spacing:1px}',
  '.whg-archive-tabs{display:flex;gap:6px;margin-top:10px}',
  '.whg-archive-tab{padding:4px 12px;border:1px solid rgba(143,216,239,.28);border-radius:999px;background:transparent;color:#9dc4dd;font-size:12px;font-family:inherit;cursor:pointer}',
  '.whg-archive-tab:hover{border-color:rgba(160,215,255,.6);color:#dcebff}',
  '.whg-archive-tab.active{border-color:rgba(215,182,108,.6);background:rgba(215,182,108,.16);color:#f7e6bd}',
  '.whg-archive-tab:focus-visible{outline:2px solid #9fe8ff;outline-offset:2px}',
  '.whg-archive-close{display:grid;place-items:center;flex:none;width:32px;height:32px;border:1px solid rgba(215,182,108,.36);border-radius:50%;background:rgba(3,14,25,.5);color:#dcefff;cursor:pointer;font-size:18px}',
  '.whg-archive-close:hover{background:rgba(130,216,239,.13)}',
  '.whg-archive-close:focus-visible,.whg-gallery-card:focus-visible,.whg-archive-back:focus-visible{outline:2px solid #9fe8ff;outline-offset:2px}',
  '.whg-archive-body{position:relative;z-index:1;min-height:0;flex:1;overflow-y:auto;padding:18px 22px 28px;scrollbar-color:rgba(143,216,239,.45) transparent}',
  '.whg-archive-empty{display:grid;place-items:center;min-height:220px;padding:24px;color:#8fb1c5;text-align:center;font-size:13px;line-height:1.8;border:1px dashed rgba(143,216,239,.22);border-radius:14px;background:rgba(1,10,20,.18)}',
  '.whg-archive-error{padding:14px;border:1px solid rgba(255,154,154,.3);border-radius:12px;background:rgba(102,25,35,.2);color:#ffc1c1;font-size:13px;line-height:1.6}',
  '.whg-archive-error .whg-btn{display:block;margin-top:10px}',
  '.whg-history{display:flex;flex-direction:column;gap:12px;user-select:text}',
  '.whg-history-row{display:grid;grid-template-columns:48px minmax(0,1fr);gap:10px;align-items:start}',
  '.whg-skit-log{display:flex;flex-direction:column;gap:20px}',
  '.whg-skit{padding:12px 14px;border:1px solid rgba(143,216,239,.2);border-radius:14px;background:rgba(8,22,44,.42)}',
  '.whg-skit-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:4px}',
  '.whg-skit-cast{display:flex;flex-wrap:wrap;gap:8px;font-size:13px;font-weight:600}',
  '.whg-skit-time{font-size:11px;opacity:.55;white-space:nowrap}',
  '.whg-skit-seed{margin:0 0 10px;font-size:12px;opacity:.7;line-height:1.5}',
  '.whg-skit-cg{margin-bottom:10px;font-size:12px}',
  '.whg-history-who{padding-top:8px;color:#85bbca;font:700 10px/1.3 Consolas,monospace;letter-spacing:1px;text-align:right}',
  '.whg-history-text{margin:0;padding:9px 12px;border-left:2px solid rgba(127,208,255,.4);background:rgba(4,22,36,.56);color:#dff3ff;font-size:13px;line-height:1.7;white-space:pre-wrap;word-break:break-word}',
  '.whg-history-row.user .whg-history-text{border-left-color:#ff9cc8;color:#ffe4f1}',
  '.whg-history-row.narrator .whg-history-text{border-left-color:#748ea8;color:#9eb6ca;font-style:italic}',
  '.whg-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}',
  '.whg-gallery-card{position:relative;min-width:0;overflow:hidden;padding:0;border:1px solid rgba(143,216,239,.24);border-radius:12px;background:#061725;color:#eaf7ff;cursor:pointer;text-align:left}',
  '.whg-gallery-card:hover{border-color:rgba(215,182,108,.65);transform:translateY(-1px)}',
  '.whg-gallery-thumb{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;background:#03101f}',
  '.whg-gallery-placeholder{display:grid;place-items:center;color:#6f91a5;font:700 12px/1 Consolas,monospace}',
  '.whg-gallery-meta{display:flex;align-items:center;gap:8px;padding:9px 10px}',
  '.whg-gallery-level{color:#f0d99d;font:700 11px/1 Consolas,monospace}',
  '.whg-gallery-date{min-width:0;overflow:hidden;color:#8fb1c5;font-size:10px;text-overflow:ellipsis;white-space:nowrap}',
  '.whg-gallery-bg{position:absolute;top:8px;right:8px;padding:3px 7px;border:1px solid rgba(215,182,108,.5);border-radius:999px;background:rgba(3,14,25,.82);color:#f0d99d;font:700 9px/1.3 Consolas,monospace}',
  '.whg-gallery-detail{display:flex;min-height:100%;flex-direction:column;gap:14px}',
  '.whg-archive-back{align-self:flex-start;padding:6px 10px;border:0;border-radius:8px;background:rgba(143,216,239,.1);color:#cfefff;cursor:pointer;font-family:inherit}',
  '.whg-gallery-full{display:block;width:100%;max-height:54vh;object-fit:contain;border:1px solid rgba(215,182,108,.35);border-radius:12px;background:#020a14}',
  '.whg-gallery-caption{display:flex;align-items:center;gap:10px;color:#9bb9ca;font-size:12px}',
  '.whg-gallery-caption strong{color:#f0d99d;font:700 12px/1 Consolas,monospace}',
  '.whg-gallery-prompt{margin:0;padding:12px 14px;border-left:2px solid rgba(215,182,108,.55);background:rgba(2,12,22,.42);color:#9fbccb;font-size:11px;line-height:1.65;white-space:pre-wrap;word-break:break-word;user-select:text}',
  '.whg-profile-archive{width:min(560px,calc(100% - 42px))}',
  '.whg-profile-intro{margin-bottom:16px;padding:12px 14px;border:1px solid rgba(143,216,239,.2);border-left:3px solid rgba(215,182,108,.66);border-radius:0 11px 11px 0;background:rgba(2,16,28,.48);color:#aec8d6;font-size:12px;line-height:1.7}',
  '.whg-profile-intro strong{color:#eff9ff;font-weight:700}',
  '.whg-profile-guard{display:block;margin-top:7px;color:#d2bf89;font-size:11px}',
  '.whg-profile-form{display:flex;flex-direction:column;gap:17px;user-select:text}',
  '.whg-profile-section{margin:0;padding:0;border:0}',
  '.whg-trait-section{margin-top:22px;padding-top:18px;border-top:1px solid rgba(215,182,108,.22)}',
  '.whg-trait-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}',
  '.whg-trait-col{display:flex;flex-direction:column;gap:7px;min-width:0}',
  '.whg-trait-col-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;color:#8fb0c6;font-size:10px;letter-spacing:.06em}',
  '.whg-trait-row{display:grid;grid-template-columns:5.2em 2.3em minmax(46px,1fr) 3.1em 20px 20px;align-items:center;gap:7px}',
  '.whg-trait-label{color:#dbeaf7;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.whg-trait-act{margin-left:5px;color:#7f9db3;font-size:10px;font-style:normal;letter-spacing:.02em}',
  '.whg-trait-level{font-family:Consolas,monospace;font-size:10.5px;font-weight:700;color:#e8cf94;text-align:right}',
  '.whg-trait-track{position:relative;height:8px;border-radius:4px;background:rgba(140,200,255,.15);overflow:hidden}',
  '.whg-trait-fill{height:100%;border-radius:4px;transition:width .25s ease}',
  '.whg-trait-fill.kind-xp{background:linear-gradient(90deg,#5a8fd8,#9fd8ff)}',
  '.whg-trait-fill.kind-dev{background:linear-gradient(90deg,#c86a9b,#f0a8c4)}',
  '.whg-trait-value{font-family:Consolas,monospace;font-size:10px;color:#7f9db3;text-align:right}',
  '.whg-trait-btn{width:20px;height:20px;padding:0;border-radius:5px;border:1px solid rgba(143,216,239,.28);background:rgba(8,24,44,.72);color:#cfe6f8;cursor:pointer;font:12px/1 system-ui}',
  '.whg-trait-btn:hover:not(:disabled){border-color:rgba(159,232,255,.62);background:rgba(24,52,84,.92)}',
  '.whg-trait-btn:disabled{opacity:.35;cursor:default}',
  '.whg-trait-divider{margin:5px 0 1px;padding-top:5px;border-top:1px dashed rgba(240,140,180,.34);color:#e39ec0;font:700 9.5px/1 Consolas,monospace;letter-spacing:1.4px}',
  '.whg-profile-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 9px;padding-bottom:7px;border-bottom:1px solid rgba(215,182,108,.22)}',
  '.whg-profile-section-head strong{color:#d7c48f;font:700 10px/1.3 Consolas,monospace;letter-spacing:1.35px}',
  '.whg-profile-section-head span{color:#789bad;font-size:10px}',
  '.whg-profile-head-fields,.whg-profile-main-fields,.whg-profile-secondary-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
  '.whg-profile-field{display:flex;min-width:0;flex-direction:column;gap:6px}',
  '.whg-profile-field label{color:#e5f4fb;font-size:12px;font-weight:700;line-height:1.4}',
  '.whg-profile-field small{color:#789bad;font-size:10px;line-height:1.45}',
  '.whg-profile-control{box-sizing:border-box;width:100%;min-width:0;border:1px solid rgba(143,216,239,.24);border-radius:9px;background:rgba(1,11,21,.58);color:#eaf7ff;padding:9px 10px;font:12px/1.55 system-ui,"Segoe UI","Microsoft YaHei",sans-serif;outline:none;transition:border-color .16s ease,box-shadow .16s ease}',
  '.whg-profile-control::placeholder{color:#567687}',
  '.whg-profile-control:hover{border-color:rgba(143,216,239,.42)}',
  '.whg-profile-control:focus{border-color:rgba(159,232,255,.76);box-shadow:0 0 0 2px rgba(85,185,216,.14)}',
  '.whg-profile-control:disabled{opacity:.58;cursor:default}',
  'textarea.whg-profile-control{min-height:112px;resize:vertical}',
  '.whg-profile-secondary-fields textarea.whg-profile-control{min-height:92px}',
  '.whg-profile-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding-top:14px;border-top:1px solid rgba(215,182,108,.22)}',
  '.whg-profile-actions .whg-cg-btn{padding:8px 16px}',
  '.whg-profile-message{min-height:18px;flex:1 1 180px;margin:0;color:#8fd8e9;font-size:11px;line-height:1.5;text-align:right}',
  '.whg-profile-message.error{color:#ffb5bd}',
  '.whg-profile-loading{display:grid;place-items:center;min-height:240px;color:#8fb1c5;font-size:13px;letter-spacing:.2px}',
  '.whg-disabled{position:absolute;inset:0;z-index:6;display:grid;place-items:center;padding:24px;background:linear-gradient(180deg,#071629,#03101f)}',
  '.whg-disabled-card{width:min(480px,100%);padding:28px;border:1px solid rgba(215,182,108,.4);border-radius:18px;background:rgba(5,25,39,.86);box-shadow:0 22px 60px rgba(0,4,14,.46);text-align:center}',
  '.whg-disabled-card h2{margin:0 0 8px;color:#eefaff;font-family:"STSong","Songti SC",Georgia,serif;font-size:23px}',
  '.whg-disabled-card p{margin:0;color:#8fb1c5;font-size:13px;line-height:1.7}',
  // ── native DSH plugin-settings card ────────────────────────────────────
  '.whg-settings-tab-list{max-width:760px;margin:0;padding:0;list-style:none}',
  '.whg-settings-card{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);overflow:hidden}',
  '.whg-settings-card[data-open="true"]{border-color:color-mix(in srgb,var(--dsw-alias-label-dimmed) 70%,#d7b66c);background:var(--dsw-alias-bg-layer-2)}',
  '.whg-settings-head{appearance:none;width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;border:0;background:transparent;color:inherit;cursor:pointer;text-align:left;font-family:inherit}',
  '.whg-settings-head:focus-visible,.whg-settings-toggle:focus-visible,.whg-settings-select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#2f7fd6);outline-offset:-2px}',
  '.whg-settings-heading{display:flex;min-width:0;flex:1;flex-direction:column;gap:4px}',
  '.whg-settings-name{font-size:15px;font-weight:650;line-height:1.4}',
  '.whg-settings-desc{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}',
  '.whg-settings-status{flex:none;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);font-size:11px}',
  '.whg-settings-chevron{color:var(--dsw-alias-label-tertiary);font-size:12px;transition:transform .16s ease}',
  '.whg-settings-card[data-open="true"] .whg-settings-chevron{transform:rotate(180deg)}',
  '.whg-settings-body{display:flex;flex-direction:column;gap:14px;margin:0 16px;padding:16px 0;border-top:1px solid var(--dsw-alias-border-l2)}',
  '.whg-settings-row{display:grid;grid-template-columns:minmax(150px,.8fr) minmax(210px,1.2fr);align-items:center;gap:18px}',
  '.whg-settings-copy strong{display:block;font-size:13px;font-weight:600}',
  '.whg-settings-copy small{display:block;margin-top:3px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.45}',
  '.whg-settings-toggle{justify-self:end;min-width:74px;padding:6px 13px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;line-height:1.35}',
  '.whg-settings-toggle[aria-checked="true"]{border-color:#3da87a;background:color-mix(in srgb,#3da87a 18%,transparent);color:var(--dsw-alias-label-primary)}',
  '.whg-settings-select{box-sizing:border-box;width:100%;min-width:0;padding:7px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;line-height:1.4}',
  '.whg-settings-message{min-height:18px;margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}',
  '.whg-settings-message.error{color:var(--dsw-alias-label-error,#c33)}',
  '@keyframes whgArchiveFade{from{opacity:0}to{opacity:1}}',
  '@keyframes whgArchiveSlide{from{transform:translateX(36px);opacity:.6}to{transform:none;opacity:1}}',
  // ── workspace chrome hidden while the galgame tab is active ─────────────
  // Skins belong to their own plugins: never touch their attributes or nodes.
  'body[data-whale-galgame-active] [data-slot="conversation.composer"],body[data-whale-galgame-active] [data-slot="conversation.composer.dock"]{display:none !important}',
  'body[data-whale-galgame-active] .whg-pet{display:none !important}',
  // Container queries, not media queries: the panel narrows when the sidebar
  // opens while the viewport stays exactly as wide as before.
  '@container whg (max-width:900px){.whg-top{gap:6px;padding:10px 12px;flex-wrap:wrap}.whg-title{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46%}.whg-btn{white-space:nowrap}.whg-top-actions{flex-wrap:wrap}.whg-dialogue-wrap{left:2vw;right:2vw}.whg-dialogue{min-height:118px}.whg-dialogue .whg-input-row{flex-wrap:wrap}.whg-dialogue-tools{flex-wrap:wrap}.whg-choice-float{width:min(72%,430px)}.whg-dialogue-text{top:27%;height:29%}}',
  '@media (max-width:900px){.whg-top{gap:6px;padding:10px 12px;flex-wrap:wrap}.whg-title{font-size:14px;white-space:nowrap}.whg-chip{padding:3px 8px}.whg-spacer{display:none}.whg-top-actions{width:100%;justify-content:flex-end}.whg-btn{padding:5px 9px;font-size:12px}.whg-archive{width:min(470px,calc(100% - 12px))}.whg-archive-spine{display:none}}',
  // Under ~640px the 2.76:1 frame is only ~150px tall, which leaves no room for
  // a line of dialogue between the medallion and the ruffles. Trade the exact
  // artwork ratio for usable height; the art squashes, the text stays readable.
  // 侧栏一开面板就窄，但窗口宽度不变——只能按容器查询。
  '@container whg (max-width:900px){.whg-gal-roles{grid-template-columns:repeat(6,minmax(0,1fr));width:94%;top:30%;bottom:auto}.whg-gal-role-label{top:calc(30% - 22px);bottom:auto}.whg-gal-menu{width:min(300px,86%);bottom:9%}.whg-gal-box{left:3%;right:3%;min-height:17vh}.whg-gal-choices{width:88%;bottom:calc(3vh + 17vh + 20px)}}',
  '@container whg (max-width:620px){.whg-gal-roles{grid-template-columns:repeat(5,minmax(0,1fr));top:26%;bottom:auto}.whg-gal-role-label{display:none}.whg-gal-title-main{font-size:clamp(20px,7cqw,40px)}.whg-gal-menu button{padding:11px 14px;font-size:13.5px}.whg-gal-tools{right:3%;top:10px;gap:4px}.whg-gal-tool,.whg-gal-tools .whg-tool{padding:5px 7px;font-size:10.5px}.whg-gal-sprite{height:78%}}',
  '@container whg (max-width:760px){.whg-trait-grid{grid-template-columns:1fr;gap:11px}.whg-trait-row{grid-template-columns:5.2em 2.3em minmax(60px,1fr) 3.1em 20px 20px}}',
  '@container whg (max-width:640px){.whg-dialogue{aspect-ratio:auto;height:clamp(150px,25vh,235px)}.whg-speaker{left:12%;top:2.5%;width:40%;height:17%}.whg-dialogue-text{left:24%;top:22%;width:70%;height:48%;font-size:clamp(12px,2.9cqw,15px)}.whg-dialogue .whg-input-row{left:24%;width:70%;bottom:7%}.whg-dialogue-tools{flex-wrap:nowrap;overflow-x:auto;max-width:100%}.whg-tool{flex:0 0 auto}.whg-choice-float{width:min(92%,360px)}}',
  '@container whg (max-width:560px){.whg-title{display:none}.whg-dialogue-meta{display:none}.whg-dialogue{min-height:104px}.whg-choice-float{width:min(92%,360px)}}',
  '@media (max-width:560px){.whg-chip-wrap{max-width:calc(50% - 4px)}.whg-chip{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.whg-picker{position:fixed;top:92px;right:10px;left:10px;width:auto;max-height:55vh}.whg-top-actions{gap:5px;overflow-x:auto;padding-bottom:2px}.whg-archive{width:100%;border-left:0}.whg-archive-head{padding:18px 16px 14px}.whg-archive-body{padding:14px 14px 24px}.whg-gallery{grid-template-columns:1fr}.whg-history-row{grid-template-columns:38px minmax(0,1fr);gap:8px}.whg-archive-title{font-size:21px}.whg-profile-head-fields,.whg-profile-main-fields,.whg-profile-secondary-fields{grid-template-columns:1fr}.whg-profile-section-head{align-items:flex-start;flex-direction:column;gap:3px}.whg-profile-message{flex-basis:100%;text-align:left}.whg-settings-row{grid-template-columns:1fr;gap:8px}.whg-settings-toggle{justify-self:start}.whg-settings-head{padding:13px}.whg-settings-body{margin:0 13px}}',
  '@media (prefers-reduced-motion:reduce){.whg-archive-scrim,.whg-archive{animation:none}.whg-gallery-card:hover{transform:none}}',
  ATELIER_CSS,
  DIRECTED_CSS,
  SCENE_EDITOR_CSS,
].join('\n')

function art(key: any): string | undefined {
  if (!key) return undefined
  return (WHALE_ART as Record<string, string>)[String(key)]
}

function activateGalgameTab(): boolean {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('button[role="tab"]'))
  const target = tabs.find((tab) => tab.offsetParent !== null && (tab.textContent || '').trim() === 'galgame')
  if (!target || target.disabled) return false
  target.click()
  try { target.focus({ preventScroll: true }) } catch (err) { target.focus() }
  return true
}

function formatCgDate(value: any): string {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return '时间未记录'
  try {
    return new Date(n).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    return '时间未记录'
  }
}

function galleryMetadataItem(value: any): any | null {
  if (!value || typeof value !== 'object') return null
  const metadata = { ...value }
  // cg-gallery is a catalogue endpoint. Even if an older service still sends
  // the image payload, do not retain it as part of the initial gallery load.
  delete metadata.dataUrl
  return metadata
}

function galleryDetailItem(result: any, fallback: any): any | null {
  if (!result || typeof result !== 'object') return null
  const payload = result.item && typeof result.item === 'object'
    ? result.item
    : result.cg && typeof result.cg === 'object'
      ? result.cg
      : result
  const dataUrl = typeof payload.dataUrl === 'string' && payload.dataUrl
    ? payload.dataUrl
    : typeof result.dataUrl === 'string' && result.dataUrl
      ? result.dataUrl
      : ''
  if (!dataUrl) return null
  return {
    ...(fallback && typeof fallback === 'object' ? fallback : {}),
    ...payload,
    dataUrl,
  }
}

const API_READ_TIMEOUT_MS = 10_000
const API_WRITE_TIMEOUT_MS = 30_000
const API_LONG_TIMEOUT_MS = 120_000
const API_WRITE_ACTIONS = new Set([
  'persona-settings-set','persona-preset-save','persona-preset-delete',
  'settings-set',
  'profile-set',
  'profile-reset',
  'sprite-clear',
  'sprite-set-builtin',
  'bg-set-builtin',
  'bg-clear-custom',
  'cg-ack',
  'cg-save-bg',
  'cg-clear-bg',
  'pet-set',
  'reset',
])

function apiTimeoutMs(action: string): number {
  if(action==='profile-preview')return 60_000
  // Image generation can legitimately take minutes on a remote GPU.
  if (action.startsWith('scene-layout-') || action === 'asset-prompt-polish' || action === 'gal-free-start' || action === 'gal-free-next' || action === 'image-generate' || action === 'cg-generate' || action === 'image-prompt-suggest') return 300_000
  if (action === 'chat' || action === 'side-story' || action === 'bg-upload' || action === 'sprite-upload' || action.startsWith('gal-') || action.startsWith('asset-')) return API_LONG_TIMEOUT_MS
  if (API_WRITE_ACTIONS.has(action)) return API_WRITE_TIMEOUT_MS
  return API_READ_TIMEOUT_MS
}

async function api(action: string, args?: any): Promise<any> {
  const controller = new AbortController()
  const timeoutMs = apiTimeoutMs(action)
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('/whale-galgame-api', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, args: args || {} }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error('galgame api ' + res.status)
    return await res.json()
  } catch (err: any) {
    if (controller.signal.aborted) {
      throw new Error('请求超时，请稍后重试（' + action + '）')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

const MODEL_OPTIONS_CACHE_MS = 15_000
const MODEL_OPTIONS_CACHE_LIMIT = 8
const MODEL_OPTIONS_CACHE = new Map<string, { at: number; value: any }>()
const MODEL_OPTIONS_PENDING = new Map<string, Promise<any>>()
const CG_DATA_CACHE_LIMIT = 4
const CG_DATA_CACHE = new Map<string, any>()
const CG_DATA_PENDING = new Map<string, Promise<any>>()

function modelOptionsCacheKey(args?: any): string {
  const sessionId = args && typeof args.sessionId === 'string' ? args.sessionId.trim() : ''
  return sessionId ? 'session:' + sessionId : 'unscoped'
}

function rememberModelOptions(key: string, value: any): void {
  MODEL_OPTIONS_CACHE.delete(key)
  MODEL_OPTIONS_CACHE.set(key, { at: Date.now(), value })
  while (MODEL_OPTIONS_CACHE.size > MODEL_OPTIONS_CACHE_LIMIT) {
    const oldest = MODEL_OPTIONS_CACHE.keys().next().value
    if (typeof oldest !== 'string') break
    MODEL_OPTIONS_CACHE.delete(oldest)
  }
}

function requestModelOptions(args?: any, force = false): Promise<any> {
  const key = modelOptionsCacheKey(args)
  const cached = MODEL_OPTIONS_CACHE.get(key)
  if (!force && cached && Date.now() - cached.at < MODEL_OPTIONS_CACHE_MS) return Promise.resolve(cached.value)
  const pending = MODEL_OPTIONS_PENDING.get(key)
  if (pending) return pending
  const request = api('model-options', args).then((value) => {
    rememberModelOptions(key, value)
    return value
  }).finally(() => {
    MODEL_OPTIONS_PENDING.delete(key)
  })
  MODEL_OPTIONS_PENDING.set(key, request)
  return request
}

function cachedCgData(id: string): any | null {
  const key = String(id || '').trim()
  if (!key) return null
  const value = CG_DATA_CACHE.get(key)
  if (!value) return null
  CG_DATA_CACHE.delete(key)
  CG_DATA_CACHE.set(key, value)
  return value
}

function rememberCgData(id: string, value: any): void {
  CG_DATA_CACHE.delete(id)
  CG_DATA_CACHE.set(id, value)
  while (CG_DATA_CACHE.size > CG_DATA_CACHE_LIMIT) {
    const oldest = CG_DATA_CACHE.keys().next().value
    if (typeof oldest !== 'string') break
    CG_DATA_CACHE.delete(oldest)
  }
}

function requestCgData(id: string, sessionId?: string): Promise<any> {
  const key = String(id || '').trim()
  if (!key) return Promise.reject(new Error('缺少 CG 图鉴编号'))
  const cached = cachedCgData(key)
  if (cached) return Promise.resolve(cached)
  const pending = CG_DATA_PENDING.get(key)
  if (pending) return pending
  const args = normalizedEventSessionId(sessionId) ? { id: key, sessionId: normalizedEventSessionId(sessionId) } : { id: key }
  const request = api('cg-data', args).then((result) => {
    assertApiResult(result, 'CG 图片读取失败')
    const detail = galleryDetailItem(result, { id: key })
    if (!detail) throw new Error('服务未返回这张 CG 的图片数据')
    const returnedId = String(detail.id || key).trim()
    if (returnedId !== key) throw new Error('CG 图片与所选图鉴条目不一致')
    const normalized = { ...detail, id: key }
    rememberCgData(key, normalized)
    return normalized
  }).finally(() => {
    CG_DATA_PENDING.delete(key)
  })
  CG_DATA_PENDING.set(key, request)
  return request
}

function selectMode(state: any): string {
  const current = state && state.current !== undefined && state.byId ? state.byId[state.current] : undefined
  if (current && current.pendingInteraction !== undefined) return 'waiting'
  if (current && current.running === true) return 'running'
  return 'idle'
}

// ── composer hiding ────────────────────────────────────────────────────────
const composerHiddenEls = new Map<HTMLElement, string>()

function setComposerHidden(hidden: boolean): void {
  const els = document.querySelectorAll("[data-slot='conversation.composer'], [data-slot*='composer']")
  els.forEach((node) => {
    const el = node as HTMLElement
    if (hidden) {
      if (!composerHiddenEls.has(el)) {
        composerHiddenEls.set(el, el.style.display)
        el.style.display = 'none'
      }
    } else if (composerHiddenEls.has(el)) {
      el.style.display = composerHiddenEls.get(el) || ''
      composerHiddenEls.delete(el)
    }
  })
}

function syncTabLayout(visible: boolean): void {
  const rootEl = document.getElementById('whg-tab-root')
  if (!rootEl) return
  if (visible && rootEl.offsetParent !== null) {
    const r = rootEl.getBoundingClientRect()
    const fill = Math.max(420, Math.min(2000, window.innerHeight - r.top - 8))
    rootEl.style.minHeight = fill + 'px'
  } else {
    rootEl.style.minHeight = ''
  }
}

/**
 * Whether this document is the standalone GAL page instead of a tab inside DSH.
 *
 * `src/client/standalone-runtime.ts` publishes a frozen marker before it calls
 * `apply()`, so the very same bundle can tell that it *is* the whole page. In the
 * main UI the marker never exists and every branch reading this keeps the old
 * behaviour, so the plugin's native entry points are unaffected.
 */
function standalonePage(): boolean {
  try {
    const flag = (window as any).__WHALE_GAL_STANDALONE__
    return !!flag && typeof flag === 'object' && (flag as any).standalone === true
  } catch (err) {
    return false
  }
}

function Pet(props: { useSessions: any; onOpen: () => void }): React.ReactElement {
  const mode = props.useSessions ? props.useSessions(selectMode) : 'idle'
  const [lookIndex, setLookIndex] = useState<number | null>(null)
  const buttonRef = useRef<any>(null)
  const sheet = art('pet-spritesheet')
  const spriteStyle = sheet
    ? { backgroundImage: 'url(' + sheet + ')' }
    : { background: 'linear-gradient(160deg,#0e2b52,#123a63)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }

  useEffect(() => {
    if (mode !== 'idle') {
      setLookIndex(null)
      return undefined
    }
    let idleTimer: any
    const handlePointerMove = (event: PointerEvent) => {
      const rect = buttonRef.current && buttonRef.current.getBoundingClientRect ? buttonRef.current.getBoundingClientRect() : null
      if (!rect) return
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)
      const clockwiseFromUp = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360
      setLookIndex(Math.round(clockwiseFromUp / 22.5) % 16)
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setLookIndex(null), 1100)
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (idleTimer) clearTimeout(idleTimer)
    }
  }, [mode])

  const lookRow = lookIndex === null ? 0 : lookIndex < 8 ? 9 : 10
  const lookColumn = lookIndex === null ? 0 : lookIndex % 8
  const label = mode === 'running' ? 'deepseek娘正在工作' : mode === 'waiting' ? 'deepseek娘正在等待你' : 'deepseek娘正在待机'
  const hint = '点击开始galgame'
  return React.createElement('button', {
    'aria-label': label + '，' + hint,
    className: 'whg-pet',
    'data-looking': String(lookIndex !== null),
    'data-mode': mode,
    onClick: props.onOpen,
    ref: buttonRef,
    style: {
      '--whg-look-x': (-lookColumn * 192) + 'px',
      '--whg-look-y': (-lookRow * 208) + 'px',
    } as any,
    title: label + '，' + hint,
    type: 'button',
  },
    React.createElement('span', {
      'aria-hidden': 'true',
      className: 'whg-pet-sprite',
      style: spriteStyle,
    }, sheet ? undefined : '🐋'),
    React.createElement('span', { className: 'whg-pet-status' }, label),
  )
}

function optionText(option: any, fallback = '未命名'): string {
  if (!option) return fallback
  return String(option.label || option.name || option.model || option.id || fallback)
}

function selectionKey(selection: any): string {
  if (!selection) return ''
  return encodeURIComponent(String(selection.provider || '')) + '|' + encodeURIComponent(String(selection.model || selection.id || ''))
}

function parseSelectionKey(value: string): { provider: string; model: string } | null {
  const split = value.indexOf('|')
  if (split < 0) return null
  try {
    const provider = decodeURIComponent(value.slice(0, split))
    const model = decodeURIComponent(value.slice(split + 1))
    return model ? { provider, model } : null
  } catch (err) {
    return null
  }
}

function mainModelText(options: any): string {
  const main = options && options.mainSelection
  if (!main) return '当前工作区模型'
  return optionText(main, String(main.model || '当前工作区模型'))
}

function settingsFromResult(result: any): any | null {
  if (!result || typeof result !== 'object') return null
  if (result.settings && typeof result.settings === 'object') return result.settings
  if ('enabled' in result && ('characterMode' in result || 'chatMode' in result)) return result
  return null
}

function viewFromResult(result: any): any | null {
  if (!result || typeof result !== 'object') return null
  if (result.view && typeof result.view === 'object') return result.view
  if ('current' in result && ('name' in result || 'history' in result)) return result
  return null
}

function normalizedEventSessionId(value: any): string {
  return typeof value === 'string' ? value.trim() : ''
}

function eventSourceSessionId(sessionId?: string): string | null {
  return normalizedEventSessionId(sessionId) || null
}

function backgroundRevisionValue(value: any): number | null {
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

function scopedEventView(detail: any, targetSessionId?: string): any | null {
  if (!detail || typeof detail !== 'object' || !detail.view || typeof detail.view !== 'object') return null
  const source = normalizedEventSessionId(detail.sourceSessionId)
  const target = normalizedEventSessionId(targetSessionId)
  // Missing scope means an older or settings-card broadcast. It may carry
  // global settings/assets, but its full view must never cross a session.
  return source && target && source === target ? detail.view : null
}

const VIEW_CACHE_LIMIT = 8
const VIEW_CACHE_BY_SESSION = new Map<string, any>()

function viewCacheKey(sessionId?: string): string {
  const id = typeof sessionId === 'string' ? sessionId.trim() : ''
  return id ? 'session:' + id : 'unscoped'
}

function cachedView(key: string): any | null {
  return VIEW_CACHE_BY_SESSION.get(key) || null
}

function rememberView(key: string, value: any): void {
  if (!value || typeof value !== 'object') return
  VIEW_CACHE_BY_SESSION.delete(key)
  VIEW_CACHE_BY_SESSION.set(key, value)
  while (VIEW_CACHE_BY_SESSION.size > VIEW_CACHE_LIMIT) {
    const oldest = VIEW_CACHE_BY_SESSION.keys().next().value
    if (typeof oldest !== 'string') break
    VIEW_CACHE_BY_SESSION.delete(oldest)
  }
}

const PROFILE_KEYS = ['displayName', 'address', 'greeting', 'persona', 'tone', 'visual'] as const
type ProfileKey = typeof PROFILE_KEYS[number]
type CharacterProfile = Record<ProfileKey, string>

const EMPTY_CHARACTER_PROFILE: CharacterProfile = {
  displayName: '',
  address: '',
  greeting: '',
  persona: '',
  tone: '',
  visual: '',
}

function profileFromObject(value: any): CharacterProfile | null {
  if (!value || typeof value !== 'object') return null
  if (!PROFILE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(value, key))) return null
  const profile = { ...EMPTY_CHARACTER_PROFILE }
  PROFILE_KEYS.forEach((key) => {
    const field = value[key]
    profile[key] = field === undefined || field === null ? '' : String(field)
  })
  return profile
}

function profileFromResult(result: any): CharacterProfile | null {
  if (!result || typeof result !== 'object') return null
  return profileFromObject(result.effective)
    || profileFromObject(result.profile && result.profile.effective)
    || profileFromObject(result.profile)
    || profileFromObject(result.values)
    || profileFromObject(result)
}

function builtInProfileFromResult(result: any): CharacterProfile | null {
  if (!result || typeof result !== 'object') return null
  return profileFromObject(result.builtIn)
    || profileFromObject(result.profile && result.profile.builtIn)
    || profileFromObject(result.defaults)
}

function profileOverridesFromResult(result: any): Partial<CharacterProfile> | null {
  if (!result || typeof result !== 'object') return null
  const value = result.overrides || (result.profile && result.profile.overrides)
  if (!value || typeof value !== 'object') return null
  const overrides: Partial<CharacterProfile> = {}
  PROFILE_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      overrides[key] = value[key] === undefined || value[key] === null ? '' : String(value[key])
    }
  })
  return overrides
}

function profileHasOverridesFromResult(result: any, fallback: boolean): boolean {
  if (result && typeof result.hasOverrides === 'boolean') return result.hasOverrides
  const overrides = profileOverridesFromResult(result)
  return overrides ? Object.keys(overrides).length > 0 : fallback
}

function assertApiResult(result: any, fallback: string): void {
  if (!result || result.ok !== false) return
  const errors = Array.isArray(result.errors) ? result.errors.join('；') : result.error
  throw new Error(errors || fallback)
}

function PluginSettingsCard(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [options, setOptions] = useState<any>({ characters: [], models: [] })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')

  useEffect(() => {
    let alive = true
    api('settings-get').then((nextSettings) => {
      if (!alive) return
      setSettings(settingsFromResult(nextSettings) || nextSettings)
      setError('')
    }).catch((err) => {
      if (alive) setError('插件设置读取失败：' + String(err && err.message ? err.message : err))
    }).finally(() => {
      if (alive) setLoading(false)
    })
    requestModelOptions().then((nextOptions) => {
      if (!alive) return
      setOptions(nextOptions && typeof nextOptions === 'object' ? nextOptions : { characters: [], models: [] })
      setCatalogError('')
    }).catch((err) => {
      if (alive) setCatalogError('模型目录暂时不可用：' + String(err && err.message ? err.message : err))
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const onSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail && detail.settings) setSettings(detail.settings)
      requestModelOptions(undefined, true).then((nextOptions) => {
        if (nextOptions && typeof nextOptions === 'object') {
          setOptions(nextOptions)
          setCatalogError('')
        }
      }).catch(() => { /* keep the last usable catalog */ })
    }
    window.addEventListener('whg:settings-changed', onSettingsChanged)
    return () => window.removeEventListener('whg:settings-changed', onSettingsChanged)
  }, [])

  useEffect(() => {
    const onPetSetting = (event: Event) => {
      const enabled = (event as CustomEvent).detail
      if (typeof enabled === 'boolean') {
        setSettings((prev: any) => prev ? { ...prev, petEnabled: enabled } : prev)
      }
    }
    window.addEventListener('whg:pet-setting', onPetSetting)
    return () => window.removeEventListener('whg:pet-setting', onPetSetting)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    let alive = true
    api('settings-get').then((nextSettings) => {
      if (!alive) return
      setSettings(settingsFromResult(nextSettings) || nextSettings)
      setError('')
    }).catch(() => { /* keep the last readable settings */ })
    requestModelOptions().then((nextOptions) => {
      if (!alive) return
      if (nextOptions && typeof nextOptions === 'object') {
        setOptions(nextOptions)
        setCatalogError('')
      }
    }).catch(() => { /* the card already shows the last usable catalog */ })
    return () => { alive = false }
  }, [open])

  function save(patch: any): void {
    if (saving) return
    setSaving(true)
    setMessage('正在保存…')
    setError('')
    api('settings-set', patch).then(async (result) => {
      assertApiResult(result, '设置未被接受')
      let nextSettings = settingsFromResult(result)
      if (!nextSettings) {
        const refreshed = await api('settings-get')
        nextSettings = settingsFromResult(refreshed) || refreshed
      }
      setSettings(nextSettings)
      setMessage('已保存')
      if (Object.prototype.hasOwnProperty.call(patch, 'petEnabled')
        && typeof nextSettings?.petEnabled === 'boolean') {
        window.dispatchEvent(new CustomEvent('whg:pet-setting', { detail: nextSettings.petEnabled }))
      }
      window.dispatchEvent(new CustomEvent('whg:settings-changed', {
        detail: { settings: nextSettings, view: viewFromResult(result), sourceSessionId: null },
      }))
    }).catch((err) => {
      setMessage('')
      setError('保存失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setSaving(false))
  }

  const characters: any[] = Array.isArray(options && options.characters) ? options.characters : []
  const models: any[] = Array.isArray(options && options.models) ? options.models : []
  const characterValue = settings && settings.characterMode === 'manual' && settings.characterId
    ? 'character:' + String(settings.characterId)
    : 'follow'
  const chatValue = settings && settings.chatMode === 'manual' && settings.chatSelection
    ? 'model:' + selectionKey(settings.chatSelection)
    : settings && settings.chatMode === 'main' ? 'main' : 'configured'
  const enabled = !settings || settings.enabled !== false
  const petEnabled = !settings || settings.petEnabled !== false
  const configuredModel = optionText(
    (options && options.configuredSelection) || (settings && settings.configuredSelection),
    '插件配置模型',
  )

  return React.createElement('li', { className: 'whg-settings-card', 'data-open': String(open) },
    React.createElement('button', {
      'aria-expanded': open,
      'aria-label': (open ? '收起' : '展开') + '鲸鱼娘 Galgame 设置',
      className: 'whg-settings-head',
      onClick: () => setOpen(!open),
      type: 'button',
    },
      React.createElement('span', { className: 'whg-settings-heading' },
        React.createElement('span', { className: 'whg-settings-name' }, '鲸鱼娘 Galgame'),
        React.createElement('span', { className: 'whg-settings-desc' }, '控制插件、桌宠显示、出场角色与台词模型。'),
      ),
      React.createElement('span', { className: 'whg-settings-status' }, loading ? '读取中' : error ? '不可用' : enabled ? '已启用' : '已关闭'),
      React.createElement('span', { className: 'whg-settings-chevron', 'aria-hidden': 'true' }, '▼'),
    ),
    open
      ? React.createElement('div', { className: 'whg-settings-body' },
        React.createElement('div', { className: 'whg-settings-row' },
          React.createElement('span', { className: 'whg-settings-copy' },
            React.createElement('strong', null, '启用插件'),
            React.createElement('small', null, '关闭后隐藏桌宠，并暂停 galgame 对话入口内容。'),
          ),
          React.createElement('button', {
            'aria-checked': enabled,
            className: 'whg-settings-toggle',
            disabled: loading || saving || !settings,
            onClick: () => save({ enabled: !enabled }),
            role: 'switch',
            type: 'button',
          }, enabled ? '已开启' : '已关闭'),
        ),
        React.createElement('div', { className: 'whg-settings-row' },
          React.createElement('span', { className: 'whg-settings-copy' },
            React.createElement('strong', null, '显示桌宠'),
            React.createElement('small', null, '关闭后仍可从会话顶部的 galgame 页签进入，并在这里重新开启。'),
          ),
          React.createElement('button', {
            'aria-checked': petEnabled,
            'aria-label': '显示桌宠',
            className: 'whg-settings-toggle',
            disabled: loading || saving || !settings,
            onClick: () => save({ petEnabled: !petEnabled }),
            role: 'switch',
            type: 'button',
          }, petEnabled ? '已显示' : '已隐藏'),
        ),
        React.createElement('label', { className: 'whg-settings-row' },
          React.createElement('span', { className: 'whg-settings-copy' },
            React.createElement('strong', null, '小剧场取材'),
            React.createElement('small', null,
              settings && settings.sideStoryWebAvailable === false
                ? '当前环境没有可用的联网检索，只会使用本地任务类别。'
                : '联网检索只发送角色对应的模型名与题材词，不含你的对话或工作内容。'),
          ),
          React.createElement('select', {
            className: 'whg-settings-select',
            disabled: loading || saving || !settings,
            onChange: (event: any) => { save({ sideStorySeedSource: String(event.target.value) }) },
            value: settings && settings.sideStorySeedSource === 'activity' ? 'activity' : 'auto',
          },
            React.createElement('option', { value: 'auto' }, '优先联网检索，失败回落本地'),
            React.createElement('option', { value: 'activity' }, '只用本地任务类别（不联网）'),
          ),
        ),
        React.createElement('label', { className: 'whg-settings-row' },
          React.createElement('span', { className: 'whg-settings-copy' },
            React.createElement('strong', null, '小剧场冷却'),
            React.createElement('small', null, '两场小剧场之间要等多少分钟。填 0 表示不限制。'),
          ),
          React.createElement('input', {
            className: 'whg-settings-select',
            type: 'number',
            min: 0,
            max: settings && settings.sideStoryCooldownMax ? settings.sideStoryCooldownMax : 1440,
            step: 5,
            disabled: loading || saving || !settings,
            defaultValue: settings && Number.isFinite(Number(settings.sideStoryCooldownMinutes))
              ? Number(settings.sideStoryCooldownMinutes)
              : 30,
            key: 'skit-cooldown-' + String(settings && settings.sideStoryCooldownMinutes),
            onBlur: (event: any) => {
              const minutes = Number(event.target.value)
              if (!Number.isFinite(minutes) || minutes < 0) return
              if (settings && Number(settings.sideStoryCooldownMinutes) === Math.round(minutes)) return
              save({ sideStoryCooldownMinutes: Math.round(minutes) })
            },
          }),
        ),
        React.createElement('label', { className: 'whg-settings-row' },
          React.createElement('span', { className: 'whg-settings-copy' },
            React.createElement('strong', null, '角色来源'),
            React.createElement('small', null, '默认跟随工作区模型，也可固定为某位模型娘。'),
          ),
          React.createElement('select', {
            className: 'whg-settings-select',
            disabled: loading || saving || !settings,
            onChange: (event: any) => {
              const value = String(event.target.value)
              if (value === 'follow') save({ characterMode: 'follow', characterId: null })
              else if (value.startsWith('character:')) save({ characterMode: 'manual', characterId: value.slice(10) })
            },
            value: characterValue,
          },
            React.createElement('option', { value: 'follow' }, '跟随工作区 · ' + mainModelText(options)),
            characters.map((character: any, index: number) => React.createElement('option', {
              key: String(character.id || index),
              value: 'character:' + String(character.id || ''),
            }, optionText(character, '角色 ' + (index + 1)))),
          ),
        ),
        React.createElement('label', { className: 'whg-settings-row' },
          React.createElement('span', { className: 'whg-settings-copy' },
            React.createElement('strong', null, '对话模型'),
            React.createElement('small', null, '可继续使用插件默认模型、跟随工作区，或单独指定。'),
          ),
          React.createElement('select', {
            className: 'whg-settings-select',
            disabled: loading || saving || !settings,
            onChange: (event: any) => {
              const value = String(event.target.value)
              if (value === 'configured') save({ chatMode: 'configured', chatSelection: null })
              else if (value === 'main') save({ chatMode: 'main', chatSelection: null })
              else if (value.startsWith('model:')) {
                const selection = parseSelectionKey(value.slice(6))
                if (selection) save({ chatMode: 'manual', chatSelection: selection })
              }
            },
            value: chatValue,
          },
            React.createElement('option', { value: 'configured' }, '使用插件默认 · ' + configuredModel),
            React.createElement('option', { value: 'main' }, '跟随工作区 · ' + mainModelText(options)),
            models.map((model: any, index: number) => React.createElement('option', {
              key: selectionKey(model) || String(index),
              value: 'model:' + selectionKey(model),
            }, optionText(model, '模型 ' + (index + 1)))),
          ),
        ),
        React.createElement('p', {
          className: 'whg-settings-message' + (error ? ' error' : ''),
          role: error ? 'alert' : 'status',
        }, error || message || catalogError || '角色、模型和素材设置会在所有工作区共享，顶部标签也可以随时快捷切换。'),
      )
      : null,
  )
}

function App(props: { useSessions: any; variant?: string; sessionId?: string; standalone?: boolean }): React.ReactElement {
  const callApi = (action: string, args?: any) => api(action, props.sessionId
    ? { ...(args && typeof args === 'object' ? args : {}), sessionId: props.sessionId }
    : args)
  const callModelOptions = (force = false) => requestModelOptions(
    props.sessionId ? { sessionId: props.sessionId } : undefined,
    force,
  )
  const broadcastSessionId = eventSourceSessionId(props.sessionId)
  const appScope = props.variant === 'tab' ? 'tab' : 'overlay'
  // The standalone page has no chat view behind the game, so "退出" has to land
  // somewhere: it returns to the title screen instead of unmounting the story.
  // The runtime sets the prop and the marker; inside DSH neither exists.
  const standalone = props.standalone === true || standalonePage()
  const cacheKey = viewCacheKey(props.sessionId)
  const [viewState, setViewState] = useState<any>(() => ({ key: cacheKey, value: cachedView(cacheKey) }))
  const s = viewState && viewState.key === cacheKey ? viewState.value : cachedView(cacheKey)
  const setS = (nextOrUpdater: any) => {
    setViewState((previous: any) => {
      const base = previous && previous.key === cacheKey ? previous.value : cachedView(cacheKey)
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(base) : nextOrUpdater
      rememberView(cacheKey, next)
      return { key: cacheKey, value: next }
    })
  }
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [skitText, setSkitText] = useState('')
  const [armReset, setArmReset] = useState(false)
  const [imgFail, setImgFail] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [settled, setSettled] = useState(false)
  const [archivePanel, setArchivePanel] = useState<'history' | 'gallery' | 'profile' | 'skits' | null>(null)
  const [skitLog, setSkitLog] = useState<any[]>([])
  const [skitLogLoading, setSkitLogLoading] = useState(false)
  const [skitLogError, setSkitLogError] = useState<string | null>(null)
  const [skitCgAvailable, setSkitCgAvailable] = useState(false)
  const [galleryItems, setGalleryItems] = useState<any[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryError, setGalleryError] = useState<string | null>(null)
  const [gallerySelected, setGallerySelected] = useState<any>(null)
  const [galleryDetailLoading, setGalleryDetailLoading] = useState(false)
  const [galleryDetailError, setGalleryDetailError] = useState<string | null>(null)
  const [rewardCgDetail, setRewardCgDetail] = useState<any>(null)
  const [rewardCgLoading, setRewardCgLoading] = useState(false)
  const [rewardCgError, setRewardCgError] = useState<string | null>(null)
  const [pickerPanel, setPickerPanel] = useState<'character' | 'chat' | 'background' | 'sprite' | 'skit' | null>(null)
  // Image generation: one shared draft so switching between the sprite and
  // background panels keeps whatever the user already typed.
  const [genPrompt, setGenPrompt] = useState('')
  const [genBusy, setGenBusy] = useState(false)
  const [genPreview, setGenPreview] = useState<string | null>(null)
  const [genError, setGenError] = useState('')
  const [genStatus, setGenStatus] = useState<any>(null)
  const [stageCgBusy, setStageCgBusy] = useState(false)
  // ---- GALGAME 模式 ----
  const [galOpen, setGalOpen] = useState(props.variant === 'tab')
  const [galLanding,setGalLanding]=useState(true)
  const [standaloneTitleRevision,setStandaloneTitleRevision]=useState(0)
  const [sceneEditorOpen, setSceneEditorOpen] = useState(false)
  const [scenePreview, setScenePreview] = useState<any>(null)
  const [gal, setGal] = useState<any>(null)
  const [galBusy, setGalBusy] = useState(false)
  const [galPanel, setGalPanel] = useState<string>('')
  const [signalPanelOpen,setSignalPanelOpen]=useState(false)
  const galSendLock = useRef(false)
  const assetsOpenedFromMain = useRef(false)
  const galFailedSend = useRef<{ text: string; requestId: string; targetRoleId?:string } | null>(null)
  const [galLog, setGalLog] = useState<any[]>([])
  const [galAuto, setGalAuto] = useState(false)
  // galgame 正文的打字机。和聊天框那套分开：剧情台词更长，节奏要单独调。
  const [galTyped, setGalTyped] = useState(0)
  const signalReaderController=useRef<any>(null)
  // 自由对话：玩家说的话、她的回话、发送中。
  const [galSay, setGalSay] = useState('')
  // 输入框的两种身份：speech=你开口说话；direct=你直接指定接下来发生什么。
  // 选项里选「自己决定走向」会切到 direct，回车发送后自动切回 speech。
  const [galDirectText, setGalDirect] = useState<{mode:string;at:number}>({mode:'speech',at:0})
  const [galSayBusy, setGalSayBusy] = useState(false)
  const [galReply, setGalReply] = useState('')
  // 画面特效：进入带 fx 的节点时闪一下，几百毫秒后自动清掉。
  const [galFx, setGalFx] = useState('')
  const [galCg, setGalCg] = useState<any[]>([])
  const [galBonds, setGalBonds] = useState<any[]>([])
  // 标题页右侧大图跟着这个角色走；点底部头像条换人。
  const [galTitleRole, setGalTitleRole] = useState('')
  const galStageRef = useRef<HTMLDivElement | null>(null)
  const [galTree, setGalTree] = useState<any>(null)
  const [galCatalog, setGalCatalog] = useState<any[]>([])
  const [galChapterLog, setGalChapterLog] = useState<any>(null)

  function openGalTree(): void {
    setGalPanel('tree')
    callApi('gal-tree').then((result) => setGalTree(result || null)).catch(() => setGalTree(null))
  }

  function openGalCatalog(): void {
    setGalPanel('catalog')
    callApi('gal-catalog').then((result) => {
      setGalCatalog(result && Array.isArray(result.chapters) ? result.chapters : [])
    }).catch(() => setGalCatalog([]))
  }

  function openChapterLog(chapterId: string): void {
    callApi('gal-chapter-log', { chapterId }).then((result) => {
      setGalChapterLog(result && result.items ? result : null)
      setGalPanel('chapterlog')
    }).catch(() => setGalChapterLog(null))
  }
  // 阅读体验的设置：文字速度、自动推进间隔、是否隐藏界面。
  const [galSettings, setGalSettings] = useState<{ speed: number; auto: number; hideUI: boolean }>(() => {
    try {
      const raw = window.localStorage.getItem('whg:gal-settings')
      const parsed = raw ? JSON.parse(raw) : null
      if (parsed && typeof parsed === 'object') {
        return {
          speed: Number.isFinite(Number(parsed.speed)) && Number(parsed.speed)>=0 && Number(parsed.speed)<=60 ? Number(parsed.speed) : 22,
          auto: Number(parsed.auto) || 2200,
          hideUI: parsed.hideUI === true,
        }
      }
    } catch (err) { /* 读不到就用默认 */ }
    return { speed: 22, auto: 2200, hideUI: false }
  })
  function galApplySettings(next: { speed: number; auto: number; hideUI: boolean }): void {
    setGalSettings(next)
    try { window.localStorage.setItem('whg:gal-settings', JSON.stringify(next)) } catch (err) { /* ignore */ }
  }

  function openGalBonds(): void {
    if(gal?.free){setGalPanel('journal');return}
    setGalPanel('bonds')
    callApi('gal-bonds').then((result) => {
      setGalBonds(result && Array.isArray(result.bonds) ? result.bonds : [])
    }).catch(() => setGalBonds([]))
  }
  const [galSkip, setGalSkip] = useState(false)
  const [galError, setGalError] = useState('')
  // Typewriter: one character at a time, deterministic, no timers left behind.
  const [typedCount, setTypedCount] = useState(0)
  const TYPE_MS = 20
  const [skitTopic, setSkitTopic] = useState('')
  const [modelOptions, setModelOptions] = useState<any>(null)
  const [pluginSettings, setPluginSettings] = useState<any>(null)
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerCatalogLoading, setPickerCatalogLoading] = useState(false)
  const [pickerError, setPickerError] = useState('')
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [backgroundFileName, setBackgroundFileName] = useState('')
  const [spritePreview, setSpritePreview] = useState<string | null>(null)
  const [spriteFileName, setSpriteFileName] = useState('')
  const [customSprite, setCustomSprite] = useState<string | null>(null)
  const [profileDraft, setProfileDraft] = useState<CharacterProfile>({ ...EMPTY_CHARACTER_PROFILE })
  const [profileBaseline, setProfileBaseline] = useState<CharacterProfile>({ ...EMPTY_CHARACTER_PROFILE })
  const [profileBuiltIn, setProfileBuiltIn] = useState<CharacterProfile>({ ...EMPTY_CHARACTER_PROFILE })
  const [profileCharacterId, setProfileCharacterId] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileHasOverrides, setProfileHasOverrides] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const bgCache = useRef<string | null>(null)
  const bgCacheRevision = useRef<number | null>(null)
  const spriteCache = useRef<Record<string, string | null>>({})
  const spriteRevisionCache = useRef<Record<string, number>>({})
  const archiveRef = useRef<HTMLElement | null>(null)
  const archiveCloseRef = useRef<HTMLButtonElement | null>(null)
  const archiveReturnFocus = useRef<HTMLElement | null>(null)
  const historyScrollRef = useRef<HTMLDivElement | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const pickerReturnFocus = useRef<HTMLElement | null>(null)
  const bgFileRef = useRef<HTMLInputElement | null>(null)
  const spriteFileRef = useRef<HTMLInputElement | null>(null)
  const profileFirstFieldRef = useRef<HTMLInputElement | null>(null)
  const profileRequestSeq = useRef(0)
  const pickerRequestSeq = useRef(0)
  const galleryListRequestSeq = useRef(0)
  const galleryDetailRequestSeq = useRef(0)
  const rewardCgRequestSeq = useRef(0)

  useEffect(() => {
    let alive = true
    callApi('view').then((v) => { if (alive) { setS(v); setApiError(null) } }).catch((e) => { if (alive) setApiError('galgame 服务未就绪：' + String(e && e.message ? e.message : e)) })
    return () => { alive = false }
  }, [props.sessionId])

  // The conversation view is the game entrance, including when an old layout is published.
  useEffect(()=>{
    if(props.variant!=='tab')return
    let live=true;setGalOpen(true);setGalLanding(true);setGalBusy(true)
    ;(async()=>{const free=await callApi('gal-free-state');const result=free?.active&&free?.node?free:await callApi('gal-state');if(live)galApply(result)})()
      .catch(e=>{if(live)setGalError(String(e?.message||e))}).finally(()=>{if(live)setGalBusy(false)})
    return()=>{live=false}
  },[props.variant,props.sessionId])

  useEffect(() => () => {
    galleryListRequestSeq.current += 1
    galleryDetailRequestSeq.current += 1
    rewardCgRequestSeq.current += 1
  }, [props.sessionId])

  const rewardCgId = s && s.cg && s.cg.status === 'ready' && s.cg.seen !== true
    ? String(s.cg.cgId || '').trim()
    : ''

  useEffect(() => {
    if (!rewardCgId) {
      rewardCgRequestSeq.current += 1
      setRewardCgDetail(null)
      setRewardCgLoading(false)
      setRewardCgError(null)
      return undefined
    }
    loadRewardCg(rewardCgId)
    return () => { rewardCgRequestSeq.current += 1 }
  }, [props.sessionId, rewardCgId])

  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 4000)
    return () => clearTimeout(t)
  }, [])

  // while the galgame tab is actually visible: hide the workspace composer
  // (restored the moment the tab hides)
  useEffect(() => {
    if (props.variant !== 'tab') return
    const sync = () => {
      const el = document.getElementById('whg-tab-root')
      const visible = !!el && el.offsetParent !== null
      if (visible) {
        document.body.dataset.whaleGalgameActive = ''
        setComposerHidden(true)
        syncTabLayout(true)
      } else {
        delete document.body.dataset.whaleGalgameActive
        setComposerHidden(false)
        syncTabLayout(false)
      }
    }
    sync()
    const id = setInterval(sync, 1200)
    return () => {
      clearInterval(id)
      delete document.body.dataset.whaleGalgameActive
      setComposerHidden(false)
      syncTabLayout(false)
    }
  }, [props.variant])

  useEffect(() => {
    if (s && s.enabled === false) return undefined
    const id = setInterval(() => {
      callApi('view').then((v) => {
        if (v && typeof v === 'object') setS(v)
      }).catch(() => { /* server transient */ })
    }, 6000)
    return () => clearInterval(id)
  }, [s && s.enabled, props.sessionId])

  useEffect(() => {
    if (!s) return undefined
    const expectedRevision = backgroundRevisionValue(s.backgroundRevision) ?? 0
    if (s.bg === 'cg' || s.bg === 'custom') {
      if (bgCacheRevision.current === expectedRevision) return undefined
      let alive = true
      callApi('bg-data').then((r) => {
        if (!alive) return
        const returnedRevision = backgroundRevisionValue(r && r.backgroundRevision) ?? expectedRevision
        bgCache.current = r && typeof r.dataUrl === 'string' && r.dataUrl ? r.dataUrl : null
        bgCacheRevision.current = returnedRevision
        setS((prev: any) => prev ? { ...prev, backgroundRevision: returnedRevision } : prev)
      }).catch(() => { /* keep the last rendered background until the next poll */ })
      return () => { alive = false }
    } else {
      bgCache.current = null
      bgCacheRevision.current = expectedRevision
    }
    return undefined
  }, [s && s.bg, s && s.backgroundRevision, props.sessionId])

  useEffect(() => {
    if (!s || s.enabled === false) {
      setCustomSprite(null)
      return undefined
    }
    const characterId = String(s.current || '')
    const revision = Number(s.spriteRevision)
    if (!characterId) {
      setCustomSprite(null)
      return undefined
    }
    if (Object.prototype.hasOwnProperty.call(spriteCache.current, characterId)
      && (!Number.isFinite(revision) || spriteRevisionCache.current[characterId] === revision)) {
      setCustomSprite(spriteCache.current[characterId])
      return undefined
    }
    let alive = true
    callApi('sprite-data', { characterId }).then((result) => {
      assertApiResult(result, '角色立绘读取失败')
      if (!alive) return
      const returnedId = String(result && (result.characterId || result.charId) ? (result.characterId || result.charId) : characterId)
      const dataUrl = result && typeof result.dataUrl === 'string' && result.dataUrl ? result.dataUrl : null
      spriteCache.current[returnedId] = dataUrl
      const returnedRevision = Number(result && result.revision)
      if (Number.isFinite(returnedRevision)) spriteRevisionCache.current[returnedId] = returnedRevision
      if (returnedId === characterId) {
        setCustomSprite(dataUrl)
        setImgFail(false)
      }
    }).catch(() => {
      if (alive) setCustomSprite(null)
    })
    return () => { alive = false }
  }, [s && s.current, s && s.enabled, s && s.spriteRevision, props.sessionId])

  useEffect(() => {
    const onSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail && detail.settings) setPluginSettings(detail.settings)
      const eventView = scopedEventView(detail, props.sessionId)
      if (eventView) {
        setS(eventView)
      } else {
        callApi('view').then((view) => {
          if (view && typeof view === 'object') setS(view)
        }).catch(() => { /* server transient */ })
      }
    }
    window.addEventListener('whg:settings-changed', onSettingsChanged)
    return () => window.removeEventListener('whg:settings-changed', onSettingsChanged)
  }, [props.sessionId])

  useEffect(() => {
    const onBackgroundChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!detail || typeof detail !== 'object') return
      bgCache.current = typeof detail.dataUrl === 'string' && detail.dataUrl ? detail.dataUrl : null
      bgCacheRevision.current = backgroundRevisionValue(detail.backgroundRevision)
        ?? backgroundRevisionValue(detail.view && detail.view.backgroundRevision)
      const eventView = scopedEventView(detail, props.sessionId)
      if (eventView) {
        setS(eventView)
      } else {
        callApi('view').then((nextView) => {
          if (nextView && typeof nextView === 'object') setS(nextView)
        }).catch(() => { /* server transient */ })
      }
    }
    window.addEventListener('whg:bg-changed', onBackgroundChanged)
    return () => window.removeEventListener('whg:bg-changed', onBackgroundChanged)
  }, [props.sessionId])

  useEffect(() => {
    const currentId = String(s && s.current ? s.current : '')
    const onSpriteChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!detail || typeof detail !== 'object') return
      const eventView = scopedEventView(detail, props.sessionId)
      const characterId = String(detail.characterId || detail.charId || (eventView && eventView.current) || currentId)
      const dataUrl = typeof detail.dataUrl === 'string' && detail.dataUrl ? detail.dataUrl : null
      if (characterId) spriteCache.current[characterId] = dataUrl
      const revision = Number(detail.revision !== undefined ? detail.revision : eventView && eventView.spriteRevision)
      if (characterId && Number.isFinite(revision)) spriteRevisionCache.current[characterId] = revision
      if (!characterId || characterId === currentId) {
        setCustomSprite(dataUrl)
        setImgFail(false)
      }
      if (eventView) {
        setS(eventView)
      } else {
        callApi('view').then((nextView) => {
          if (nextView && typeof nextView === 'object') setS(nextView)
        }).catch(() => { /* server transient */ })
      }
    }
    window.addEventListener('whg:sprite-changed', onSpriteChanged)
    return () => window.removeEventListener('whg:sprite-changed', onSpriteChanged)
  }, [s && s.current, props.sessionId])

  useEffect(() => {
    const currentId = String(s && s.current ? s.current : '')
    const onProfileChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!detail || typeof detail !== 'object') return
      const eventView = scopedEventView(detail, props.sessionId)
      const characterId = String(detail.characterId || detail.charId || (eventView && eventView.current) || currentId)
      const nextProfile = profileFromResult(detail)
      if (archivePanel === 'profile' && characterId && characterId === (profileCharacterId || currentId)) {
        if (nextProfile) {
          const nextBuiltIn = builtInProfileFromResult(detail)
          setProfileDraft(nextProfile)
          setProfileBaseline(nextProfile)
          if (nextBuiltIn) setProfileBuiltIn(nextBuiltIn)
          setProfileLoaded(true)
          setProfileLoading(false)
          setProfileHasOverrides(profileHasOverridesFromResult(detail, profileHasOverrides))
          setProfileError('')
        } else {
          loadCharacterProfile(characterId)
        }
      }
      if (eventView) {
        setS(eventView)
      } else {
        callApi('view').then((nextView) => {
          if (nextView && typeof nextView === 'object') setS(nextView)
        }).catch(() => { /* server transient */ })
      }
    }
    window.addEventListener('whg:profile-changed', onProfileChanged)
    return () => window.removeEventListener('whg:profile-changed', onProfileChanged)
  }, [archivePanel, profileCharacterId, profileHasOverrides, s && s.current, props.sessionId])

  useEffect(() => {
    setImgFail(false)
  }, [s && s.current, s && s.sprite, customSprite, props.sessionId])

  useEffect(() => {
    const onPetSetting = (event: Event) => {
      const enabled = (event as CustomEvent).detail
      if (typeof enabled === 'boolean') {
        setS((prev: any) => prev ? { ...prev, petEnabled: enabled } : prev)
      }
    }
    window.addEventListener('whg:pet-setting', onPetSetting)
    return () => window.removeEventListener('whg:pet-setting', onPetSetting)
  }, [])

  useEffect(() => {
    if (!archivePanel) return undefined
    const frame = requestAnimationFrame(() => {
      if (!archiveRef.current || archiveRef.current.contains(document.activeElement)) return
      if (archivePanel === 'profile' && !profileLoading && profileLoaded) profileFirstFieldRef.current?.focus()
      else archiveCloseRef.current?.focus()
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (gallerySelected) closeGalleryDetail()
        else closeArchive()
        return
      }
      if (event.key !== 'Tab' || !archiveRef.current) return
      const focusable = Array.from(archiveRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'))
        .filter((node) => node.offsetParent !== null)
      if (focusable.length === 0) {
        event.preventDefault()
        archiveCloseRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!archiveRef.current.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [archivePanel, gallerySelected, profileLoaded, profileLoading])

  useEffect(() => {
    if (!pickerPanel) return undefined
    const focusFrame = requestAnimationFrame(() => {
      const target = pickerRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
        || pickerRef.current?.querySelector<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')
      target?.focus()
    })
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (target && (pickerRef.current?.contains(target) || pickerReturnFocus.current?.contains(target))) return
      setPickerPanel(null)
      setBackgroundPreview(null)
      setSpritePreview(null)
      setPickerError('')
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        const target = pickerReturnFocus.current
        setPickerPanel(null)
        setBackgroundPreview(null)
        setSpritePreview(null)
        setPickerError('')
        requestAnimationFrame(() => target?.focus())
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !pickerRef.current) return
      const items = Array.from(pickerRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled)'))
        .filter((node) => node.offsetParent !== null)
      if (!items.length) return
      const current = items.indexOf(document.activeElement as HTMLElement)
      const next = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : current < 0
            ? (event.key === 'ArrowDown' ? 0 : items.length - 1)
            : event.key === 'ArrowDown'
              ? (current + 1) % items.length
              : (current - 1 + items.length) % items.length
      event.preventDefault()
      items[next].focus()
    }
    document.addEventListener('mousedown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('mousedown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [pickerPanel])

  useEffect(() => {
    if (s && s.enabled === false) {
      setPickerPanel(null)
      setArchivePanel(null)
    }
  }, [s && s.enabled])

  useEffect(() => {
    if (archivePanel !== 'profile') return
    const currentId = String(s && s.current ? s.current : '')
    if (currentId && currentId !== profileCharacterId && !profileLoading) loadCharacterProfile(currentId)
  }, [archivePanel, profileCharacterId, profileLoading, s && s.current])

  useEffect(() => {
    if (archivePanel !== 'history') return
    const frame = requestAnimationFrame(() => {
      const node = historyScrollRef.current
      if (node) node.scrollTop = node.scrollHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [archivePanel, s && s.history && s.history.length])

  function act(action: string, args?: any): void {
    if (busy) return
    setBusy(true)
    callApi(action, args).then((v) => {
      if (v && typeof v === 'object') {
        setS(v)
        setApiError(null)
        if (action === 'pet-set' && typeof v.petEnabled === 'boolean') {
          window.dispatchEvent(new CustomEvent('whg:pet-setting', { detail: v.petEnabled }))
        }
        if (action === 'cg-save-bg') {
          window.dispatchEvent(new CustomEvent('whg:bg-changed', {
            detail: { dataUrl: bgCache.current, backgroundRevision: v.backgroundRevision, view: v, sourceSessionId: broadcastSessionId },
          }))
        } else if (action === 'cg-clear-bg') {
          window.dispatchEvent(new CustomEvent('whg:bg-changed', {
            detail: { dataUrl: null, backgroundRevision: v.backgroundRevision, view: v, sourceSessionId: broadcastSessionId },
          }))
        }
      }
    }).catch((e) => {
      setApiError(String(e && e.message ? e.message : e))
    }).finally(() => {
      setBusy(false)
    })
  }

  /** Manual nudge: +-5 points, clamped, then adopt the returned view. */
  function nudgeTrait(kind: string, id: string, delta: number, current: number): void {
    const next = Math.max(0, Math.min(100, Math.round(current + delta)))
    if (next === current) return
    callApi('traits-set', { kind, id, value: next }).then((result) => {
      const nextView = viewFromResult(result)
      if (nextView) setS(nextView)
      setApiError(null)
    }).catch((err) => {
      setApiError(String(err && err.message ? err.message : err))
    })
  }


  // Fallback catalogue: the panel must advertise the system even when the host
  // is still the pre-restart build (no `traits` in the view). The controls stay
  // disabled in that case instead of silently failing.
  const TRAIT_FALLBACK = {
    xp: [
      { id: 'normal', label: '正常' }, { id: 'feminize', label: '雌堕' },
      { id: 'bdsm', label: 'BDSM' }, { id: 'group', label: '群交' },
      { id: 'yuri', label: '百合' },
    ],
    dev: [
      { id: 'mouth', label: '口', act: '口交' }, { id: 'breast', label: '胸', act: '乳交' },
      { id: 'vagina', label: '蜜穴', act: '性交' }, { id: 'anus', label: '肛门', act: '肛交' },
      { id: 'foot', label: '脚', act: '脚交' },
    ],
  }


  function bondMeters(): React.ReactElement {
    const live = s && s.traits && Array.isArray(s.traits.xp) ? s.traits : null
    const rows = (kind: string) => {
      const source = live ? live[kind] : TRAIT_FALLBACK[kind]
      return (source || []).map((row: any) => ({
        id: row.id,
        label: row.label,
        act: typeof row.act === 'string' ? row.act : '',
        value: Number(row.value) || 0,
        level: Number(row.level) || 1,
        max: Number(row.max) || 100,
      }))
    }
    const editable = !!live
    const column = (kind: string, title: string, hint: string) =>
      React.createElement('div', { className: 'whg-trait-col' },
        React.createElement('div', { className: 'whg-trait-col-head' },
          React.createElement('span', null, title),
          React.createElement('span', null, hint)),
        rows(kind).map((row: any, index: number, all: any[]) =>
          React.createElement(React.Fragment, { key: kind + '-' + row.id },
            row.nsfw && (index === 0 || !all[index - 1].nsfw)
              ? React.createElement('div', { className: 'whg-trait-divider' }, 'NSFW')
              : null,
            React.createElement('div', { className: 'whg-trait-row' },
          React.createElement('span', { className: 'whg-trait-label', title: row.act ? row.label + ' · ' + row.act : row.label },
            row.label,
            row.act ? React.createElement('em', { className: 'whg-trait-act' }, row.act) : null),
          React.createElement('span', { className: 'whg-trait-level' }, 'Lv.' + row.level),
          React.createElement('div', { className: 'whg-trait-track' },
            React.createElement('div', {
              className: 'whg-trait-fill kind-' + kind,
              style: { width: Math.min(100, Math.round((row.value / Math.max(1, row.max)) * 100)) + '%' },
            })),
          React.createElement('span', { className: 'whg-trait-value' }, row.value + '/' + row.max),
          React.createElement('button', {
            className: 'whg-trait-btn',
            disabled: !editable || row.value <= 0,
            onClick: () => nudgeTrait(kind, row.id, -5, row.value),
            title: editable ? '降低 5' : '需要重启 DSH 后可用',
            type: 'button',
          }, '−'),
          React.createElement('button', {
            className: 'whg-trait-btn',
            disabled: !editable || row.value >= row.max,
            onClick: () => nudgeTrait(kind, row.id, 5, row.value),
            title: editable ? '提升 5' : '需要重启 DSH 后可用',
            type: 'button',
          }, '+'),
            ),
          )),
      )
    return React.createElement('section', { 'aria-labelledby': 'whg-profile-traits-' + appScope, className: 'whg-profile-section whg-trait-section' },
      React.createElement('div', { className: 'whg-profile-section-head', id: 'whg-profile-traits-' + appScope },
        React.createElement('strong', null, 'BOND METERS'),
        React.createElement('span', null, editable
          ? 'XP 与各部位开发进度 · Lv.1–' + (live.levels || 5)
          : '未就绪：宿主仍在跑旧版本，重启 DSH 后生效'),
      ),
      React.createElement('div', { className: 'whg-trait-grid' },
        column('xp', 'XP 板块', editable ? '对话中自然成长' : '只读'),
        column('dev', '各部位开发进度', editable ? '「靠近一点」推进' : '只读'),
      ),
    )
  }

  function closePicker(restoreFocus = true): void {
    pickerRequestSeq.current += 1
    const target = pickerReturnFocus.current
    pickerReturnFocus.current = null
    setPickerPanel(null)
    setPickerLoading(false)
    setPickerCatalogLoading(false)
    setPickerError('')
    setBackgroundPreview(null)
    setBackgroundFileName('')
    setSpritePreview(null)
    setSpriteFileName('')
    if (restoreFocus && target && target.isConnected) requestAnimationFrame(() => target.focus())
  }

  function loadPickerData(): void {
    const requestId = ++pickerRequestSeq.current
    setPickerCatalogLoading(true)
    setPickerError('')
    callApi('settings-get').then((settingsResult) => {
      if (requestId !== pickerRequestSeq.current) return
      setPluginSettings(settingsFromResult(settingsResult) || settingsResult)
    }).catch((err) => {
      if (requestId === pickerRequestSeq.current) {
        setPickerError('插件设置读取失败：' + String(err && err.message ? err.message : err))
      }
    })
    callModelOptions().then((options) => {
      if (requestId !== pickerRequestSeq.current) return
      setModelOptions(options && typeof options === 'object' ? options : { characters: [], models: [] })
    }).catch((err) => {
      if (requestId === pickerRequestSeq.current) {
        setPickerError('模型列表读取失败：' + String(err && err.message ? err.message : err))
      }
    }).finally(() => {
      if (requestId === pickerRequestSeq.current) setPickerCatalogLoading(false)
    })
  }

  function openPicker(kind: 'character' | 'chat' | 'background' | 'sprite' | 'skit', trigger: HTMLElement): void {
    if (pickerPanel === kind) {
      closePicker(false)
      return
    }
    pickerReturnFocus.current = trigger
    setPickerPanel(kind)
    setPickerError('')
    setBackgroundPreview(null)
    setBackgroundFileName('')
    setSpritePreview(null)
    setSpriteFileName('')
    if (kind === 'character' || kind === 'chat') loadPickerData()
    // Both asset pickers carry the AI panel, which needs to know which backend
    // is reachable before it can enable its buttons.
    if (kind === 'sprite' || kind === 'background') refreshImageStatus()
  }

  function updateRuntimeSettings(patch: any): void {
    if (pickerLoading) return
    setPickerLoading(true)
    setPickerError('')
    callApi('settings-set', patch).then((result) => {
      assertApiResult(result, '切换未被接受')
      const nextSettings = settingsFromResult(result) || {
        ...(pluginSettings && typeof pluginSettings === 'object' ? pluginSettings : {
          enabled: s && s.enabled !== false,
          petEnabled: s && s.petEnabled !== false,
          characterMode: s && s.characterMode,
          characterId: s && s.characterId,
          chatMode: s && s.chatMode,
          chatSelection: s && s.chatSelection,
        }),
        ...patch,
      }
      const nextView = viewFromResult(result)
      if (nextSettings) setPluginSettings(nextSettings)
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent('whg:settings-changed', {
        detail: { settings: nextSettings, view: nextView, sourceSessionId: broadcastSessionId },
      }))
      closePicker()
      // settings-set is the persistence boundary. If an older service omits
      // the view payload, do not leave the menu looking stuck while a second
      // read is pending; refresh the scene independently after closing it.
      if (!nextView) {
        callApi('view').then((refreshedView) => {
          if (refreshedView && typeof refreshedView === 'object') {
            setS(refreshedView)
            setApiError(null)
          }
        }).catch((err) => {
          setApiError('切换已保存，但画面刷新失败：' + String(err && err.message ? err.message : err))
        })
      } else {
        setApiError(null)
      }
    }).catch((err) => {
      setPickerError('切换失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setPickerLoading(false))
  }

  function chooseBackgroundFile(event: any): void {
    const file: File | undefined = event && event.target && event.target.files ? event.target.files[0] : undefined
    if (event && event.target) event.target.value = ''
    if (!file) return
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'])
    if (!allowedTypes.has(String(file.type || '').toLowerCase())) {
      setPickerError('请选择 PNG、JPG、WebP 或 AVIF 图片。')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setPickerError('图片不能超过 12 MB，请压缩后重试。')
      return
    }
    setPickerError('')
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setPickerError('图片预览失败，请换一张图片。')
        return
      }
      setBackgroundPreview(reader.result)
      setBackgroundFileName(file.name)
    }
    reader.onerror = () => setPickerError('图片读取失败，请重新选择。')
    reader.readAsDataURL(file)
  }

  function applyBackgroundUpload(): void {
    if (!backgroundPreview || pickerLoading) return
    setPickerLoading(true)
    setPickerError('')
    callApi('bg-upload', { dataUrl: backgroundPreview, fileName: backgroundFileName }).then(async (result) => {
      assertApiResult(result, '背景未保存')
      bgCache.current = backgroundPreview
      let nextView = viewFromResult(result)
      if (!nextView) nextView = await callApi('view')
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent('whg:bg-changed', {
        detail: { dataUrl: backgroundPreview, backgroundRevision: nextView && nextView.backgroundRevision, view: nextView, sourceSessionId: broadcastSessionId },
      }))
      closePicker()
    }).catch((err) => {
      setPickerError('背景保存失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setPickerLoading(false))
  }

  function restoreDefaultBackground(): void {
    if (pickerLoading) return
    setPickerLoading(true)
    setPickerError('')
    const action = s && s.bg === 'cg' ? 'cg-clear-bg' : 'bg-clear-custom'
    callApi(action).then(async (result) => {
      assertApiResult(result, '背景未恢复')
      bgCache.current = null
      let nextView = viewFromResult(result)
      if (!nextView) nextView = await callApi('view')
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent('whg:bg-changed', {
        detail: { dataUrl: null, backgroundRevision: nextView && nextView.backgroundRevision, view: nextView, sourceSessionId: broadcastSessionId },
      }))
      closePicker()
    }).catch((err) => {
      setPickerError('恢复默认背景失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setPickerLoading(false))
  }

  function applyBuiltinBackground(key: string): void {
    if (!key || pickerLoading) return
    setPickerLoading(true)
    setPickerError('')
    callApi('bg-set-builtin', { key }).then(async (result) => {
      assertApiResult(result, '内置背景未应用')
      bgCache.current = null
      let nextView = viewFromResult(result)
      if (!nextView) nextView = await callApi('view')
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent('whg:bg-changed', {
        detail: { dataUrl: null, backgroundRevision: nextView && nextView.backgroundRevision, view: nextView, sourceSessionId: broadcastSessionId },
      }))
      closePicker()
    }).catch((err) => {
      setPickerError('内置背景切换失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setPickerLoading(false))
  }

  function chooseSpriteFile(event: any): void {
    const file: File | undefined = event && event.target && event.target.files ? event.target.files[0] : undefined
    if (event && event.target) event.target.value = ''
    if (!file) return
    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/avif'])
    if (!allowedTypes.has(String(file.type || '').toLowerCase())) {
      setPickerError('请选择 PNG、JPG、WebP 或 AVIF 图片。')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      setPickerError('图片不能超过 12 MB，请压缩后重试。')
      return
    }
    setPickerError('')
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setPickerError('立绘预览失败，请换一张图片。')
        return
      }
      setSpritePreview(reader.result)
      setSpriteFileName(file.name)
    }
    reader.onerror = () => setPickerError('图片读取失败，请重新选择。')
    reader.readAsDataURL(file)
  }

  function applySpriteUpload(): void {
    const dataUrl = spritePreview
    const characterId = String(s && s.current ? s.current : '')
    if (!dataUrl || !characterId || pickerLoading) return
    setPickerLoading(true)
    setPickerError('')
    callApi('sprite-upload', { characterId, dataUrl, fileName: spriteFileName }).then(async (result) => {
      assertApiResult(result, '角色立绘未保存')
      const savedCharacterId = String(result && (result.characterId || result.charId) ? (result.characterId || result.charId) : characterId)
      const revision = Number(result && result.revision)
      spriteCache.current[savedCharacterId] = dataUrl
      if (Number.isFinite(revision)) spriteRevisionCache.current[savedCharacterId] = revision
      let nextView = viewFromResult(result)
      if (!nextView) nextView = await callApi('view')
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent('whg:sprite-changed', {
        detail: { characterId: savedCharacterId, dataUrl, revision, view: nextView, sourceSessionId: broadcastSessionId },
      }))
      closePicker()
    }).catch((err) => {
      setPickerError('立绘保存失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setPickerLoading(false))
  }

  function restoreDefaultSprite(): void {
    const characterId = String(s && s.current ? s.current : '')
    if (!characterId || pickerLoading) return
    setPickerLoading(true)
    setPickerError('')
    callApi('sprite-clear', { characterId }).then(async (result) => {
      assertApiResult(result, '默认立绘未恢复')
      const savedCharacterId = String(result && (result.characterId || result.charId) ? (result.characterId || result.charId) : characterId)
      const revision = Number(result && result.revision)
      spriteCache.current[savedCharacterId] = null
      if (Number.isFinite(revision)) spriteRevisionCache.current[savedCharacterId] = revision
      let nextView = viewFromResult(result)
      if (!nextView) nextView = await callApi('view')
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent('whg:sprite-changed', {
        detail: { characterId: savedCharacterId, dataUrl: null, revision, view: nextView, sourceSessionId: broadcastSessionId },
      }))
      closePicker()
    }).catch((err) => {
      setPickerError('恢复默认立绘失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setPickerLoading(false))
  }

  const stageCgPoll = useRef<any>(null)

  // The dialogue text the typewriter is currently revealing. Recomputed every
  // render; the effect below resets whenever it changes.
  const dialogueScene = sideStoryScene()
  const dialogueLast = lastLine()
  const dialogueBeat = dialogueScene ? (dialogueScene.beats || [])[sideStoryBeatIndex(dialogueScene)] : null
  const dialogueSource = dialogueScene
    ? String((dialogueBeat && dialogueBeat.text) || '')
    : String((dialogueLast && dialogueLast.text) || '')
  const typing = typedCount < dialogueSource.length
  useEffect(() => {
    setTypedCount(0)
  }, [dialogueSource])
  useEffect(() => {
    if (typedCount >= dialogueSource.length) return undefined
    const timer = setTimeout(() => {
      // Fixed time budget per line, not fixed characters per tick.
      const step = Math.max(2, Math.ceil(dialogueSource.length / 90))
      setTypedCount((current) => Math.min(dialogueSource.length, current + step))
    }, TYPE_MS)
    return () => clearTimeout(timer)
  }, [typedCount, dialogueSource])
  function revealDialogue(): void {
    setTypedCount(dialogueSource.length)
  }
  useEffect(() => {
    if (!stageCgBusy) return undefined
    const view: any = s
    if (view && view.bg !== 'cg') {
      // The backdrop moved off the CG: generation finished or was cleared.
      if (stageCgPoll.current) { clearInterval(stageCgPoll.current); stageCgPoll.current = null }
      setStageCgBusy(false)
    }
    return undefined
  }, [s, stageCgBusy])

  function refreshImageStatus(): void {
    setGenError('')
    callApi('image-status').then((result) => {
      if (result && typeof result === 'object') setGenStatus(result)
    }).catch(() => setGenStatus(null))
  }

  function suggestImagePrompt(): void {
    if (genBusy) return
    setGenBusy(true)
    setGenError('')
    callApi('image-prompt-suggest', {
      characterId: s && s.current ? s.current : '',
      hint: genPrompt,
    }).then((result) => {
      if (result && typeof result.prompt === 'string' && result.prompt) {
        setGenPrompt(result.prompt)
        if (result.status) setGenStatus(result)
      } else {
        setGenError('没能生成提示词，请手动填写')
      }
    }).catch((err) => {
      setGenError('提示词生成失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setGenBusy(false))
  }

  function runImageGenerate(target: 'sprite' | 'background'): void {
    if (genBusy) return
    if (!genPrompt.trim()) { setGenError('先写一句想要什么样的画面，或者点「按角色设定」自动填'); return }
    setGenBusy(true)
    setGenError('')
    setGenPreview(null)
    callApi('image-generate', {
      target,
      characterId: s && s.current ? s.current : '',
      prompt: genPrompt,
      width: target === 'sprite' ? 832 : 1280,
      height: target === 'sprite' ? 1216 : 720,
      transparent: target === 'sprite',
      nsfw: !!(genStatus && genStatus.nsfw),
    }).then((result) => {
      if (!result || result.ok !== true || typeof result.dataUrl !== 'string') {
        setGenError((result && result.error) || '生成失败')
        if (result && result.backends) setGenStatus((previous: any) => ({ ...(previous || {}), backends: result.backends }))
        return
      }
      setGenPreview(result.dataUrl)
      if (result.backend) setGenStatus((previous: any) => ({ ...(previous || {}), resolved: result.backend }))
      refreshImageStatus()
    }).catch((err) => {
      setGenError('生成失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setGenBusy(false))
  }

  function applyGeneratedImage(target: 'sprite' | 'background'): void {
    if (!genPreview || genBusy) return
    setGenBusy(true)
    setGenError('')
    const characterId = String(s && s.current ? s.current : '')
    const request = target === 'sprite'
      ? callApi('sprite-upload', { characterId, dataUrl: genPreview, fileName: 'ai-generated.png' })
      : callApi('bg-upload', { dataUrl: genPreview, fileName: 'ai-generated-bg.png' })
    request.then(async (result) => {
      assertApiResult(result, target === 'sprite' ? '生成的立绘未能应用' : '生成的背景未能应用')
      if (target === 'sprite') {
        spriteCache.current[characterId] = genPreview
        const revision = Number(result && result.revision)
        if (Number.isFinite(revision)) spriteRevisionCache.current[characterId] = revision
      } else {
        bgCache.current = genPreview
      }
      let nextView = viewFromResult(result)
      if (!nextView) nextView = await callApi('view')
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent(target === 'sprite' ? 'whg:sprite-changed' : 'whg:bg-changed', {
        detail: { characterId, dataUrl: genPreview, view: nextView, sourceSessionId: broadcastSessionId },
      }))
      setGenPreview(null)
      closePicker()
    }).catch((err) => {
      setGenError((target === 'sprite' ? '应用立绘失败：' : '应用背景失败：') + String(err && err.message ? err.message : err))
    }).finally(() => setGenBusy(false))
  }

  /** Render one picture from the current scene and put it on stage. */
  function generateStageCg(): void {
    if (stageCgBusy) return
    setStageCgBusy(true)
    callApi('cg-generate', {
      characterId: s && s.current ? s.current : '',
      prompt: genPrompt,
      label: '游玩 · ' + (s && s.name ? s.name : ''),
      show: true,
    }).then((result) => {
      if (!result || result.ok !== true) {
        setPickerError((result && result.error) || '生成失败')
        setStageCgBusy(false)
        return
      }
      const nextView = viewFromResult(result)
      if (nextView) setS(nextView)
      // The host bumps backgroundRevision when the CG turns ready, so a change
      // in that value is the "the image is on the stage now" signal. Polling on
      // a timer alone left the button stuck on "…" long after the art landed.
      const startRevision = Number((nextView && nextView.backgroundRevision) || 0)
      let waited = 0
      const stopPoll = () => {
        if (stageCgPoll.current) { clearInterval(stageCgPoll.current); stageCgPoll.current = null }
        setStageCgBusy(false)
      }
      const timer = setInterval(async () => {
        waited += 2500
        try {
          const view = await callApi('view')
          if (view && typeof view === 'object') {
            setS(view)
            const revision = Number(view.backgroundRevision || 0)
            if (startRevision && revision && revision !== startRevision) {
              stopPoll()
              return
            }
          }
        } catch (err) { /* keep waiting */ }
        if (waited > 300_000) stopPoll()
      }, 2500)
      stageCgPoll.current = timer
    }).catch((err) => {
      setPickerError('生成失败：' + String(err && err.message ? err.message : err))
      setStageCgBusy(false)
    })
  }

  /**
   * Switch to another published appearance of the current role. The host owns
   * the choice (it is per-character save state), and choosing one also drops any
   * user-uploaded sprite, so the cache entry is invalidated here too.
   */
  function applyBuiltinSprite(variantId: string): void {
    const characterId = String(s && s.current ? s.current : '')
    if (!variantId || !characterId || pickerLoading) return
    setPickerLoading(true)
    setPickerError('')
    callApi('sprite-set-builtin', { characterId, variant: variantId }).then(async (result) => {
      assertApiResult(result, '内置形象未切换')
      const revision = Number(result && result.revision)
      spriteCache.current[characterId] = null
      if (Number.isFinite(revision)) spriteRevisionCache.current[characterId] = revision
      let nextView = viewFromResult(result)
      if (!nextView) nextView = await callApi('view')
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent('whg:sprite-changed', {
        detail: { characterId, dataUrl: null, revision, view: nextView, sourceSessionId: broadcastSessionId },
      }))
      closePicker()
    }).catch((err) => {
      setPickerError('内置形象切换失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setPickerLoading(false))
  }

  function loadCharacterProfile(characterId: string): void {
    if (!characterId) {
      setProfileLoaded(false)
      setProfileLoading(false)
      setProfileError('当前角色未识别，暂时无法读取角色设定。')
      return
    }
    const requestId = ++profileRequestSeq.current
    setProfileCharacterId(characterId)
    setProfileLoaded(false)
    setProfileLoading(true)
    setProfileError('')
    setProfileMessage('')
    callApi('profile-get', { characterId }).then((result) => {
      assertApiResult(result, '角色设定读取失败')
      if (requestId !== profileRequestSeq.current) return
      const profile = profileFromResult(result)
      if (!profile) throw new Error('服务未返回可编辑的角色设定')
      const returnedId = String(result && (result.charId || result.characterId) ? (result.charId || result.characterId) : characterId)
      const builtIn = builtInProfileFromResult(result) || profile
      setProfileCharacterId(returnedId)
      setProfileDraft(profile)
      setProfileBaseline(profile)
      setProfileBuiltIn(builtIn)
      setProfileHasOverrides(profileHasOverridesFromResult(result, false))
      setProfileLoaded(true)
    }).catch((err) => {
      if (requestId !== profileRequestSeq.current) return
      setProfileError('角色设定读取失败：' + String(err && err.message ? err.message : err))
    }).finally(() => {
      if (requestId === profileRequestSeq.current) setProfileLoading(false)
    })
  }

  function updateProfileField(key: ProfileKey, value: string): void {
    setProfileDraft((current) => ({ ...current, [key]: value }))
    setProfileMessage('')
    setProfileError('')
  }

  function saveCharacterProfile(): void {
    const characterId = String(s && s.current ? s.current : profileCharacterId)
    if (!characterId || !profileLoaded || profileSaving) return
    if (profileCharacterId && characterId !== profileCharacterId) {
      loadCharacterProfile(characterId)
      return
    }
    const overrides: Partial<Record<ProfileKey, string | null>> = {}
    PROFILE_KEYS.forEach((key) => {
      overrides[key] = profileDraft[key] === profileBuiltIn[key] ? null : profileDraft[key]
    })
    setProfileSaving(true)
    setProfileError('')
    setProfileMessage('')
    callApi('profile-set', { characterId, overrides }).then(async (result) => {
      assertApiResult(result, '角色设定未保存')
      const returnedId = String(result && (result.charId || result.characterId) ? (result.charId || result.characterId) : characterId)
      const effective = profileFromResult(result) || { ...profileDraft }
      const builtIn = builtInProfileFromResult(result) || profileBuiltIn
      let nextView = viewFromResult(result)
      let refreshError = ''
      if (!nextView) {
        try {
          nextView = await callApi('view')
        } catch (err: any) {
          refreshError = '设定已保存，但画面刷新失败：' + String(err && err.message ? err.message : err)
        }
      }
      setProfileCharacterId(returnedId)
      setProfileDraft(effective)
      setProfileBaseline(effective)
      setProfileBuiltIn(builtIn)
      setProfileHasOverrides(profileHasOverridesFromResult(result, true))
      setProfileLoaded(true)
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent('whg:profile-changed', {
        detail: {
          characterId: returnedId,
          builtIn,
          effective,
          overrides: profileOverridesFromResult(result) || Object.fromEntries(
            PROFILE_KEYS.filter((key) => overrides[key] !== null).map((key) => [key, overrides[key]]),
          ),
          view: nextView,
          sourceSessionId: broadcastSessionId,
        },
      }))
      setProfileMessage(refreshError ? '设定已保存；画面会在服务恢复后自动同步。' : '角色设定已保存。')
      setProfileError(refreshError)
    }).catch((err) => {
      setProfileError('角色设定保存失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setProfileSaving(false))
  }

  function resetCharacterProfile(): void {
    const characterId = String(s && s.current ? s.current : profileCharacterId)
    if (!characterId || profileSaving) return
    setProfileSaving(true)
    setProfileError('')
    setProfileMessage('')
    callApi('profile-reset', { characterId }).then(async (result) => {
      assertApiResult(result, '默认角色设定未恢复')
      const returnedId = String(result && (result.charId || result.characterId) ? (result.charId || result.characterId) : characterId)
      let effective = profileFromResult(result)
      let builtIn = builtInProfileFromResult(result)
      let refreshError = ''
      if (!effective) {
        try {
          const refreshed = await callApi('profile-get', { characterId: returnedId })
          assertApiResult(refreshed, '默认角色设定读取失败')
          effective = profileFromResult(refreshed)
          builtIn = builtInProfileFromResult(refreshed)
        } catch (err: any) {
          refreshError = '默认设定已恢复，但内容刷新失败：' + String(err && err.message ? err.message : err)
        }
      }
      let nextView = viewFromResult(result)
      if (!nextView) {
        try {
          nextView = await callApi('view')
        } catch (err: any) {
          refreshError = refreshError || ('默认设定已恢复，但画面刷新失败：' + String(err && err.message ? err.message : err))
        }
      }
      if (effective) {
        setProfileDraft(effective)
        setProfileBaseline(effective)
        setProfileBuiltIn(builtIn || effective)
        setProfileLoaded(true)
      }
      setProfileCharacterId(returnedId)
      setProfileHasOverrides(false)
      if (nextView && typeof nextView === 'object') setS(nextView)
      window.dispatchEvent(new CustomEvent('whg:profile-changed', {
        detail: {
          characterId: returnedId,
          builtIn: builtIn || effective,
          effective,
          overrides: {},
          view: nextView,
          sourceSessionId: broadcastSessionId,
        },
      }))
      setProfileMessage(refreshError ? '默认设定已恢复；内容会在服务恢复后自动同步。' : '已恢复该角色的默认设定。')
      setProfileError(refreshError)
    }).catch((err) => {
      setProfileError('恢复默认设定失败：' + String(err && err.message ? err.message : err))
    }).finally(() => setProfileSaving(false))
  }

  function send(): void {
    const t = text
    if (!t.trim()) return
    setText('')
    act('chat', { text: t })
  }

  // whale-girl emotion sprites: filename = emotion (local asset keys)
  const EMOTION_ART: Record<string, string> = {
    cheerful: 'whale-cheerful',
    shy: 'whale-shy',
    serious: 'whale-serious',
    confused: 'whale-confused',
    angry: 'whale-angry',
    frightened: 'whale-frightened',
    exasperated: 'whale-exasperated',
    starry: 'whale-starry',
  }

  // detect the emotion: prefer the host's LLM classification, fall back to keywords
  function emotionOf(): string {
    const lines: any[] = (s && s.history) || []
    let lastLine: any = null
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].who === 'user') { lastLine = lines[i]; break }
    }
    if (!lastLine) return 'normal'
    if (lastLine.emotion && EMOTION_ART[lastLine.emotion]) return lastLine.emotion
    const last: string = lastLine.text || ''
    if (!last) return 'normal'
    if (/生气|讨厌|哼|烦|滚|过分|笨蛋|气死|可恶/.test(last)) return 'angry'
    if (/害怕|吓|恐怖|鬼|啊啊|惊|别吓我/.test(last)) return 'frightened'
    if (/无奈|累死|唉|好吧|算了|服了|无语|头疼/.test(last)) return 'exasperated'
    if (/星星|好美|浪漫|月亮|梦想|憧憬|心动|闪闪|漂亮/.test(last)) return 'starry'
    if (/害羞|呜|脸红|别这样|不好意思|才不/.test(last)) return 'shy'
    if (/？|\?|什么|不懂|困惑|为啥|咦|不明白|没听懂/.test(last)) return 'confused'
    if (/认真|工作|学习|讨论|问题|严肃|报告|项目|方案/.test(last)) return 'serious'
    if (/开心|高兴|哈哈|太好了|棒|喜欢|爱|♪|≧▽≦|耶|抱抱|亲亲/.test(last)) return 'cheerful'
    return 'normal'
  }

  function moodOf(): string {
    const lines: any[] = (s && s.history) || []
    let last: string | null = null
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].who === 'heroine') { last = lines[i].text; break }
    }
    if (!last) return 'normal'
    if (/生气|讨厌|哼|笨蛋|不理|走开|过分|烦/.test(last)) return 'angry'
    if (/喜欢|♪|开心|太棒|幸福|≧▽≦|哈哈|啦～/.test(last)) return 'happy'
    if (/害羞|才不|呜|脸红|别这样|……/.test(last)) return 'shy'
    return 'normal'
  }

  function lastLine(): any {
    const lines: any[] = (s && s.history) || []
    return lines.length > 0 ? lines[lines.length - 1] : null
  }

  function loadRewardCg(cgId: string): void {
    const id = String(cgId || '').trim()
    if (!id) return
    const requestId = ++rewardCgRequestSeq.current
    const cached = cachedCgData(id)
    setRewardCgError(null)
    if (cached) {
      setRewardCgDetail(cached)
      setRewardCgLoading(false)
      return
    }
    setRewardCgDetail(null)
    setRewardCgLoading(true)
    requestCgData(id, props.sessionId).then((detail) => {
      if (requestId !== rewardCgRequestSeq.current) return
      setRewardCgDetail(detail)
      setGalleryItems((items) => items.map((entry) => String(entry && entry.id) === id
        ? { ...entry, ...detail, savedAsBg: entry.savedAsBg }
        : entry))
    }).catch((error) => {
      if (requestId === rewardCgRequestSeq.current) {
        setRewardCgError(String(error && error.message ? error.message : error))
      }
    }).finally(() => {
      if (requestId === rewardCgRequestSeq.current) setRewardCgLoading(false)
    })
  }

  function acknowledgeRewardCg(): void {
    const id = rewardCgId
    if (!id) return
    rewardCgRequestSeq.current += 1
    act('cg-ack', { id })
  }

  function saveRewardCgBackground(): void {
    const id = rewardCgId
    if (!id || !rewardCgDetail || String(rewardCgDetail.id) !== id) return
    if (typeof rewardCgDetail.dataUrl === 'string' && rewardCgDetail.dataUrl) {
      bgCache.current = rewardCgDetail.dataUrl
    }
    act('cg-save-bg', { id })
  }

  function closeArchive(): void {
    galleryListRequestSeq.current += 1
    setGalleryLoading(false)
    setArchivePanel(null)
    closeGalleryDetail()
    setProfileMessage('')
    setProfileError('')
    const target = archiveReturnFocus.current
    archiveReturnFocus.current = null
    if (target && target.isConnected) {
      requestAnimationFrame(() => target.focus())
    }
  }

  function closeGalleryDetail(): void {
    galleryDetailRequestSeq.current += 1
    setGallerySelected(null)
    setGalleryDetailLoading(false)
    setGalleryDetailError(null)
  }

  function loadGallery(): void {
    const requestId = ++galleryListRequestSeq.current
    setGalleryLoading(true)
    setGalleryError(null)
    callApi('cg-gallery').then((result) => {
      if (requestId !== galleryListRequestSeq.current) return
      assertApiResult(result, 'CG 图鉴读取失败')
      const metadataItems = (result && Array.isArray(result.items) ? result.items : [])
        .map(galleryMetadataItem)
        .filter((item: any) => item && item.id)
      setGalleryItems((currentItems) => {
        const cachedById = new Map(currentItems.map((item: any) => [String(item && item.id), item]))
        return metadataItems.map((metadata: any) => {
          const cached = cachedById.get(String(metadata.id)) || cachedCgData(String(metadata.id))
          return cached && typeof cached.dataUrl === 'string' && cached.dataUrl
            ? { ...metadata, dataUrl: cached.dataUrl }
            : metadata
        })
      })
    }).catch((error) => {
      if (requestId === galleryListRequestSeq.current) {
        setGalleryError(String(error && error.message ? error.message : error))
      }
    }).finally(() => {
      if (requestId === galleryListRequestSeq.current) setGalleryLoading(false)
    })
  }

  function openGalleryDetail(item: any): void {
    const id = String(item && item.id ? item.id : '').trim()
    if (!id) return
    const requestId = ++galleryDetailRequestSeq.current
    setGallerySelected(item)
    setGalleryDetailError(null)
    if (typeof item.dataUrl === 'string' && item.dataUrl) {
      setGalleryDetailLoading(false)
      return
    }
    setGalleryDetailLoading(true)
    requestCgData(id, props.sessionId).then((detailResult) => {
      if (requestId !== galleryDetailRequestSeq.current) return
      const normalizedDetail = { ...item, ...detailResult, id }
      setGalleryItems((items) => items.map((entry) => {
        if (String(entry && entry.id) !== id) return entry
        const savedAsBg = typeof entry.savedAsBg === 'boolean' ? entry.savedAsBg : normalizedDetail.savedAsBg
        return { ...entry, ...normalizedDetail, savedAsBg }
      }))
      setGallerySelected((current: any) => {
        if (!current || String(current.id) !== id) return current
        const savedAsBg = typeof current.savedAsBg === 'boolean' ? current.savedAsBg : normalizedDetail.savedAsBg
        return { ...current, ...normalizedDetail, savedAsBg }
      })
    }).catch((error) => {
      if (requestId === galleryDetailRequestSeq.current) {
        setGalleryDetailError(String(error && error.message ? error.message : error))
      }
    }).finally(() => {
      if (requestId === galleryDetailRequestSeq.current) setGalleryDetailLoading(false)
    })
  }

  function loadSkitLog(): void {
    setSkitLogLoading(true)
    setSkitLogError(null)
    callApi('side-story-log').then((result: any) => {
      setSkitLog(Array.isArray(result && result.skits) ? result.skits : [])
      setSkitCgAvailable(!!(result && result.cgAvailable))
    }).catch((err: any) => {
      setSkitLogError(String(err && err.message ? err.message : err))
    }).finally(() => { setSkitLogLoading(false) })
  }

  function openArchive(kind: 'history' | 'gallery' | 'profile', trigger: HTMLElement): void {
    setPickerPanel(null)
    if (!archivePanel) archiveReturnFocus.current = trigger
    galleryListRequestSeq.current += 1
    closeGalleryDetail()
    setArchivePanel(kind)
    if (kind === 'gallery') loadGallery()
    if (kind === 'profile') loadCharacterProfile(String(s && s.current ? s.current : ''))
  }

  function saveGalleryBackground(item: any): void {
    if (!item || !item.id) return
    if (typeof item.dataUrl === 'string' && item.dataUrl) bgCache.current = item.dataUrl
    const selected = { ...item, savedAsBg: true }
    setGallerySelected(selected)
    setGalleryItems((items) => items.map((entry) => ({ ...entry, savedAsBg: entry.id === item.id })))
    act('cg-save-bg', { id: item.id })
  }

  function pickerOption(props: {
    selected: boolean
    title: string
    subtitle?: string
    onChoose: () => void
    key?: string
  }): React.ReactElement {
    return React.createElement('button', {
      'aria-selected': props.selected,
      className: 'whg-picker-option',
      disabled: pickerLoading,
      key: props.key,
      onClick: props.onChoose,
      role: 'option',
      type: 'button',
    },
      React.createElement('span', null,
        React.createElement('span', { className: 'whg-picker-option-main' }, props.title),
        props.subtitle ? React.createElement('span', { className: 'whg-picker-option-sub' }, props.subtitle) : null,
      ),
      React.createElement('span', { className: 'whg-picker-check', 'aria-hidden': 'true' }, props.selected ? '●' : ''),
    )
  }

  function characterPicker(): React.ReactElement | null {
    if (pickerPanel !== 'character') return null
    const characters: any[] = Array.isArray(modelOptions && modelOptions.characters) ? modelOptions.characters : []
    const mode = (pluginSettings && pluginSettings.characterMode) || s.characterMode || 'follow'
    const selectedId = (pluginSettings && pluginSettings.characterId) || s.characterId || s.current
    return React.createElement('div', {
      'aria-label': '选择出场角色',
      className: 'whg-picker',
      id: 'whg-character-picker-' + appScope,
      ref: pickerRef,
      role: 'listbox',
    },
      React.createElement('div', { className: 'whg-picker-head' },
        React.createElement('span', null, 'CHARACTER SOURCE'),
        React.createElement('span', null, pickerCatalogLoading ? '读取中…' : String(characters.length + 1).padStart(2, '0')),
      ),
      pickerOption({
        selected: mode !== 'manual',
        title: '跟随工作区',
        subtitle: mainModelText(modelOptions),
        onChoose: () => updateRuntimeSettings({ characterMode: 'follow', characterId: null }),
      }),
      characters.map((character: any, index: number) => pickerOption({
        key: String(character.id || index),
        selected: mode === 'manual' && String(selectedId) === String(character.id),
        title: optionText(character, '角色 ' + (index + 1)),
        subtitle: character.model ? String(character.model) : character.description ? String(character.description) : undefined,
        onChoose: () => updateRuntimeSettings({ characterMode: 'manual', characterId: String(character.id) }),
      })),
      pickerError ? React.createElement('div', { className: 'whg-bg-error', role: 'alert' }, pickerError) : null,
    )
  }

  function chatPicker(): React.ReactElement | null {
    if (pickerPanel !== 'chat') return null
    const models: any[] = Array.isArray(modelOptions && modelOptions.models) ? modelOptions.models : []
    const mode = (pluginSettings && pluginSettings.chatMode) || s.chatMode || 'configured'
    const selected = (pluginSettings && pluginSettings.chatSelection) || s.chatSelection
    const selectedKey = selectionKey(selected)
    const configuredLabel = optionText(
      modelOptions && modelOptions.configuredSelection,
      s.configuredChatModelLabel || s.defaultChatModelLabel || s.chatModelLabel || s.lastModel || '插件配置模型',
    )
    return React.createElement('div', {
      'aria-label': '选择对话模型',
      className: 'whg-picker',
      id: 'whg-chat-picker-' + appScope,
      ref: pickerRef,
      role: 'listbox',
    },
      React.createElement('div', { className: 'whg-picker-head' },
        React.createElement('span', null, 'DIALOGUE MODEL'),
        React.createElement('span', null, pickerCatalogLoading ? '读取中…' : String(models.length + 2).padStart(2, '0')),
      ),
      pickerOption({
        selected: mode === 'configured' || (!pluginSettings && !s.chatMode),
        title: '使用插件默认模型',
        subtitle: configuredLabel,
        onChoose: () => updateRuntimeSettings({ chatMode: 'configured', chatSelection: null }),
      }),
      pickerOption({
        selected: mode === 'main',
        title: '跟随工作区',
        subtitle: mainModelText(modelOptions),
        onChoose: () => updateRuntimeSettings({ chatMode: 'main', chatSelection: null }),
      }),
      models.map((model: any, index: number) => {
        const key = selectionKey(model)
        return pickerOption({
          key: key || String(index),
          selected: mode === 'manual' && key === selectedKey,
          title: optionText(model, '模型 ' + (index + 1)),
          subtitle: [model.provider, model.model].filter(Boolean).join(' · '),
          onChoose: () => updateRuntimeSettings({
            chatMode: 'manual',
            chatSelection: { provider: String(model.provider || ''), model: String(model.model || model.id || '') },
          }),
        })
      }),
      pickerError ? React.createElement('div', { className: 'whg-bg-error', role: 'alert' }, pickerError) : null,
    )
  }

  function backgroundPicker(): React.ReactElement | null {
    if (pickerPanel !== 'background') return null
    const backgroundMode = String((s && s.backgroundMode) || (s && (s.bg === 'custom' || s.bg === 'cg') ? s.bg : 'builtin'))
    const hasSavedBackground = backgroundMode === 'custom' || backgroundMode === 'cg'
    const builtinOptions = Array.isArray(s && s.builtinBackgroundOptions)
      ? s.builtinBackgroundOptions.filter((item: any) => item && typeof item.key === 'string' && item.key)
      : []
    const currentBuiltin = String(
      (s && (s.builtinBackgroundKey || s.selectedBuiltinBackground))
      || (builtinOptions.find((item: any) => item.current === true || item.selected === true) || {}).key
      || (!hasSavedBackground && s && s.bg ? s.bg : ''),
    )
    const currentActual = hasSavedBackground ? bgCache.current : art(s && s.bg)
    const visiblePreview = backgroundPreview || currentActual
    const builtinSection = builtinOptions.length > 0
      ? React.createElement('section', { className: 'whg-bg-builtins', 'aria-label': (s && s.name ? s.name : '当前角色') + '的内置背景' },
        React.createElement('div', { className: 'whg-bg-builtins-head' },
          React.createElement('span', null, '角色内置背景'),
          React.createElement('span', { className: 'whg-bg-builtins-role' }, s && s.name ? s.name : ''),
        ),
        hasSavedBackground
          ? React.createElement('div', { className: 'whg-bg-override-note' },
            backgroundMode === 'cg' ? '特殊 CG 正在覆盖角色背景。选择下方背景会退出 CG 覆盖。' : '自定义图片正在覆盖角色背景。选择下方背景会退出自定义覆盖。',
          )
          : null,
        React.createElement('div', { className: 'whg-bg-builtins-grid' },
          builtinOptions.map((option: any, index: number) => {
            const key = String(option.key)
            const label = String(option.label || option.name || ('内置背景 ' + (index + 1)))
            const preview = art(key)
            const selected = key === currentBuiltin
            const isDefault = option.default === true || option.isDefault === true
            return React.createElement('button', {
              'aria-label': label + (isDefault ? '，角色默认背景' : '') + (selected && hasSavedBackground ? '，退出覆盖后使用' : ''),
              'aria-pressed': selected && !hasSavedBackground,
              className: 'whg-bg-builtin',
              disabled: pickerLoading,
              key,
              onClick: () => applyBuiltinBackground(key),
              type: 'button',
            },
              preview
                ? React.createElement('img', { alt: '', className: 'whg-bg-builtin-img', draggable: false, src: preview })
                : React.createElement('div', { className: 'whg-bg-builtin-img whg-bg-builtin-fallback' }, 'BACKGROUND'),
              React.createElement('span', { className: 'whg-bg-builtin-meta' },
                React.createElement('span', { className: 'whg-bg-builtin-name' }, label),
                isDefault ? React.createElement('span', { className: 'whg-bg-builtin-tag' }, '默认') : null,
                selected ? React.createElement('span', { className: 'whg-bg-builtin-tag' }, hasSavedBackground ? '恢复后' : '使用中') : null,
              ),
            )
          }),
        ),
      )
      : null
    return React.createElement('div', {
      'aria-label': '修改 galgame 背景图',
      className: 'whg-picker right whg-bg-picker',
      id: 'whg-background-picker-' + appScope,
      ref: pickerRef,
      role: 'dialog',
    },
      React.createElement('div', { className: 'whg-picker-head' },
        React.createElement('span', null, 'BACKGROUND FILE'),
        React.createElement('span', null, backgroundPreview ? '预览' : hasSavedBackground ? '覆盖中' : '角色背景'),
      ),
      visiblePreview
        ? React.createElement('img', { className: 'whg-bg-preview', src: visiblePreview, alt: backgroundPreview ? '待应用背景预览' : '当前 galgame 背景' })
        : React.createElement('div', { className: 'whg-bg-empty' }, '选择一张本地图片后在这里预览'),
      builtinSection,
      imageGenSection('background'),
      React.createElement('div', { className: 'whg-picker-note' }, '内置背景会随角色切换。上传的图片会在所有工作区共享，并持续覆盖角色背景；建议使用横向 16:9 图片。'),
      React.createElement('input', {
        accept: 'image/png,image/jpeg,image/webp,image/avif',
        className: 'whg-bg-file',
        onChange: chooseBackgroundFile,
        ref: bgFileRef,
        type: 'file',
      }),
      React.createElement('div', { className: 'whg-bg-actions' },
        React.createElement('button', {
          className: 'whg-btn',
          disabled: pickerLoading,
          onClick: () => bgFileRef.current?.click(),
          type: 'button',
        }, backgroundPreview ? '重新选择' : '上传图片'),
        backgroundPreview
          ? React.createElement('button', {
            className: 'whg-cg-btn',
            disabled: pickerLoading,
            onClick: applyBackgroundUpload,
            type: 'button',
          }, pickerLoading ? '保存中…' : '应用这张背景')
          : null,
        backgroundPreview
          ? React.createElement('button', {
            className: 'whg-btn',
            disabled: pickerLoading,
            onClick: () => { setBackgroundPreview(null); setBackgroundFileName(''); setPickerError('') },
            type: 'button',
          }, '取消预览')
          : null,
        hasSavedBackground
          ? React.createElement('button', {
            className: 'whg-btn',
            disabled: pickerLoading,
            onClick: restoreDefaultBackground,
            type: 'button',
          }, '恢复默认')
          : null,
      ),
      pickerError ? React.createElement('div', { className: 'whg-bg-error', role: 'alert' }, pickerError) : null,
    )
  }

  function skitPicker(): React.ReactElement | null {
    if (pickerPanel !== 'skit') return null
    const side = (s && s.sideStory) || {}
    const cooling = Number(side.cooldownMs) > 0
    const mins = cooling ? Math.ceil(Number(side.cooldownMs) / 60000) : 0
    const start = () => {
      if (busy || cooling) return
      const topic = skitTopic.trim()
      setSkitTopic('')
      closePicker(false)
      act('side-story', topic ? { op: 'start', topic } : { op: 'start' })
    }
    return React.createElement('div', {
      'aria-label': '开一场小剧场',
      className: 'whg-picker right whg-skit-picker',
      id: 'whg-skit-picker-' + appScope,
      ref: pickerRef,
      role: 'dialog',
    },
      React.createElement('div', { className: 'whg-picker-head' },
        React.createElement('span', null, 'SIDE ACT'),
        React.createElement('span', null, cooling ? '冷却中 · 约 ' + mins + ' 分钟' : '可开演'),
      ),
      React.createElement('p', { className: 'whg-side-seed' },
        '不填就让她们自己找话题：优先看看外面在聊什么，找不到就聊主人最近在忙的事。'),
      React.createElement('input', {
        className: 'whg-input',
        value: skitTopic,
        placeholder: '想让她们聊点什么？（可留空）',
        disabled: busy || cooling,
        onChange: (event: any) => { setSkitTopic(event.target.value) },
        onKeyDown: (event: any) => { if (event.key === 'Enter') start() },
      }),
      React.createElement('button', {
        className: 'whg-btn whg-skit-start',
        disabled: busy || cooling,
        onClick: start,
        type: 'button',
      }, cooling ? '冷却中' : '开演'),
    )
  }

  function imageGenSection(target: 'sprite' | 'background'): React.ReactElement {
    const status = genStatus
    const backendLabel = (() => {
      if (!status) return '读取中…'
      if (status.resolved === 'off') return '无可用后端'
      const names: Record<string, string> = { comfyui: 'ComfyUI', bridge: '生成桥', agnes: 'Agnes AI', dashscope: 'DashScope' }
      const detail = status.backends && status.backends[status.resolved] ? status.backends[status.resolved].detail : ''
      return (names[status.resolved] || status.resolved) + (detail ? ' · ' + detail : '')
    })()
    const canGenerate = !!status && status.resolved !== 'off'
    return React.createElement('section', { className: 'whg-gen', 'aria-label': 'AI 生成立绘或背景' },
      React.createElement('div', { className: 'whg-gen-head' },
        React.createElement('span', null, 'AI 生成'),
        React.createElement('span', { className: 'whg-gen-state' }, backendLabel),
      ),
      React.createElement('textarea', {
        className: 'whg-gen-input',
        onChange: (event: any) => setGenPrompt(event.target.value),
        placeholder: target === 'sprite'
          ? (status && status.resolved === 'comfyui'
            ? '描述想要的立绘（英文标签效果最好）：standing, gentle smile, looking at viewer'
            : '描述想要的立绘：站在窗边微笑，鲸鱼尾巴轻轻摆动')
          : '描述想要的场景（不要写人）：深海工坊的夜晚书房，烛光与月光',
        spellCheck: false,
        value: genPrompt,
      }),
      React.createElement('div', { className: 'whg-gen-row' },
        React.createElement('button', {
          className: 'whg-btn',
          disabled: genBusy || !canGenerate,
          onClick: suggestImagePrompt,
          title: '用当前角色设定让模型自动写一段提示词',
          type: 'button',
        }, '按角色设定'),
        React.createElement('button', {
          className: 'whg-cg-btn',
          disabled: genBusy || !canGenerate,
          onClick: () => runImageGenerate(target),
          type: 'button',
        }, genBusy ? '生成中…' : (target === 'sprite' ? '生成立绘' : '生成背景')),
        genPreview
          ? React.createElement('button', {
            className: 'whg-btn',
            disabled: genBusy,
            onClick: () => applyGeneratedImage(target),
            type: 'button',
          }, target === 'sprite' ? '应用为立绘' : '应用为背景')
          : null,
        genPreview
          ? React.createElement('button', {
            className: 'whg-btn',
            disabled: genBusy,
            onClick: () => setGenPreview(null),
            type: 'button',
          }, '丢弃')
          : null,
      ),
      genPreview
        ? React.createElement('img', { alt: '生成结果预览', className: 'whg-gen-preview', src: genPreview })
        : null,
      genError ? React.createElement('div', { className: 'whg-gen-error', role: 'alert' }, genError) : null,
      React.createElement('div', { className: 'whg-gen-note' },
        target === 'sprite'
          ? '立绘按 832×1216 生成并要求透明背景（需要 ComfyUI 装了 rembg 节点）。'
          : '背景按 1280×720 生成。图片会作为「自定义背景」覆盖角色默认背景，可随时在「背景图」里恢复。',
      ),
    )
  }

  function spritePicker(): React.ReactElement | null {
    if (pickerPanel !== 'sprite') return null
    const defaultSprite = art(s && s.sprite)
    const visiblePreview = spritePreview || customSprite || defaultSprite
    const hasSavedSprite = !!customSprite || !!(s && (s.hasCustomSprite === true || s.customSprite === true || s.spriteMode === 'custom'))
    const spriteVariants: any[] = s && Array.isArray(s.spriteVariants) ? s.spriteVariants : []
    const currentVariantId = String((s && s.spriteVariant) || '')
    // One appearance needs no chooser; the panel is then purely the upload flow,
    // exactly as it was before variants existed.
    const variantSection = spriteVariants.length > 1
      ? React.createElement('section', { className: 'whg-sprite-variants', 'aria-label': (s && s.name ? s.name : '当前角色') + '的内置形象' },
        React.createElement('div', { className: 'whg-bg-builtins-head' },
          React.createElement('span', null, '角色内置形象'),
          React.createElement('span', { className: 'whg-bg-builtins-role' },
            s && s.name ? s.name : ''),
        ),
        hasSavedSprite
          ? React.createElement('div', { className: 'whg-bg-override-note' },
            '自定义图片正在覆盖内置形象。选择下方形象会退出自定义立绘。')
          : null,
        React.createElement('div', { className: 'whg-sprite-variants-grid' },
          spriteVariants.map((variant: any, index: number) => {
            const variantId = String(variant.id || String.fromCharCode(65 + index))
            const label = String(variant.label || ('形象 ' + variantId))
            const preview = art(variant.key)
            const selected = variantId === currentVariantId
            const isDefault = variant.default === true
            return React.createElement('button', {
              'aria-label': variantId + ' ' + label + (isDefault ? '，默认形象' : ''),
              'aria-pressed': selected && !hasSavedSprite,
              className: 'whg-sprite-variant',
              disabled: pickerLoading,
              key: variantId,
              onClick: () => applyBuiltinSprite(variantId),
              type: 'button',
            },
              React.createElement('span', { className: 'whg-sprite-variant-badge' }, variantId),
              preview
                ? React.createElement('img', { alt: '', className: 'whg-sprite-variant-img', draggable: false, src: preview })
                : React.createElement('div', { className: 'whg-sprite-variant-img whg-bg-builtin-fallback' }, 'SPRITE'),
              React.createElement('span', { className: 'whg-bg-builtin-meta' },
                React.createElement('span', { className: 'whg-bg-builtin-name' }, label),
                isDefault ? React.createElement('span', { className: 'whg-bg-builtin-tag' }, '默认') : null,
                selected ? React.createElement('span', { className: 'whg-bg-builtin-tag' }, hasSavedSprite ? '恢复后' : '使用中') : null,
              ),
            )
          }),
        ),
      )
      : null
    return React.createElement('div', {
      'aria-label': '修改' + (s && s.name ? s.name : '当前角色') + '的角色立绘',
      className: 'whg-picker right whg-sprite-picker',
      id: 'whg-sprite-picker-' + appScope,
      ref: pickerRef,
      role: 'dialog',
    },
      React.createElement('div', { className: 'whg-picker-head' },
        React.createElement('span', null, 'CHARACTER PORTRAIT'),
        React.createElement('span', null, spritePreview ? '预览' : hasSavedSprite ? '使用中' : '默认'),
      ),
      visiblePreview
        ? React.createElement('div', { className: 'whg-sprite-preview-shell' },
          React.createElement('img', {
            alt: spritePreview ? '待应用立绘预览' : (s && s.name ? s.name : '当前角色') + '的当前立绘',
            className: 'whg-sprite-preview',
            src: visiblePreview,
          }),
        )
        : React.createElement('div', { className: 'whg-bg-empty' }, '选择一张本地图片后在这里预览'),
      variantSection,
      imageGenSection('sprite'),
      React.createElement('div', { className: 'whg-picker-note' },
        '当前角色 · ' + (s && s.name ? s.name : '未识别') + '。立绘按角色分别保存，并在所有工作区共享；建议使用透明背景的竖向图片。',
      ),
      React.createElement('input', {
        accept: 'image/png,image/jpeg,image/webp,image/avif',
        className: 'whg-bg-file',
        onChange: chooseSpriteFile,
        ref: spriteFileRef,
        type: 'file',
      }),
      React.createElement('div', { className: 'whg-bg-actions' },
        React.createElement('button', {
          className: 'whg-btn',
          disabled: pickerLoading,
          onClick: () => spriteFileRef.current?.click(),
          type: 'button',
        }, spritePreview ? '重新选择' : '上传图片'),
        spritePreview
          ? React.createElement('button', {
            className: 'whg-cg-btn',
            disabled: pickerLoading,
            onClick: applySpriteUpload,
            type: 'button',
          }, pickerLoading ? '保存中…' : '应用这张立绘')
          : null,
        React.createElement('button', {
          className: 'whg-btn',
          disabled: pickerLoading,
          onClick: () => closePicker(),
          type: 'button',
        }, '取消'),
        hasSavedSprite
          ? React.createElement('button', {
            className: 'whg-btn',
            disabled: pickerLoading,
            onClick: restoreDefaultSprite,
            type: 'button',
          }, '恢复默认')
          : null,
      ),
      pickerError ? React.createElement('div', { className: 'whg-bg-error', role: 'alert' }, pickerError) : null,
    )
  }

  function profileField(
    key: ProfileKey,
    label: string,
    hint: string,
    multiline = false,
  ): React.ReactElement {
    const id = 'whg-profile-' + appScope + '-' + key
    const hintId = id + '-hint'
    const common = {
      'aria-describedby': hintId,
      className: 'whg-profile-control',
      disabled: profileLoading || profileSaving,
      id,
      onChange: (event: any) => updateProfileField(key, String(event.target.value || '')),
      spellCheck: true,
      value: profileDraft[key],
    }
    const control = multiline
      ? React.createElement('textarea', { ...common, rows: key === 'persona' || key === 'tone' ? 5 : 4 })
      : React.createElement('input', {
        ...common,
        autoComplete: 'off',
        ref: key === 'displayName' ? profileFirstFieldRef : undefined,
        type: 'text',
      })
    return React.createElement('div', { className: 'whg-profile-field' },
      React.createElement('label', { htmlFor: id }, label),
      control,
      React.createElement('small', { id: hintId }, hint),
    )
  }

  function profileEditor(): React.ReactElement {
    if (profileLoading) {
      return React.createElement('div', { className: 'whg-profile-loading', role: 'status' }, '正在调取角色档案……')
    }
    if (!profileLoaded) {
      return React.createElement('div', { className: 'whg-archive-error', role: 'alert' },
        profileError || '角色设定暂时无法读取。',
        React.createElement('button', {
          className: 'whg-btn',
          onClick: () => loadCharacterProfile(String(s && s.current ? s.current : '')),
          type: 'button',
        }, '重新读取'),
      )
    }
    const dirty = PROFILE_KEYS.some((key) => profileDraft[key] !== profileBaseline[key])
    const message = profileError
      || profileMessage
      || (dirty ? '有未保存的修改。' : profileHasOverrides ? '当前角色使用自定义设定。' : '当前角色使用默认设定。')
    return React.createElement(React.Fragment, null,
      React.createElement('div', { className: 'whg-profile-intro' },
        React.createElement('strong', null, (s && s.name ? s.name : '当前角色') + ' · 独立角色档案'),
        '。设定按角色分别保存，并在所有工作区共享；保存或恢复默认都不会改变好感度、记忆或角色立绘，已经开始互动的对话历史也不会被改写。',
        React.createElement('span', { className: 'whg-profile-guard' },
          '若尚未开始互动，编辑会原位更新当前开场问候；开始对话后不再改写历史。安全规则与单句回复限制始终保留。',
        ),
      ),
      React.createElement('form', {
        'aria-busy': profileSaving,
        className: 'whg-profile-form',
        onSubmit: (event: any) => { event.preventDefault(); saveCharacterProfile() },
      },
        React.createElement('section', { 'aria-labelledby': 'whg-profile-heading-' + appScope, className: 'whg-profile-section' },
          React.createElement('div', { className: 'whg-profile-section-head', id: 'whg-profile-heading-' + appScope },
            React.createElement('strong', null, 'DOSSIER HEADING'),
            React.createElement('span', null, '姓名牌与彼此称呼'),
          ),
          React.createElement('div', { className: 'whg-profile-head-fields' },
            profileField('displayName', '角色昵称', '显示在标题、姓名牌与对话记录中。'),
            profileField('address', '对用户称呼', '角色在台词中如何称呼你。'),
          ),
        ),
        React.createElement('section', { 'aria-labelledby': 'whg-profile-core-' + appScope, className: 'whg-profile-section' },
          React.createElement('div', { className: 'whg-profile-section-head', id: 'whg-profile-core-' + appScope },
            React.createElement('strong', null, 'CHARACTER CORE'),
            React.createElement('span', null, '主要对话依据'),
          ),
          React.createElement('div', { className: 'whg-profile-main-fields' },
            profileField('persona', '性格', '角色的性格、价值取向与互动边界。', true),
            profileField('tone', '语气', '措辞、节奏、口癖等表达偏好。', true),
          ),
        ),
        React.createElement('section', { 'aria-labelledby': 'whg-profile-scenes-' + appScope, className: 'whg-profile-section' },
          React.createElement('div', { className: 'whg-profile-section-head', id: 'whg-profile-scenes-' + appScope },
            React.createElement('strong', null, 'SCENE NOTES'),
            React.createElement('span', null, '开场与纪念 CG'),
          ),
          React.createElement('div', { className: 'whg-profile-secondary-fields' },
            profileField('greeting', '首次问候', '尚未开始互动时可更新当前开场问候；已有真实对话后不会改写。', true),
            profileField('visual', 'CG 外观描述', '用于生成升级纪念 CG，不会更换当前角色立绘。', true),
          ),
        ),
        React.createElement('div', { className: 'whg-profile-actions' },
          React.createElement('button', {
            className: 'whg-cg-btn',
            disabled: profileSaving || !dirty,
            type: 'submit',
          }, profileSaving ? '保存中…' : '保存设定'),
          React.createElement('button', {
            className: 'whg-btn',
            disabled: profileSaving || (!profileHasOverrides && !dirty),
            onClick: resetCharacterProfile,
            title: '只恢复当前角色的六项设定，不清除其他存档内容',
            type: 'button',
          }, profileSaving ? '处理中…' : '恢复默认'),
          React.createElement('p', {
            className: 'whg-profile-message' + (profileError ? ' error' : ''),
            role: profileError ? 'alert' : 'status',
          }, message),
        ),
        bondMeters(),
      ),
    )
  }

  function archiveDrawer(): React.ReactElement | null {
    if (!archivePanel || !s) return null
    const history: any[] = Array.isArray(s.history) ? s.history : []
    const galleryCount = typeof s.galleryCount === 'number' ? s.galleryCount : galleryItems.length
    const isHistory = archivePanel === 'history'
    const isProfile = archivePanel === 'profile'
    const isSkits = archivePanel === 'skits'
    const recordCount = isHistory ? history.length : isSkits ? skitLog.length : galleryCount
    const kicker = isProfile
      ? 'DEEP-SEA DOSSIER · ' + String(profileCharacterId || s.current || 'PROFILE').toUpperCase()
      : 'DEEP-SEA ARCHIVE · ' + (isHistory ? 'LOG ' : isSkits ? 'ACT ' : 'CG ') + String(recordCount).padStart(3, '0')
    let body: React.ReactElement

    if (isProfile) {
      body = profileEditor()
    } else if (isSkits) {
      body = skitLogError
        ? React.createElement('div', { className: 'whg-archive-error', role: 'alert' }, '小剧场记录读取失败：' + skitLogError)
        : skitLogLoading
          ? React.createElement('div', { className: 'whg-archive-empty' }, '正在翻出后台的演出记录……')
          : skitLog.length === 0
            ? React.createElement('div', { className: 'whg-archive-empty' }, '还没有演过小剧场。等主人忙点什么，她们就有话题了。')
            : React.createElement('div', { className: 'whg-skit-log' },
              skitLog.map((skit: any) => React.createElement('section', { className: 'whg-skit', key: String(skit.id) },
                React.createElement('header', { className: 'whg-skit-head' },
                  React.createElement('span', { className: 'whg-skit-cast' },
                    (skit.cast || []).map((member: any) => React.createElement('span', {
                      key: member.id,
                      style: { color: member.color },
                    }, member.name))),
                  React.createElement('time', { className: 'whg-skit-time' },
                    new Date(Number(skit.at) || 0).toLocaleString()),
                ),
                skit.seed ? React.createElement('p', { className: 'whg-skit-seed' }, skit.seed) : null,
                skitCgAvailable
                  ? React.createElement('button', {
                    className: 'whg-btn whg-skit-cg',
                    disabled: busy || !!skit.cgId,
                    onClick: () => {
                      callApi('skit-cg', { skitId: skit.id }).then(() => loadSkitLog()).catch((err: any) => {
                        setSkitLogError(String(err && err.message ? err.message : err))
                      })
                    },
                    type: 'button',
                  }, skit.cgStatus === 'ready'
                    ? '合影已生成 · 见 CG图鉴'
                    : skit.cgStatus === 'generating'
                      ? '合影绘制中…'
                      : skit.cgStatus === 'failed'
                        ? '合影生成失败'
                        : '生成这场的合影 CG')
                  : null,
                React.createElement('div', { className: 'whg-history' },
                  (skit.lines || []).map((line: any, index: number) => React.createElement('div', {
                    className: 'whg-history-row ' + String(line.who || 'narrator'),
                    key: index,
                  },
                    React.createElement('div', { className: 'whg-history-who' }, line.name || '旁白'),
                    React.createElement('p', { className: 'whg-history-text' }, line.text || ''),
                  ))),
              )))
    } else if (isHistory) {
      body = history.length === 0
        ? React.createElement('div', { className: 'whg-archive-empty' }, '还没有对话记录。和' + s.name + '说句话，第一份深海档案就会在这里归档。')
        : React.createElement('div', { className: 'whg-history' },
          history.map((line: any, index: number) => {
            const who = line && line.who === 'heroine' ? s.name : line && line.who === 'user' ? '主人' : '旁白'
            const kind = line && line.who ? String(line.who) : 'narrator'
            return React.createElement('div', { className: 'whg-history-row ' + kind, key: index + '-' + kind },
              React.createElement('div', { className: 'whg-history-who' }, who),
              React.createElement('p', { className: 'whg-history-text' }, line && typeof line.text === 'string' ? line.text : ''),
            )
          }),
        )
    } else if (gallerySelected) {
      body = React.createElement('div', { className: 'whg-gallery-detail' },
        React.createElement('button', {
          className: 'whg-archive-back',
          onClick: closeGalleryDetail,
          type: 'button',
        }, '← 返回图鉴'),
        galleryDetailLoading
          ? React.createElement('div', { className: 'whg-archive-empty', role: 'status' }, '正在读取这张特殊 CG……')
          : galleryDetailError
            ? React.createElement('div', { className: 'whg-archive-error', role: 'alert' },
              'CG 图片读取失败：' + galleryDetailError,
              React.createElement('button', {
                className: 'whg-btn',
                onClick: () => openGalleryDetail(gallerySelected),
                type: 'button',
              }, '重新读取'),
            )
            : gallerySelected.dataUrl
              ? React.createElement('img', {
                className: 'whg-gallery-full',
                src: gallerySelected.dataUrl,
                alt: (gallerySelected.name || s.name) + '的特殊CG',
              })
              : React.createElement('div', { className: 'whg-archive-error', role: 'alert' }, '这张 CG 暂时无法读取。'),
        React.createElement('div', { className: 'whg-gallery-caption' },
          React.createElement('strong', null, 'Lv.' + (gallerySelected.level || '?')),
          React.createElement('span', null, (gallerySelected.name || s.name) + ' · ' + formatCgDate(gallerySelected.at)),
        ),
        gallerySelected.prompt
          ? React.createElement('p', { className: 'whg-gallery-prompt' }, gallerySelected.prompt)
          : null,
        React.createElement('button', {
          className: 'whg-cg-btn',
          disabled: busy || gallerySelected.savedAsBg === true,
          onClick: () => saveGalleryBackground(gallerySelected),
          type: 'button',
        }, gallerySelected.savedAsBg ? '当前galgame背景' : '设为galgame背景'),
      )
    } else if (galleryLoading) {
      body = React.createElement('div', { className: 'whg-archive-empty', role: 'status' }, '正在打开深海图鉴柜……')
    } else if (galleryError) {
      body = React.createElement('div', { className: 'whg-archive-error', role: 'alert' },
        'CG 图鉴读取失败：' + galleryError,
        React.createElement('button', { className: 'whg-btn', onClick: loadGallery, type: 'button' }, '重新读取'),
      )
    } else if (galleryItems.length === 0) {
      body = React.createElement('div', { className: 'whg-archive-empty' }, '图鉴柜还是空的。提升等级后，收到的特殊 CG 会依角色分别收藏在这里。')
    } else {
      body = React.createElement('div', { className: 'whg-gallery' },
        galleryItems.map((item: any, index: number) => React.createElement('button', {
          'aria-label': '查看' + (item.name || s.name) + ' Lv.' + (item.level || '?') + ' 特殊CG',
          className: 'whg-gallery-card',
          key: item.id || index,
          onClick: () => openGalleryDetail(item),
          type: 'button',
        },
          item.dataUrl
            ? React.createElement('img', { className: 'whg-gallery-thumb', src: item.dataUrl, alt: '', loading: 'lazy' })
            : React.createElement('div', { className: 'whg-gallery-thumb whg-gallery-placeholder' }, 'CG'),
          item.savedAsBg
            ? React.createElement('span', { className: 'whg-gallery-bg' }, '背景中')
            : null,
          React.createElement('span', { className: 'whg-gallery-meta' },
            React.createElement('span', { className: 'whg-gallery-level' }, 'Lv.' + (item.level || '?')),
            React.createElement('span', { className: 'whg-gallery-date' }, (item.name || s.name) + ' · ' + formatCgDate(item.at)),
          ),
        )),
      )
    }

    return React.createElement('div', {
      className: 'whg-archive-scrim',
      onMouseDown: (event: any) => { if (event.target === event.currentTarget) closeArchive() },
    },
      React.createElement('aside', {
        'aria-labelledby': 'whg-archive-title-' + appScope,
        'aria-modal': 'true',
        className: 'whg-archive' + (isProfile ? ' whg-profile-archive' : ''),
        id: isProfile ? 'whg-profile-editor-' + appScope : undefined,
        ref: archiveRef,
        role: 'dialog',
      },
        React.createElement('div', { className: 'whg-archive-spine', 'aria-hidden': 'true' }, isProfile ? 'CHARACTER DOSSIER' : 'DEEP-SEA ARCHIVE'),
        React.createElement('header', { className: 'whg-archive-head' },
          React.createElement('div', { className: 'whg-archive-heading' },
            React.createElement('div', { className: 'whg-archive-kicker' }, kicker),
            React.createElement('h2', { className: 'whg-archive-title', id: 'whg-archive-title-' + appScope }, isProfile ? '角色设定' : isHistory ? '对话历史' : isSkits ? '小剧场' : 'CG图鉴'),
            // Chat log and skits are two views of the same archive, so they are
            // tabs in here rather than two more buttons in an already tight bar.
            isHistory || isSkits
              ? React.createElement('div', { className: 'whg-archive-tabs', role: 'tablist' },
                React.createElement('button', {
                  'aria-selected': isHistory,
                  className: 'whg-archive-tab' + (isHistory ? ' active' : ''),
                  onClick: () => { setArchivePanel('history') },
                  role: 'tab',
                  type: 'button',
                }, '对话历史'),
                React.createElement('button', {
                  'aria-selected': isSkits,
                  className: 'whg-archive-tab' + (isSkits ? ' active' : ''),
                  onClick: () => {
                    setArchivePanel('skits')
                    loadSkitLog()
                  },
                  role: 'tab',
                  type: 'button',
                }, '小剧场'),
              )
              : null,
          ),
          React.createElement('button', {
            'aria-label': '关闭' + (isProfile ? '角色设定' : isHistory ? '对话历史' : isSkits ? '小剧场' : 'CG图鉴'),
            className: 'whg-archive-close',
            onClick: closeArchive,
            ref: archiveCloseRef,
            type: 'button',
          }, '×'),
        ),
        React.createElement('div', {
          className: 'whg-archive-body',
          ref: isHistory ? historyScrollRef : undefined,
        }, body),
      ),
    )
  }

  function topbar(showBack: boolean): React.ReactElement {
    const characterModel = s.characterModelLabel || s.modelLabel || ''
    const chatModel = s.chatModelLabel || s.lastModel || ''
    const petEnabled = s.petEnabled !== false
    const galleryCount = typeof s.galleryCount === 'number' ? s.galleryCount : 0
    const characterMode = (pluginSettings && pluginSettings.characterMode) || s.characterMode || 'follow'
    const chatMode = (pluginSettings && pluginSettings.chatMode) || s.chatMode || 'configured'
    return React.createElement('div', { className: 'whg-top' },
      React.createElement('span', { className: 'whg-title' }, '与' + s.name + '的galgame'),
      React.createElement('div', { className: 'whg-chip-wrap' },
        React.createElement('button', {
          'aria-controls': 'whg-character-picker-' + appScope,
          'aria-expanded': pickerPanel === 'character',
          'aria-haspopup': 'listbox',
          className: 'whg-chip whg-chip-button',
          onClick: (event: any) => openPicker('character', event.currentTarget),
          title: '点击切换出场角色。当前' + (characterMode === 'manual' ? '已固定' : '跟随工作区') + '：' + (characterModel || '未识别'),
          type: 'button',
        },
          React.createElement('span', { className: 'whg-dot' + (s.modelOnline ? '' : ' off') }),
          React.createElement('span', null, '角色来源 · '),
          React.createElement('strong', null, characterModel || '未识别'),
          React.createElement('span', { className: 'whg-chip-caret', 'aria-hidden': 'true' }, '▼'),
        ),
        characterPicker(),
      ),
      React.createElement('div', { className: 'whg-chip-wrap' },
        React.createElement('button', {
          'aria-controls': 'whg-chat-picker-' + appScope,
          'aria-expanded': pickerPanel === 'chat',
          'aria-haspopup': 'listbox',
          className: 'whg-chip whg-chip-button',
          onClick: (event: any) => openPicker('chat', event.currentTarget),
          title: '点击切换 galgame 对话模型。当前模式：' + (chatMode === 'manual' ? '单独指定' : chatMode === 'main' ? '跟随工作区' : '插件默认') + '；实际使用：' + (chatModel || '离线'),
          type: 'button',
        },
          React.createElement('span', { className: 'whg-dot' + (chatModel && !s.fallbackUsed ? '' : ' off') }),
          React.createElement('span', null, '实际对话 · '),
          React.createElement('strong', null, chatModel || '离线'),
          React.createElement('span', { className: 'whg-chip-caret', 'aria-hidden': 'true' }, '▼'),
        ),
        chatPicker(),
      ),
      React.createElement('div', { className: 'whg-spacer' }),
      React.createElement('div', { className: 'whg-top-actions' },
        React.createElement('div', { className: 'whg-chip-wrap' },
          React.createElement('button', {
            'aria-controls': 'whg-background-picker-' + appScope,
            'aria-expanded': pickerPanel === 'background',
            'aria-haspopup': 'dialog',
            className: 'whg-btn',
            onClick: (event: any) => openPicker('background', event.currentTarget),
            type: 'button',
          }, '背景图'),
          backgroundPicker(),
        ),
        React.createElement('div', { className: 'whg-chip-wrap' },
          React.createElement('button', {
            'aria-controls': 'whg-sprite-picker-' + appScope,
            'aria-expanded': pickerPanel === 'sprite',
            'aria-haspopup': 'dialog',
            className: 'whg-btn',
            onClick: (event: any) => openPicker('sprite', event.currentTarget),
            title: '为' + (s.name || '当前角色') + '上传本地角色立绘',
            type: 'button',
          }, '角色立绘'),
          spritePicker(),
        ),
        React.createElement('button', {
          className: 'whg-btn',
          disabled: stageCgBusy,
          onClick: generateStageCg,
          title: '按当前角色与场景生成一张 CG，立刻显示在舞台上并收进 CG 图鉴',
          type: 'button',
        }, stageCgBusy ? '画着呢…' : '画一张'),
        React.createElement('button', {
          'aria-controls': 'whg-profile-editor-' + appScope,
          'aria-expanded': archivePanel === 'profile',
          'aria-haspopup': 'dialog',
          className: 'whg-btn',
          onClick: (event: any) => openArchive('profile', event.currentTarget),
          title: '修改' + (s.name || '当前角色') + '的昵称、称呼、问候、性格、语气与 CG 外观描述',
          type: 'button',
        }, '角色设定'),
        React.createElement('button', { className: 'whg-btn', type: 'button', onClick: () => setSceneEditorOpen(true), title: '拖动素材、文字和动态控件，保存为游戏布局' }, '场景编辑器'),
        React.createElement('button', { className: 'whg-btn', type: 'button', onClick: () => { assetsOpenedFromMain.current = true; openGal(); setGalPanel('assets') }, title: '管理素材组、自定义资产与 ComfyUI 生成' }, '资产管理'),
        React.createElement('button', {
          'aria-expanded': archivePanel === 'history',
          className: 'whg-btn',
          onClick: (event: any) => openArchive('history', event.currentTarget),
          type: 'button',
        }, '对话历史'),
        React.createElement('button', {
          'aria-expanded': archivePanel === 'gallery',
          className: 'whg-btn',
          onClick: (event: any) => openArchive('gallery', event.currentTarget),
          type: 'button',
        },
          'CG图鉴',
          galleryCount > 0 ? React.createElement('span', { className: 'whg-count' }, galleryCount) : null,
        ),
        React.createElement('div', { className: 'whg-chip-wrap' },
          (() => {
            const side = (s && s.sideStory) || {}
            const cooling = Number(side.cooldownMs) > 0
            const active = !!(side.scene)
            const mins = cooling ? Math.ceil(Number(side.cooldownMs) / 60000) : 0
            return React.createElement('button', {
              'aria-controls': 'whg-skit-picker-' + appScope,
              'aria-expanded': pickerPanel === 'skit',
              'aria-haspopup': 'dialog',
              className: 'whg-btn',
              disabled: busy || active || side.available === false,
              onClick: (event: any) => openPicker('skit', event.currentTarget),
              title: active
                ? '小剧场正在上演'
                : cooling
                  ? '小剧场冷却中，约 ' + mins + ' 分钟后可再开一场'
                  : '让工坊里的同事们演一段小剧场，可以自己指定话题',
              type: 'button',
            }, '小剧场')
          })(),
          skitPicker(),
        ),
        React.createElement('button', {
          'aria-pressed': petEnabled,
          className: 'whg-btn',
          disabled: busy,
          onClick: () => act('pet-set', { enabled: !petEnabled }),
          title: petEnabled ? '关闭桌宠，避免与其他悬浮插件冲突' : '开启可跳转 galgame 的桌宠',
          type: 'button',
        }, '桌宠 · ' + (petEnabled ? '开' : '关')),
        React.createElement('button', {
          className: 'whg-btn',
          title: '重新开始（清零等级与好感度）',
          onClick: (e: any) => {
            e.stopPropagation()
            if (armReset) { setArmReset(false); act('reset') } else { setArmReset(true) }
          },
          type: 'button',
        }, armReset ? '确认?' : '↺'),
        showBack
          ? React.createElement('button', {
            className: 'whg-btn back',
            title: '回到办公区（角色会继续在桌宠状态陪你）',
            onClick: (e: any) => { e.stopPropagation(); setOpen(false) },
            type: 'button',
          }, '返回办公区')
          : null,
      ),
    )
  }

  function sideStoryToast(): React.ReactElement | null {
    const code = s && typeof s.sideStoryError === 'string' ? s.sideStoryError : ''
    if (!code) return null
    const message = code === 'no-seed'
      ? '工坊今天很安静，等主人忙点什么之后再来看看吧。'
      : code === 'cooldown'
        ? '刚热闹过一场，让她们缓一缓。'
        : '这次没编出像样的短剧，稍后再试一次吧。'
    return React.createElement('div', { className: 'whg-toast', role: 'status' }, '🎭 ' + message)
  }

  function sideStoryScene(): any | null {
    const side = s && s.sideStory
    return side && side.scene && Array.isArray(side.scene.beats) && side.scene.beats.length ? side.scene : null
  }

  /** Index of the beat currently on screen; the cursor never runs past the last one. */
  function sideStoryBeatIndex(scene: any): number {
    return Math.max(0, Math.min(scene.cursor, scene.beats.length - 1))
  }

  function sideStoryAtEnd(scene: any): boolean {
    return scene.cursor >= scene.beats.length - 1
  }

  function castStage(scene: any): React.ReactElement {
    const frameUrl = dialogueFrameUrl
    const beat = scene.beats[sideStoryBeatIndex(scene)]
    const speaking = beat && beat.speaker !== 'narrator' ? beat.speaker : ''
    return React.createElement('div', { className: 'whg-stage' },
      React.createElement('div', {
        className: 'whg-tint',
        style: { background: 'radial-gradient(closest-side, ' + (scene.cast[0] ? scene.cast[0].color : '#8fd8ef') + '2e, transparent)' },
      }),
      React.createElement('div', { className: 'whg-cast' },
        scene.cast.map((member: any, index: number) => {
          const src = art(member.sprite)
          return React.createElement('div', {
            key: member.id,
            className: 'whg-cast-slot',
            'data-active': speaking === member.id ? 'true' : 'false',
            'data-lead': index === 0 ? 'true' : 'false',
            // Narrow screens only have room for two; the third stays in the script.
            'data-overflow': index >= 2 ? 'true' : 'false',
          },
            src
              ? React.createElement('img', { src, alt: member.name, draggable: false })
              : React.createElement('div', { className: 'whg-sprite-fallback' }, '🐋'),
            React.createElement('div', {
              className: 'whg-cast-name',
              style: { color: member.color },
            }, member.name),
          )
        }),
      ),
    )
  }

  function stage(): React.ReactElement {
    const activeScene = sideStoryScene()
    if (activeScene) return castStage(activeScene)
    const emotion = emotionOf()
    const mood = moodOf()
    let src: string | undefined
    let useFilter = !s.moodSprites
    let emoKey = ''
    if (customSprite) {
      src = customSprite
      useFilter = true
    } else if (s.current === 'deepseek' && s.spriteVariant === 'legacy-a') {
      // The eight expression sprites were drawn for the default whale-girl
      // outfit only. On any other published appearance the mood CSS filter
      // takes over, so the stage never mixes two different designs.
      emoKey = emotion === 'normal' ? '' : EMOTION_ART[emotion]
      src = emoKey ? art(emoKey) : art(s.sprite)
      useFilter = !emoKey
    } else if (s.moods) {
      src = art(s.moods[mood]) || art(s.moods.normal)
      if (!src) src = art(s.sprite)
    } else {
      src = art(s.sprite)
    }
    const wrap = (!src || imgFail)
      ? React.createElement('div', { className: 'whg-sprite-fallback' }, '🐋')
      : React.createElement('img', {
        className: 'whg-sprite' + (s.portrait ? ' whg-sprite-portrait' : '') + (customSprite ? ' whg-sprite-custom' : ''),
        src,
        alt: s.name,
        draggable: false,
        onError: () => { setImgFail(true) },
      })
    const blushOpacity = emoKey
      ? 0
      : mood === 'shy' ? 0.55 : mood === 'happy' ? 0.3 : 0
    return React.createElement('div', { className: 'whg-stage' },
      React.createElement('div', { className: 'whg-tint', style: { background: 'radial-gradient(closest-side, ' + s.color + '2e, transparent)' } }),
      // The backdrop is already switched to the pending CG, which has nothing to
      // draw yet; without this the stage just looks dead for ~18 seconds.
      stageCgBusy
        ? React.createElement('div', { className: 'whg-cg-cooking' },
          React.createElement('span', { className: 'whg-cg-dot' }),
          React.createElement('span', null, '正在画'),
          React.createElement('b', null, '这张 CG'),
          React.createElement('span', { style: { opacity: .65 } }, '约 15–25 秒'))
        : null,
      React.createElement('div', {
        className: 'whg-sprite-wrap' + (s.portrait ? ' whg-portrait' : '') + (useFilter ? ' whg-mood-' + mood : '') + (layoutEdit ? ' whg-edit' : ''),
        onPointerDown: layoutEdit ? (event: any) => beginLayoutDrag('sprite', event) : undefined,
        style: layoutStyle('sprite'),
      },
        wrap,
        React.createElement('div', {
          className: 'whg-blush',
          style: { opacity: blushOpacity },
        }),
      ),
    )
  }

  // Dialogue chrome art: the three label-free GAL视窗 skins. Missing art falls
  // back to the CSS frame, so an old save or a pruned pack still renders a box.
  const DIALOGUE_SKINS: { id: string; label: string; key: string }[] = [
    { id: 'classic', label: '宫廷鲸纹', key: 'ui-dialogue-classic' },
    { id: 'pearltide', label: '海月珍珠潮', key: 'ui-dialogue-pearltide' },
    { id: 'starsea', label: '星海礼装', key: 'ui-dialogue-starsea' },
  ]
  // Each role gets a skin that matches her palette; 'follow' (the default) picks
  // it from the role on stage, and picking a skin manually pins it everywhere.
  const ROLE_SKINS: Record<string, string> = {
    deepseek: 'classic', claude: 'pearltide', chatgpt: 'starsea', gemini: 'pearltide',
    kimi: 'starsea', grok: 'classic', glm: 'starsea', qwen: 'pearltide',
    minimax: 'classic', seed: 'pearltide', llama: 'pearltide', mistral: 'classic',
    hunyuan: 'classic', mimo: 'classic', stepfun: 'pearltide', perplexity: 'pearltide',
    rwkv: 'starsea', image2: 'starsea', jev: 'classic', wenxin: 'pearltide',
    codex: 'pearltide', comfyui: 'starsea',
  }
  const [dialogueSkin, setDialogueSkin] = useState<string>(() => {
    try {
      const saved = window.localStorage.getItem('whg:dialogue-skin')
      if (saved === 'follow' || (saved && DIALOGUE_SKINS.some((row) => row.id === saved))) return saved
    } catch (err) { /* private mode */ }
    return 'follow'
  })
  const followedSkin = ROLE_SKINS[String((s && s.current) || '')] || 'classic'
  const effectiveSkin = dialogueSkin === 'follow' ? followedSkin : dialogueSkin
  const dialogueSkinKey = (DIALOGUE_SKINS.find((row) => row.id === effectiveSkin) || DIALOGUE_SKINS[0]).key
  const dialogueFrameUrl = art(dialogueSkinKey)
  function cycleDialogueSkin(): void {
    const order = ['follow', ...DIALOGUE_SKINS.map((row) => row.id)]
    const index = order.indexOf(dialogueSkin)
    const next = order[(index + 1) % order.length]
    setDialogueSkin(next)
    try { window.localStorage.setItem('whg:dialogue-skin', next) } catch (err) { /* ignore */ }
  }


  function galApply(result: any): void {
    if (!result || typeof result !== 'object') return
    setGal(result)
    setGalError(typeof result.error === 'string' ? result.error : typeof result.warning === 'string' ? result.warning : '')
  }

  function galCall(action: string, args: any = {}): void {
    if (galBusy || galSendLock.current) return
    setGalBusy(true)
    setGalError('')
    callApi(action, { ...args, ...(action === 'gal-free-next' ? { requestId: crypto.randomUUID(), revision: gal?.world?.revision } : {}) }).then((result) => {
      galApply(result)
      setGalPanel('')
    }).catch((err) => {
      setGalError(String(err && err.message ? err.message : err))
    }).finally(() => setGalBusy(false))
  }

  /** 进入「自己决定走向」模式：不立刻发请求，先让玩家把这一段写出来。 */
  function galEnterDirect(): void {
    setGalDirect({mode:'direct',at:Date.now()})
    setGalPanel('')
    setTimeout(()=>{
      const el=document.querySelector('.whsig .signal-input input') as HTMLInputElement|null
      el?.focus()
    },60)
  }

  /** 玩家打字说话：她回一句，模型若读懂了分支就顺势推进。 */
  function galSaySend(targetRole?:string, mode?:string): void {
    const targetRoleId=typeof targetRole==='string'?targetRole:''
    // direct = 玩家直接指定接下来的发展（不是他开口说的话）
    const playerMode=mode==='direct'?'direct':'speech'
    const content = galSay.trim()
    if (!content || galSayBusy || galBusy || galSendLock.current) return
    galSendLock.current = true; setGalSayBusy(true); setGalError('')
    setGalAuto(false); setGalSkip(false)
    const requestId = galFailedSend.current?.text === content && (galFailedSend.current.targetRoleId||'')===targetRoleId ? galFailedSend.current.requestId : crypto.randomUUID()
    galFailedSend.current = { text: content, requestId, targetRoleId }
    const action = gal?.free === true ? 'gal-free-next' : 'gal-say'
    const args = gal?.free === true ? { action: content, targetRoleId, mode: playerMode, requestId, revision: gal?.world?.revision } : { text: content }
    callApi(action, args).then((result) => {
      if (result?.ok === false || result?.error) { if (result?.world) galApply(result); throw new Error(result.error || '对话未完成，请重试') }
      if (result?.free?.line) setGalReply(String(result.free.line))
      setGalSay(''); galFailedSend.current = null; galApply(result); setGalPanel('')
      setGalDirect({mode:'speech',at:Date.now()})
    }).catch((err) => setGalError(String(err?.message || err)))
      .finally(() => { galSendLock.current = false; setGalSayBusy(false) })
  }

  function layoutContext(story = false): any {
    const roleId = story ? gal?.node?.speaker && gal.node.speaker !== 'player' ? gal.node.speaker : gal?.scenario?.roleId || s.current : s.current
    const bgKey = story ? gal?.node?.stage?.bg || gal?.scenario?.stage?.bg || 'bg-atelier-night' : s.bg
    const background = story ? gal?.scenario?.backgroundUrl || art(bgKey) || art('bg-atelier-night') : (s.bg === 'cg' || s.bg === 'custom') ? bgCache.current : art(s.bg)
    const character = story ? gal?.scenario?.spriteUrls?.[roleId] || art(gal?.scenario?.sprites?.[roleId]) || art(gal?.scenario?.roleSprite) : spriteCache.current[s.current] || art(s.sprite)
    const last = lastLine()
    return {roleId,background,character,characters:story?Object.fromEntries((gal?.scenario?.stage?.cast||[]).map((c:any)=>[c.role,gal.scenario.spriteUrls?.[c.role]||art(gal.scenario.sprites?.[c.role])])):{},speaker:story ? gal?.scenario?.availableRoles?.find((r:any)=>r.id===roleId)?.name || gal?.scenario?.roleName || s.name : last?.who==='user'?'你':last?.who==='narrator'?'旁白':s.name,
      line:story ? galSayBusy?'正在等她回复……':galReply || (galTyping?galNodeText.slice(0,galTyped):galNodeText) : last?dialogueSource.slice(0,typedCount):'你可以在这里和她说话。',
      narration:story?gal?.narration||'':'',affection:story&&gal?.free?(()=>{const r=gal.world?.relationships?.[roleId];return r?'好感 '+r.affection+' · 信任 '+r.trust+' · '+r.stage:'初识'})():'Lv. '+s.level+' · '+s.affection+' / '+s.cap,clock:story?gal?.scenario?.clock?.label||'':''}
  }

  function layoutAction(action: string, story: boolean): void {
    if (scenePreview) { if (action === 'editor' || action === 'exit') setScenePreview(null); return }
    if(action==='editor'){setSceneEditorOpen(true);return}
    if(action==='journal'){setGalPanel('journal');return}
    if(action==='assets'){assetsOpenedFromMain.current=!galOpen;openGal();setGalPanel('assets');return}
    if(action==='story'){openGal();return}
    if(action==='exit'){if(story)closeGal();return}
    if(action==='advance'){if(story){if(galTyping)galRevealLine();else if(!gal.choices?.length)galCall(gal.free===true?'gal-free-next':'gal-advance')}else revealDialogue();return}
    if(action==='history'){if(story)openGalLog();else openArchive('history');return}
    if(action==='cg'){if(story)openGalCg();else openArchive('gallery');return}
    if(action==='save'||action==='load'){if(story)setGalPanel(action);else {openGal();setGalPanel(action)};return}
    if(story&&action==='auto'){setGalAuto((v)=>!v);setGalSkip(false)}
    if(story&&action==='skip'){setGalSkip((v)=>!v);setGalAuto(false)}
  }

  function customScene(story = false): any {
    const document = scenePreview || s?.sceneLayout
    if(!document?.scene)return null
    const waiting = story ? galBusy || galSayBusy : busy
    const value = story ? galSay : text
    const input = React.createElement('div',{className:'whse-input'},React.createElement('input',{'aria-label':story?'剧情对话输入':'角色对话输入',placeholder:'对她说话……',value,disabled:waiting||!!scenePreview,onChange:(e:any)=>story?setGalSay(e.target.value):setText(e.target.value),onKeyDown:(e:any)=>{if(e.key==='Enter'&&!e.nativeEvent?.isComposing){e.preventDefault();e.stopPropagation();story?galSaySend():send()}}}),React.createElement('button',{type:'button',disabled:waiting||!value.trim()||!!scenePreview,onClick:()=>story?galSaySend():send()},waiting?'等待回复…':'发送'))
    const offered = story ? gal?.choices || [] : s.choices || []
    const choices = React.createElement('div',{className:'whse-choices'},offered.map((c:any,i:number)=>React.createElement('button',{key:c.id||i,type:'button',disabled:waiting||!!scenePreview||!!c.disabled,title:c.reason||c.action,onClick:()=>{if(story){if(gal.free===true){if(c.kind==='custom')return galEnterDirect();galCall('gal-free-next',{choiceId:c.id,action:c.action||c.label,swapRoleId:c.swapRoleId})}else galCall('gal-choose',{choiceId:c.id})}else act('chat',{choiceId:c.id,text:typeof c==='string'?c:c.text})}},story?(c.caption||c.label):typeof c==='string'?c:c.text)))
    const actions = story ? [...(gal?.free?[['journal','关系与约定']]:[]),['history','回想'],['save','存档'],['load','读档'],['assets','资产'],['auto','自动'],['editor','编辑布局'],['exit','返回聊天']] : [['history','历史'],['cg','CG'],['story','剧情'],['assets','资产'],['editor','编辑布局']]
    const tools = React.createElement('div',{className:'whse-tools'},actions.map(([action,label])=>React.createElement('button',{key:action,type:'button',onClick:()=>layoutAction(action,story)},label)))
    return React.createElement(React.Fragment,null,
      React.createElement(SceneCanvas,{scene:document.scene,callApi,art,context:layoutContext(story),slots:{input,choices,tools},onAdvance:()=>layoutAction('advance',story),onAction:(action:string)=>layoutAction(action,story)}),
      React.createElement('div',{className:'whse-runtime-controls'},React.createElement('button',{type:'button',onClick:()=>scenePreview?setScenePreview(null):setSceneEditorOpen(true)},scenePreview?'返回编辑':'编辑布局'),!scenePreview?React.createElement('button',{type:'button',onClick:()=>callApi('scene-layout-publish',{id:''}).then((r:any)=>{if(r.ok&&r.view)setS(r.view)})},'恢复默认布局'):null),
      scenePreview?React.createElement('div',{className:'whse-preview-note'},'布局预览 · 对话操作暂停'):null,
    )
  }

  function sceneEditorPanel(): any {
    if(!sceneEditorOpen)return null
    const story=!!(galOpen&&gal?.started&&!gal?.ending)
    return React.createElement(SceneEditor,{callApi,art,context:layoutContext(story),hidden:!!scenePreview,
      onClose:()=>{setSceneEditorOpen(false);setScenePreview(null)},onSaved:(view:any)=>{if(view)setS(view)},onPreview:(document:any)=>setScenePreview(document),
      onAssets:()=>{setSceneEditorOpen(false);setScenePreview(null);assetsOpenedFromMain.current=!galOpen;openGal();setGalPanel('assets')},
    })
  }


  function galSystemsPanel(): any {
    return React.createElement(GalSystemsPanel, {
      callApi, roleId: (gal?.started ? gal?.scenario?.roleId : galTitleRole) || s.current || 'deepseek',
      initialTab: galPanel === 'assets' ? 'assets' : 'worlds',
      onView: (view: any) => { if (view) setS(view) },
      onClose: () => { setGalPanel(''); if (assetsOpenedFromMain.current) { assetsOpenedFromMain.current = false; setGalOpen(false) } },
      onStory: (result: any, keepOpen = false) => { galApply(result); if (!keepOpen) { assetsOpenedFromMain.current = false; setGalPanel('') } },
    })
  }

  function openGalCg(): void {
    setGalPanel('cg')
    callApi('gal-cg').then((result) => {
      setGalCg(result && Array.isArray(result.items) ? result.items : [])
    }).catch(() => setGalCg([]))
  }

  function openGalLog(): void {
    setGalPanel('log')
    callApi('gal-log').then((result) => {
      if (result && Array.isArray(result.items)) setGalLog(result.items)
      else setGalLog([])
    }).catch(() => setGalLog([]))
  }

  function openGal(): void {
    setGalLanding(true)
    setGalOpen(true)
    setGalBusy(true)
    callApi('gal-free-state').then((free) => {
      if (free && free.active && free.node) return galApply(free)
      return callApi('gal-state').then(galApply)
    }).catch((err) => {
      setGalError(String(err && err.message ? err.message : err))
    }).finally(() => setGalBusy(false))
    return
  }

  /** 旧的打开路径（保留以免引用丢失）。 */
  function openGalLegacy(): void {
    setGalOpen(true)
    setGalBusy(true)
    callApi('gal-state').then(galApply).catch((err) => {
      setGalError(String(err && err.message ? err.message : err))
    }).finally(() => setGalBusy(false))
  }

  function closeGal(): void {
    const desktop = (window as any).DSHGALDesktop
    if (standalone && typeof desktop?.quit === 'function') {
      desktop.quit()
      return
    }
    // Standalone page: reopening lands on the title hub (galLanding=true) with a
    // freshly reloaded state. Unmounting there would leave a blank document.
    if (standalone) {
      setStandaloneTitleRevision((current) => current + 1)
      openGal()
      return
    }
    setGalOpen(false)
    setGalPanel('')
  }

  /** 标题画面 */
  function galStoryArt(key: string): string | undefined {
    // The original two whale short-story endings predate the shared role CGs.
    // Resolve them to the active whale design without changing saved ending ids.
    if (key === 'gal-ending-warm' || key === 'gal-ending-plain') {
      const legacy = gal?.scenario?.sprites?.deepseek === 'maid-left'
      return art(legacy ? 'legacy-cg-deepseek' : 'cg-deepseek')
    }
    return art(key)
  }

  function galTitleScreen(): React.ReactElement {
    const endings = (gal && gal.scenario && gal.scenario.endings) || []
    const seen = endings.filter((row: any) => row.seen).length
    const roleId = galTitleRole || (gal && gal.scenario && gal.scenario.roleId) || 'deepseek'
    const heroArt = art(gal?.scenario?.sprites?.[roleId]) || art('cg-' + roleId) || art('gal-title')
    const heroName = (() => {
      const row = ((gal && gal.scenario && gal.scenario.availableRoles) || []).find((item: any) => item.id === roleId)
      return row ? row.name : ''
    })()
    const autoSlot = gal && gal.slots ? gal.slots[0] : null
    const canContinue = !!(autoSlot && autoSlot.empty === false)
    const smallButton = (label: string, onClick: () => void) =>
      React.createElement('button', { className: 'whg-gal-paper-btn', type: 'button', disabled: galBusy, onClick }, label)

    return React.createElement('div', { className: 'whg-gal whg-gal--paper' },
      React.createElement('div', { className: 'whg-gal-title-bg', style: { backgroundImage: 'url("' + art('bg-atelier-night') + '")' } }),
      // 右：大 CG
      React.createElement('div', {
        className: 'whg-gal-hero',
        style: heroArt ? { backgroundImage: 'url("' + heroArt + '")' } : undefined,
      }),
      React.createElement('div', { className: 'whg-gal-hero-seam' }),
      // 右下的角色名牌
      heroName
        ? React.createElement('div', { className: 'whg-gal-hero-name' }, heroName)
        : null,
      // 左：纸面
      React.createElement('div', { className: 'whg-gal-paper' },
        React.createElement('div', { className: 'whg-gal-paper-kicker' }, '深海女仆工坊 · 视觉小说'),
        React.createElement('div', { className: 'whg-gal-paper-title' }, (gal && gal.scenario && gal.scenario.title) || '深海女仆工坊'),
        React.createElement('div', { className: 'whg-gal-paper-sub' }, 'DEEP-SEA MAID ATELIER'),
        React.createElement('div', { className: 'whg-gal-paper-rule' }),
        React.createElement('button', {
          className: 'whg-gal-paper-primary', type: 'button', 'aria-label': '开始故事', disabled: galBusy,
          onClick: () => galCall('gal-free-start', { roleId }),
        }, '开始故事'),
        React.createElement('div', { className: 'whg-gal-paper-row' },
          canContinue
            ? React.createElement('button', {
                className: 'whg-gal-paper-btn', type: 'button', disabled: galBusy,
                onClick: () => galCall('gal-load', { slot: 0 }),
              }, '继续阅读 · ' + (((autoSlot.summary && autoSlot.summary.chapterTitle) || '') + ''))
            : smallButton('继续阅读', () => setGalPanel('load')),
          smallButton('读取存档', () => setGalPanel('load')),
        ),
        React.createElement('button', {
          className: 'whg-gal-paper-free', type: 'button', disabled: galBusy,
          onClick: () => galCall('gal-start', {}),
        }, '经典剧本 · 深海女仆工坊'),
        React.createElement('div', { className: 'whg-gal-paper-grid' },
          smallButton('世界线与资产管理', () => setGalPanel('systems')),
          smallButton('剧情树', openGalTree),
          smallButton('故事目录', openGalCatalog),
          smallButton('结局图鉴', () => setGalPanel('endings')),
          smallButton('CG 鉴赏', openGalCg),
          smallButton('好感一览', openGalBonds),
          smallButton('阅读设置', () => setGalPanel('settings')),
        ),
        React.createElement('div', { className: 'whg-gal-paper-foot' },
          React.createElement('span', null, '结局 ' + seen + '/' + endings.length),
          React.createElement('span', { className: 'whg-gal-paper-link', onClick: closeGal }, '返回聊天'),
        ),
      ),
      // 底部：22 位头像条，选中决定右侧大图
      React.createElement('div', { className: 'whg-gal-hero-strip' },
        ((gal && gal.scenario && gal.scenario.availableRoles) || []).map((row: any) => {
          const portrait = art('portrait-' + row.id)
          return React.createElement('button', {
            key: 'strip-' + row.id,
            className: 'whg-gal-strip-face' + (row.id === roleId ? ' is-current' : ''),
            style: portrait ? { backgroundImage: 'url("' + portrait + '")' } : undefined,
            title: row.name,
            type: 'button',
            onClick: () => setGalTitleRole(row.id),
          })
        }),
      ),
      galError ? React.createElement('div', { className: 'whg-gal-hint' }, galError) : null,
      galPanel === 'load' ? galSlotPanel('load') : null,
      (galPanel === 'systems' || galPanel === 'assets') ? galSystemsPanel() : null,
      galPanel === 'endings' ? galEndingPanel() : null,
      galPanel === 'cg' ? galCgPanel() : null,
      galPanel === 'journal' ? React.createElement(WorldJournal,{callApi,onStory:galApply,roles:gal?.scenario?.availableRoles,onClose:()=>setGalPanel('')}) : null,
      galPanel === 'bonds' ? galBondsPanel() : null,
      galPanel === 'settings' ? galSettingsPanel() : null,
      galPanel === 'tree' ? galTreePanel() : null,
      galPanel === 'catalog' ? galCatalogPanel() : null,
    )
  }

  /** 存 / 读档面板 */
  function galSlotPanel(mode: 'save' | 'load'): React.ReactElement {
    const rows = (gal && gal.slots) || []
    return React.createElement('div', { className: 'whg-gal-panel', onClick: (event: any) => { if (event.target === event.currentTarget) setGalPanel('') } },
      React.createElement(FolioCard, { className: 'whg-gal-panel-card', onDismiss: () => setGalPanel('') },
        React.createElement('div', { className: 'whg-gal-panel-head' },
          React.createElement('span', null, mode === 'save' ? (void 0, '保存进度') : (void 0, '读取进度')),
          React.createElement('button', { className: 'whg-gal-panel-close', type: 'button', onClick: () => setGalPanel('') }, '关闭 ×'),
        ),
        React.createElement('div', { className: 'whg-gal-slots' },
          rows.map((row: any) => React.createElement('button', {
            key: 'slot-' + row.slot,
            className: 'whg-gal-slot',
            disabled: galBusy || (mode === 'load' && row.empty),
            onClick: () => galCall(mode === 'save' ? 'gal-save' : 'gal-load', { slot: row.slot }),
            type: 'button',
          },
            React.createElement('b', null, (row.auto ? 'AUTO' : 'SLOT ' + row.slot) + (row.empty ? ' · 空' : '')),
            React.createElement('span', null, row.empty
              ? '—'
              : (row.summary.chapterTitle + ' · ' + (row.free?'第 '+row.summary.progress+' 轮':row.summary.progress+'%') + ' · ' + new Date(row.savedAt).toLocaleString())),
          )),
        ),
      ),
    )
  }

  /** 回想（LOG） */
  function galTreePanel(): React.ReactElement {
    const tree = galTree || { common: [], routes: [], totals: { nodes: 0, seen: 0 } }
    const chapterBlock = (row: any) => React.createElement('div', { key: row.id, className: 'whg-tree-chapter' },
      React.createElement('div', { className: 'whg-tree-chapter-head' },
        React.createElement('b', null, row.title),
        React.createElement('span', null, row.seen + '/' + row.total),
      ),
      React.createElement('div', { className: 'whg-tree-bar' },
        React.createElement('span', { style: { width: Math.round((row.seen / Math.max(1, row.total)) * 100) + '%' } })),
      row.nodes && row.nodes.length
        ? React.createElement('div', { className: 'whg-tree-nodes' },
            row.nodes.map((node: any) => React.createElement('div', {
              key: node.id,
              className: 'whg-tree-node' + (node.seen ? ' is-seen' : '') + (node.kind === 'choice' ? ' is-choice' : ''),
            },
              React.createElement('span', { className: 'whg-tree-dot' }),
              React.createElement('span', { className: 'whg-tree-label' }, node.label || node.id),
            )))
        : null,
    )
    return React.createElement('div', { className: 'whg-gal-panel' },
      React.createElement(FolioCard, { className: 'whg-gal-panel-card', onDismiss: () => setGalPanel('') },
        React.createElement('div', { className: 'whg-gal-panel-head' },
          React.createElement('span', null, '剧情树 · ' + tree.totals.seen + '/' + tree.totals.nodes + ' 节点'),
          React.createElement('button', { className: 'whg-gal-panel-close', type: 'button', onClick: () => setGalPanel('') }, '关闭 ×'),
        ),
        React.createElement('div', { className: 'whg-gal-empty', style: { textAlign: 'left', padding: '4px 0 10px' } },
          '实心 = 走过，空心 = 还没走到。个人线只统计，展开会太长。'),
        (tree.common || []).map(chapterBlock),
        React.createElement('div', { className: 'whg-tree-routes' },
          React.createElement('b', null, '个人线 ' + (tree.routes || []).length + ' 条'),
          React.createElement('div', { className: 'whg-tree-route-grid' },
            (tree.routes || []).map((row: any) => React.createElement('div', {
              key: row.id, className: 'whg-tree-route' + (row.seen ? ' is-seen' : ''),
            }, row.title + ' ' + row.seen + '/' + row.total))),
        ),
      ),
    )
  }

  function galCatalogPanel(): React.ReactElement {
    const log = galChapterLog
    return React.createElement('div', { className: 'whg-gal-panel' },
      React.createElement(FolioCard, { className: 'whg-gal-panel-card', onDismiss: () => setGalPanel('') },
        React.createElement('div', { className: 'whg-gal-panel-head' },
          React.createElement('span', null, log ? log.title : '故事目录'),
          React.createElement('button', {
            className: 'whg-gal-panel-close', type: 'button',
            onClick: () => (log ? setGalChapterLog(null) : setGalPanel('')),
          }, log ? '返回 ×' : '关闭 ×'),
        ),
        log
          ? React.createElement('div', { className: 'whg-gal-log' },
              log.items.map((row: any) => React.createElement('div', { key: row.id, className: 'whg-gal-log-row' },
                React.createElement('b', null, row.speaker + (row.at ? ' · ' + row.at : '')),
                React.createElement('span', null, row.text),
              )))
          : galCatalog.map((row: any) => React.createElement('button', {
              key: row.id,
              className: 'whg-catalog-row',
              type: 'button',
              disabled: row.seen === 0,
              onClick: () => openChapterLog(row.id),
            },
              React.createElement('b', null, row.title),
              React.createElement('span', null, row.seen + '/' + row.total + (row.snippet ? ' · ' + row.snippet : ' 还没读过')),
            )),
      ),
    )
  }

  function galSettingsPanel(): React.ReactElement {
    const speeds = [{ label: '慢', value: 42 }, { label: '标准', value: 22 }, { label: '快', value: 10 }, { label: '瞬显', value: 0 }]
    const autos = [{ label: '2.2 秒', value: 2200 }, { label: '3.5 秒', value: 3500 }, { label: '1.2 秒', value: 1200 }]
    const row = (title: string, note: string, options: any[], current: any, onPick: (value: any) => void) =>
      React.createElement('div', { className: 'whg-gal-setting-row' },
        React.createElement('div', { className: 'whg-gal-setting-label' },
          React.createElement('b', null, title),
          React.createElement('span', null, note),
        ),
        React.createElement('div', { className: 'whg-gal-setting-options' },
          options.map((option) => React.createElement('button', {
            key: String(option.value),
            type: 'button',
            className: 'whg-gal-setting-chip' + (current === option.value ? ' is-on' : ''),
            onClick: () => onPick(option.value),
          }, option.label)),
        ),
      )
    return React.createElement('div', { className: 'whg-gal-panel' },
      React.createElement(FolioCard, { className: 'whg-gal-panel-card', onDismiss: () => setGalPanel('') },
        React.createElement('div', { className: 'whg-gal-panel-head' },
          React.createElement('span', null, '阅读设置'),
          React.createElement('button', {
            className: 'whg-gal-panel-close', type: 'button', onClick: () => setGalPanel(''),
          }, '关闭 ×'),
        ),
        row('文字速度', '逐字显示的快慢', speeds, galSettings.speed,
          (value) => galApplySettings({ ...galSettings, speed: value })),
        row('自动播放', '「自动」开启后每句停留多久', autos, galSettings.auto,
          (value) => galApplySettings({ ...galSettings, auto: value })),
        React.createElement('div', { className: 'whg-gal-setting-row' },
          React.createElement('div', { className: 'whg-gal-setting-label' },
            React.createElement('b', null, '隐藏界面'),
            React.createElement('span', null, '只看画面和台词，适合截图'),
          ),
          React.createElement('div', { className: 'whg-gal-setting-options' },
            React.createElement('button', {
              type: 'button',
              className: 'whg-gal-setting-chip' + (galSettings.hideUI ? ' is-on' : ''),
              onClick: () => galApplySettings({ ...galSettings, hideUI: !galSettings.hideUI }),
            }, galSettings.hideUI ? '已隐藏' : '显示中'),
          ),
        ),
      ),
    )
  }

  function galBondsPanel(): React.ReactElement {
    return React.createElement('div', { className: 'whg-gal-panel' },
      React.createElement(FolioCard, { className: 'whg-gal-panel-card', onDismiss: () => setGalPanel('') },
        React.createElement('div', { className: 'whg-gal-panel-head' },
          React.createElement('span', null, '好感 · 22 位女主角'),
          React.createElement('button', {
            className: 'whg-gal-panel-close', type: 'button', onClick: () => setGalPanel(''),
          }, '关闭 ×'),
        ),
        React.createElement('div', { className: 'whg-bond-list' },
          galBonds.map((row: any) => {
            const portrait = art(row.portrait)
            const percent = Math.min(100, Math.round((row.score / 14) * 100))
            return React.createElement('div', { key: row.id, className: 'whg-bond-row' + (row.available ? ' is-open' : '') },
              React.createElement('span', {
                className: 'whg-bond-face',
                style: portrait ? { backgroundImage: 'url("' + portrait + '")' } : undefined,
              }),
              React.createElement('div', { className: 'whg-bond-main' },
                React.createElement('div', { className: 'whg-bond-top' },
                  React.createElement('b', { style: { color: row.color } }, row.name),
                  React.createElement('span', { className: 'whg-bond-stage' }, row.stage),
                ),
                React.createElement('div', { className: 'whg-bond-bar' },
                  React.createElement('span', { style: { width: percent + '%' } }),
                ),
                React.createElement('div', { className: 'whg-bond-note' },
                  row.note + (row.endingsSeen ? ' · 结局 ' + row.endingsSeen + '/' + row.endingsTotal : ''),
                ),
              ),
            )
          }),
        ),
      ),
    )
  }

  function galCgPanel(): React.ReactElement {
    const unlocked = galCg.filter((row: any) => row.seen).length
    return React.createElement('div', { className: 'whg-gal-panel' },
      React.createElement(FolioCard, { className: 'whg-gal-panel-card', onDismiss: () => setGalPanel('') },
        React.createElement('div', { className: 'whg-gal-panel-head' },
          React.createElement('span', null, 'CG 图鉴 · ' + unlocked + '/' + galCg.length),
          React.createElement('button', {
            className: 'whg-gal-panel-close', type: 'button', onClick: () => setGalPanel(''),
          }, '关闭 ×'),
        ),
        galCg.length
          ? React.createElement('div', { className: 'whg-gal-slots' },
              galCg.map((row: any) => {
                const url = row.live ? String(row.url || '') : (row.seen ? galStoryArt(row.art || row.key) : '')
                return React.createElement('div', { key: row.key, className: 'whg-gal-ending-card' },
                  React.createElement('div', {
                    className: 'whg-gal-ending-thumb' + (row.seen ? '' : ' locked'),
                    style: url ? { backgroundImage: 'url("' + url + '")' } : undefined,
                  }),
                  React.createElement('div', { className: 'whg-gal-ending-cap' }, row.seen ? row.title : '？？？'),
                )
              }),
            )
          : React.createElement('div', { className: 'whg-gal-empty' }, '还没有可收集的 CG'),
      ),
    )
  }

  function galLogPanel(): React.ReactElement {
    return React.createElement('div', { className: 'whg-gal-panel', onClick: (event: any) => { if (event.target === event.currentTarget) setGalPanel('') } },
      React.createElement(FolioCard, { className: 'whg-gal-panel-card', onDismiss: () => setGalPanel('') },
        React.createElement('div', { className: 'whg-gal-panel-head' },
          React.createElement('span', null, '回想 · ' + galLog.length + ' 条'),
          React.createElement('button', { className: 'whg-gal-panel-close', type: 'button', onClick: () => setGalPanel('') }, '关闭 ×'),
        ),
        galLog.length === 0
          ? React.createElement('div', { className: 'whg-gal-empty' }, '还没有可以回看的台词')
          : React.createElement('div', { className: 'whg-gal-log' },
            galLog.map((row: any) => React.createElement('div', { key: 'log-' + row.id, className: 'whg-gal-log-row' },
              React.createElement('b', null, row.speaker),
              React.createElement('span', null, row.text),
            ))),
      ),
    )
  }

  /** 结局图鉴 */
  function galEndingPanel(): React.ReactElement {
    const endings = (gal && gal.scenario && gal.scenario.endings) || []
    return React.createElement('div', { className: 'whg-gal-panel', onClick: (event: any) => { if (event.target === event.currentTarget) setGalPanel('') } },
      React.createElement(FolioCard, { className: 'whg-gal-panel-card', onDismiss: () => setGalPanel('') },
        React.createElement('div', { className: 'whg-gal-panel-head' },
          React.createElement('span', null, '结局图鉴'),
          React.createElement('button', { className: 'whg-gal-panel-close', type: 'button', onClick: () => setGalPanel('') }, '关闭 ×'),
        ),
        React.createElement('div', { className: 'whg-gal-slots' },
          endings.map((row: any) => {
            const url = row.seen && row.art ? galStoryArt(row.art) : ''
            return React.createElement('div', { key: row.id, className: 'whg-gal-ending-card' },
              React.createElement('div', {
                className: 'whg-gal-ending-thumb' + (row.seen ? '' : ' locked'),
                style: url ? { backgroundImage: 'url("' + url + '")' } : undefined,
              }),
              React.createElement('div', { className: 'whg-gal-ending-cap' }, row.seen ? row.title : '？？？'),
              React.createElement('div', { className: 'whg-gal-ending-note' }, row.seen ? '已达成' : (row.hint || '尚未达成')),
            )
          }),
        ),
      ),
    )
  }

  /** 正文画面 */
  function galGameScreen(): React.ReactElement {
    if(scenePreview || s?.sceneLayout) return React.createElement('div',{className:'whg-gal',ref:galStageRef},customScene(true),
      galPanel === 'save' ? galSlotPanel('save') : null,
      galPanel === 'load' ? galSlotPanel('load') : null,
      (galPanel === 'systems' || galPanel === 'assets') ? galSystemsPanel() : null,
      galPanel === 'log' ? galLogPanel() : null,
      galPanel === 'cg' ? galCgPanel() : null,
      galPanel === 'journal' ? React.createElement(WorldJournal,{callApi,onStory:galApply,roles:gal?.scenario?.availableRoles,onClose:()=>setGalPanel('')}) : null,
      galPanel === 'bonds' ? galBondsPanel() : null,
      galPanel === 'settings' ? galSettingsPanel() : null,
      galError ? React.createElement('div',{className:'whg-gal-hint',role:'alert'},galError) : null,
    )
    if(gal?.free) return React.createElement('div',{className:'whg-gal',ref:galStageRef},
      React.createElement(DirectedReading,{gal,art,busy:galBusy||galSayBusy,typing:galTyping,text:galReply||(galTyping?galNodeText.slice(0,galTyped):galNodeText),input:galSay,onInput:setGalSay,onSend:galSaySend,onDirect:galEnterDirect,direct:galDirectText.mode==='direct',onReveal:galRevealLine,onChoose:(c:any)=>c.kind==='custom'?galEnterDirect():galCall('gal-free-next',{choiceId:c.id,action:c.action||c.label,swapRoleId:c.swapRoleId})
    ,onDirect:()=>galEnterDirect(),direct:galDirectText.mode==='direct',onAdvance:()=>galCall('gal-free-next'),auto:galAuto,skip:galSkip,hide:galSettings.hideUI,
        onTool:(key:string)=>{
          if(key==='auto'){setGalAuto(v=>!v);setGalSkip(false)}
          else if(key==='skip'){setGalSkip(v=>!v);setGalAuto(false)}
          else if(key==='hide')setGalSettings(v=>({...v,hideUI:!v.hideUI}))
          else if(key==='history')openGalLog()
          else if(key==='editor')setSceneEditorOpen(true)
          else if(key==='exit')closeGal()
          else setGalPanel(key)
        },
      }),
      galPanel === 'save' ? galSlotPanel('save') : null,
      galPanel === 'load' ? galSlotPanel('load') : null,
      (galPanel === 'systems' || galPanel === 'assets') ? galSystemsPanel() : null,
      galPanel === 'log' ? galLogPanel() : null,
      galPanel === 'cg' ? galCgPanel() : null,
      galPanel === 'journal' ? React.createElement(WorldJournal,{callApi,onStory:galApply,roles:gal.scenario?.availableRoles,onClose:()=>setGalPanel('')}) : null,
      galPanel === 'settings' ? galSettingsPanel() : null,
      galError ? React.createElement('div',{className:'whg-gal-hint',role:'alert'},galError) : null,
    )
    const node = gal.node || {}
    // 舞台继承：当前节点没写 stage 就用这一幕上一个带 stage 的节点（立绘留在台上）。
    const inherited = gal && gal.scenario && gal.scenario.stage ? gal.scenario.stage : null
    const stage = node.stage || inherited || {}
    const clockLabel = String(gal?.scenario?.clock?.label || '')
    const backgroundKey = !stage.bg || stage.bg === 'gal-ch1-bg'
      ? (/白日|清晨|午后/.test(clockLabel) ? 'bg-atelier-day' : 'bg-atelier-night')
      : stage.bg
    const stageBg = gal?.scenario?.backgroundUrl || art(backgroundKey) || art('gal-ch1-bg')
    const speakerLabel = (() => {
      if (node.kind === 'narration') return '旁白'
      if (!node.speaker) return ''
      if (node.speaker === 'player') return '你'
      const role = gal?.scenario?.availableRoles?.find((row: any) => row.id === node.speaker)
      return role?.name || ((gal?.scenario?.roleId === node.speaker) ? (gal.scenario.roleName || s.name) : node.speaker)
    })()
    // 这段剧情的主角的立绘；取不到才退回聊天当前角色。
    const storySprite = gal && gal.scenario && gal.scenario.roleSprite ? art(gal.scenario.roleSprite) : ''
    const spriteSrc = storySprite || spriteCache.current[s.current] || art(s.sprite)
    return React.createElement('div', {
      ref: galStageRef,
      className: 'whg-gal' + (galFx ? ' whg-fx-' + galFx : ''),
      'data-bg': stage.bg || '',
    },
      React.createElement('div', {
        key: 'bg-' + (stage.bg || ''),
        className: 'whg-gal-bg',
        style: stageBg ? { backgroundImage: 'url("' + stageBg + '")' } : undefined,
      }),
      React.createElement('div', { className: 'whg-gal-veil' }),
      // 多立绘同台：cast 里有谁就摆谁，说话的人亮、其他人压暗。
      // 老数据只有 speaker 时就画当前主角一位。
      (() => {
        const spriteMap = (gal && gal.scenario && gal.scenario.sprites) || {}
        const spriteUrls = gal?.scenario?.spriteUrls || {}
        const rawCast = Array.isArray(stage.cast) ? stage.cast.slice(0, 3) : []
        const speaker = node.speaker || ''
        // cast 里可能是角色 id，也可能是 { role, x, scale, alpha, enter }。
        const specs = rawCast.length
          ? rawCast.map((entry: any, index: number) => {
            const autoX = rawCast.length === 1 ? 50 : ([24, 50, 76][index] || 76)
            if (typeof entry === 'string') return { role: entry, x: autoX }
            return {
              role: entry.role,
              x: typeof entry.x === 'number' ? entry.x : autoX,
              scale: entry.scale,
              alpha: entry.alpha,
              enter: entry.enter,
            }
          })
          : (spriteSrc ? [{ role: (gal && gal.scenario && gal.scenario.roleId) || '', x: 50 }] : [])
        const shown = specs.filter((spec: any) => spec.role && (spriteUrls[spec.role] || art(spriteMap[spec.role] || gal.scenario.roleSprite)))
        if (!shown.length) return null
        return React.createElement('div', { className: 'whg-gal-cast', 'data-narration': node.kind === 'narration' || !speaker },
          shown.map((spec: any) => {
            // 旁白没有"谁在说"，不该把三个人一起压暗。
            const speak = !speaker || speaker === spec.role
            const scale = typeof spec.scale === 'number' ? spec.scale : 1
            const style: any = {
              left: spec.x + '%',
              transform: 'translateX(-50%) scale(' + scale + ')',
            }
            if (typeof spec.alpha === 'number') style.opacity = spec.alpha
            return React.createElement('img', {
              key: 'actor-' + spec.role,
              className: 'whg-gal-actor whg-gal-enter-' + (spec.enter || 'fade') + (speak ? ' is-speaking' : ' is-quiet'),
              style,
              src: spriteUrls[spec.role] || art(spriteMap[spec.role] || gal.scenario.roleSprite),
              alt: '',
              draggable: false,
            })
          }),
        )
      })(),
      galSettings.hideUI ? null : React.createElement('div', { className: 'whg-gal-tools' },
        React.createElement('button', {
          className: 'whg-tool' + (galAuto ? ' is-on' : ''),
          onClick: () => { setGalAuto((previous) => !previous); setGalSkip(false) },
          title: '每 2.2 秒自动推进',
          type: 'button',
        }, '自动'),
        React.createElement('button', {
          className: 'whg-tool' + (galSkip ? ' is-on' : ''),
          onClick: () => { setGalSkip((previous) => !previous); setGalAuto(false) },
          title: '只跳过已读过的台词',
          type: 'button',
        }, '快进'),
        React.createElement('button', { className: 'whg-tool', onClick: () => setGalPanel('systems'), type: 'button' }, '世界 / 资产'),
        React.createElement('button', { className: 'whg-tool', onClick: () => setSceneEditorOpen(true), type: 'button' }, '场景编辑'),
        React.createElement('button', { className: 'whg-tool', onClick: openGalLog, type: 'button' }, '回想'),
        React.createElement('button', { className: 'whg-tool', onClick: openGalBonds, type: 'button' }, '好感'),
        React.createElement('button', { className: 'whg-tool', onClick: () => setGalPanel('settings'), type: 'button' }, '设置'),
        React.createElement('button', { className: 'whg-tool', onClick: () => setGalPanel('save'), type: 'button' }, '存档'),
        React.createElement('button', { className: 'whg-tool', onClick: () => setGalPanel('load'), type: 'button' }, '读档'),
        React.createElement('button', { className: 'whg-tool', onClick: closeGal, type: 'button' }, '退出'),
      ),
      gal.choices && gal.choices.length
        ? React.createElement('div', { className: 'whg-gal-choices' },
          gal.choices.map((choice: any) => React.createElement('button', {
            key: choice.id,
            className: 'whg-gal-choice',
            disabled: galBusy,
            onClick: (event: any) => {
              event.stopPropagation()
              // 自由剧情里选项就是"她可以对你说的话/你可以做的事"，把文案当行动交给模型。
              if (gal.free === true) {
                if (choice.kind === 'custom') return galEnterDirect()
                galCall('gal-free-next', {choiceId:choice.id,action:choice.action||choice.label,swapRoleId:choice.swapRoleId})
              }
              else galCall('gal-choose', { choiceId: choice.id })
            },
            type: 'button',
          },
            !choice.kind && choice.tag ? React.createElement('span', { className: 'whg-gal-choice-tag' }, choice.tag) : null,
            React.createElement('span', { className: 'whg-gal-choice-label' }, choice.caption||choice.label),
          )))
        : null,
      React.createElement('div', {
        className: 'whg-gal-box',
        onClick: () => {
          // 第一次点击先补全这一句，再点才推进——文字冒险的基本手感。
          if (galTyping) { galRevealLine(); return }
          if (!(gal.choices && gal.choices.length)) {
            if (gal.free === true) galCall('gal-free-next', {})
            else galCall('gal-advance')
          }
        },
      },
        speakerLabel ? React.createElement('div', { className: 'whg-gal-speaker' }, speakerLabel) : null,
        gal.free === true && gal.narration
          ? React.createElement('div', { className: 'whg-gal-narr' }, gal.narration)
          : null,
        !galTyping && !galBusy && !(gal.choices && gal.choices.length) ? React.createElement('span', { className: 'whg-gal-next', 'aria-hidden': true }, '▾') : null,
        React.createElement('div', { className: 'whg-gal-text' },
          galSayBusy
            ? '（她正在想……）'
            : galReply
              ? galReply
              : galBusy
                ? '……'
                : (galTyping ? galNodeText.slice(0, galTyped) : galNodeText),
          (!galReply && !galSayBusy && galTyping) ? React.createElement('span', { className: 'whg-gal-caret' }, '▍') : null,
        ),
        React.createElement('div', {
          className: 'whg-gal-say',
          onClick: (event: any) => { if (event && event.stopPropagation) event.stopPropagation() },
        },
          React.createElement('input', {
            className: 'whg-gal-say-input',
            value: galSay,
            placeholder: '也可以直接对她说话，剧情会跟着走……',
            disabled: galSayBusy || galBusy,
            onChange: (event: any) => setGalSay(event.target.value),
            onKeyDown: (event: any) => {
              if (event.key === 'Enter' && !event.nativeEvent?.isComposing) {
                event.preventDefault()
                event.stopPropagation()
                galSaySend()
              }
            },
          }),
          React.createElement('button', {
            className: 'whg-gal-say-send',
            type: 'button',
            disabled: galSayBusy || galBusy || !galSay.trim(),
            onClick: (event: any) => { event.stopPropagation(); galSaySend() },
          }, galSayBusy ? '…' : '说'),
        ),
        gal.scenario && gal.scenario.clock && !galSettings.hideUI
          ? React.createElement('div', { className: 'whg-gal-clock' }, gal.scenario.clock.label)
          : null,
        galSettings.hideUI ? null : React.createElement('div', { className: 'whg-gal-hint' }, gal.free === true ? '共创剧情 · 第 ' + (gal.world?.revision || 0) + ' 轮' : '点击 / 空格 继续 · ' + (gal.progress || 0) + '%'),
      ),
      galError ? React.createElement('div', { className: 'whg-gal-hint' }, galError) : null,
      galPanel === 'save' ? galSlotPanel('save') : null,
      galPanel === 'load' ? galSlotPanel('load') : null,
      (galPanel === 'systems' || galPanel === 'assets') ? galSystemsPanel() : null,
      galPanel === 'log' ? galLogPanel() : null,
      galPanel === 'cg' ? galCgPanel() : null,
      galPanel === 'journal' ? React.createElement(WorldJournal,{callApi,onStory:galApply,roles:gal?.scenario?.availableRoles,onClose:()=>setGalPanel('')}) : null,
      galPanel === 'bonds' ? galBondsPanel() : null,
      galPanel === 'settings' ? galSettingsPanel() : null,
    )
  }

  /** 结局画面 */
  function galEndingScreen(): React.ReactElement {
    const ending = gal.ending
    const artUrl = ending.art ? galStoryArt(ending.art) : art('gal-title')
    return React.createElement('div', { className: 'whg-gal whg-gal--ending' },
      React.createElement('div', { className: 'whg-gal-bg', style: artUrl ? { backgroundImage: 'url("' + artUrl + '")' } : undefined }),
      React.createElement('div', { className: 'whg-gal-veil' }),
      React.createElement('div', { className: 'whg-gal-ending' },
        React.createElement('div', { className: 'whg-gal-ending-text' },
          React.createElement('div', { className: 'whg-gal-title-sub' }, 'ENDING'),
          React.createElement('h2', null, ending.title),
          React.createElement('p', null, ending.hint || ''),
        ),
        React.createElement('div', { className: 'whg-gal-menu' },
          React.createElement('button', { onClick: () => galCall('gal-reset'), type: 'button' }, '回到标题'),
          React.createElement('button', { className: 'ghost', onClick: () => setGalPanel('endings'), type: 'button' }, '结局图鉴'),
          React.createElement('button', { className: 'ghost', onClick: () => openGalCg(), type: 'button' }, 'CG 图鉴'),
          React.createElement('button', { className: 'ghost', onClick: closeGal, type: 'button' }, standalone ? '返回标题' : '返回聊天'),
        ),
      ),
      galPanel === 'endings' ? galEndingPanel() : null,
      galPanel === 'cg' ? galCgPanel() : null,
    )
  }

  function signalGame(): React.ReactElement {
    return React.createElement('div',{className:'whg-gal',ref:galStageRef},React.createElement(SignalGame,{
      key:standalone?standaloneTitleRevision:undefined,
      gal,standalone,art:galStoryArt,callApi,onEnterStory:()=>setGalLanding(false),onShowTitle:()=>setGalLanding(true),onStory:galApply,onCall:galCall,onExit:closeGal,onRoleChange:setGalTitleRole,
      busy:galBusy||galSayBusy,line:galReply||galNodeText,nodeKey:gal.node?.id,readerController:signalReaderController,readerBlocked:!!galPanel||sceneEditorOpen,onStopSkip:()=>setGalSkip(false),input:galSay,onInput:(value:string)=>{setGalSay(value);if(value.trim()){setGalAuto(false);setGalSkip(false)}},onSend:galSaySend,onDirect:galEnterDirect,direct:galDirectText.mode==='direct',onReveal:galRevealLine,
      onAdvance:()=>{if(!galBusy&&!galSayBusy)galCall(gal.free?'gal-free-next':'gal-advance')},
      onChoose:(c:any)=>gal.free?(c.kind==='custom'?galEnterDirect():galCall('gal-free-next',{choiceId:c.id,action:c.action||c.label,swapRoleId:c.swapRoleId})):galCall('gal-choose',{choiceId:c.id}),
      auto:galAuto,skip:galSkip,settings:galSettings,onSettings:galApplySettings,error:galError,
      onModalChange:(open:boolean)=>{setSignalPanelOpen(open);if(open){setGalAuto(false);setGalSkip(false)}},
      onTool:(key:string)=>{
        if(key==='auto'){setGalAuto(v=>!v);setGalSkip(false);return}
        if(key==='skip'){setGalSkip(v=>!v);setGalAuto(false);return}
        setGalAuto(false);setGalSkip(false)
        if(key==='ensemble')setGalPanel('ensemble')
        else if(key==='editor')setSceneEditorOpen(true)
        else if(key==='assets')setGalPanel('assets')
        else if(key==='worlds')setGalPanel('systems')
        else if(key==='journal')openGalBonds()
        else if(key==='tree')openGalTree()
        else if(key==='catalog')openGalCatalog()
        else if(key==='endings')setGalPanel('endings')
        else if(key==='classic')galCall('gal-start',{})
      },
    },
      (galPanel==='systems'||galPanel==='assets')?galSystemsPanel():null,
      galPanel==='ensemble'?React.createElement(CastPanel,{callApi,art:galStoryArt,onProfileSaved:(r:any)=>{if(r.view)setS(r.view)},busy:galBusy||galSayBusy,onClose:()=>setGalPanel(''),onInvite:(r:any)=>galCall('gal-free-next',{inviteRoleId:r.id,targetRoleId:r.id,action:(gal.ensemble?.present||[]).includes(r.id)?'问问'+r.name+'此刻的想法。':'请'+r.name+'过来一起聊聊她手上的事情。'})}):null,
      galPanel==='journal'?React.createElement(WorldJournal,{callApi,onStory:galApply,roles:gal.scenario?.availableRoles,onClose:()=>setGalPanel('')}):null,
      galPanel==='bonds'?galBondsPanel():null,
      galPanel==='tree'?galTreePanel():null,
      galPanel==='catalog'?galCatalogPanel():null,
      galPanel==='endings'?galEndingPanel():null,
    ))
  }

  function galOverlay(): React.ReactElement | null {
    if (!galOpen) return null
    if (!gal) {
      return React.createElement('div', { className: 'whg-gal' },
        React.createElement('div', { className: 'whg-gal-ending' },
          React.createElement('h2', null, '读取中…'),
          React.createElement('p', null, galError || '正在载入剧本'),
        ),
      )
    }
    if(gal.started&&!gal.ending&&(scenePreview||(!galLanding&&s?.sceneLayout)))return galGameScreen()
    return signalGame()
  }

  const galNodeText = gal && gal.started && gal.node ? String(gal.node.text || '') : ''
  const galTyping = galTyped < galNodeText.length

  useEffect(() => {
    setGalTyped(0)
  }, [galNodeText])

  // 换节点后上一句自由回话就该收起来，否则会盖住新剧情。
  useEffect(() => {
    setGalReply('')
  }, [gal && gal.node ? gal.node.id : ''])

  useEffect(() => {
    const fx = gal && gal.node && gal.node.fx ? String(gal.node.fx) : ''
    if (!fx) { setGalFx(''); return undefined }
    setGalFx(fx)
    const timer = setTimeout(() => setGalFx(''), fx === 'fade' ? 700 : 520)
    return () => clearTimeout(timer)
  }, [gal && gal.node ? gal.node.id : '', gal && gal.node ? gal.node.fx : ''])

  useEffect(() => {
    if (galTyped >= galNodeText.length || galOpen&&!scenePreview&&!s?.sceneLayout) return undefined
    // 按长度分配，长句不会等太久。
    const step = Math.max(2, Math.ceil(galNodeText.length / 80))
    const timer = setTimeout(() => setGalTyped((current) => Math.min(galNodeText.length, current + step)), galSettings.speed)
    return () => clearTimeout(timer)
  }, [galTyped, galNodeText, galSettings.speed,galOpen,scenePreview,s?.sceneLayout])

  function galRevealLine(): void {
    if(signalReaderController.current){signalReaderController.current.reveal();return}
    setGalTyped(galNodeText.length)
  }

  // 键盘：空格/回车推进，Esc 关面板。Esc 不退出剧情——误按关掉整局太伤。
  useEffect(() => {
    if (!galOpen || galLanding || sceneEditorOpen || signalPanelOpen) return undefined
    const onKey = (event: KeyboardEvent) => {
      const target: any = event.target
      if (event.key === 'Escape') {
        if (assetsOpenedFromMain.current) {
          assetsOpenedFromMain.current = false
          // Standalone has no chat view to fall back to: go back to the title.
          if (standalone) setGalLanding(true)
          else setGalOpen(false)
        }
        setGalPanel('')
        return
      }
      if (target && ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'].includes(target.tagName)) return
      if (event.key !== ' ' && event.key !== 'Enter') return
      if (galPanel || galSendLock.current || galSayBusy) return
      if (!gal || !gal.started || gal.ending) return
      event.preventDefault()
      if(signalReaderController.current){signalReaderController.current.advance();return}
      if (galTyping) { galRevealLine(); return }
      if (gal.choices && gal.choices.length) return
      if (!galBusy) galCall(gal.free === true ? 'gal-free-next' : 'gal-advance')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [galOpen, galLanding, galPanel, gal, galTyping, galBusy, sceneEditorOpen, signalPanelOpen])

  // 自动播放与快进：快进只跳已读节点（没读过的会停下来），自动每 2.2 秒推进一次。
  useEffect(() => {
    if (!galOpen || galLanding || !gal || !gal.started || gal.ending || sceneEditorOpen || signalPanelOpen) return undefined
    if (!scenePreview&&!s?.sceneLayout) return undefined // Signal reading advances its own pages first.
    if (!galAuto && !galSkip) return undefined
    if (galPanel || galSayBusy || galBusy || (galTyping && !galSkip)) return undefined
    const node = gal.node
    if (!node || node.kind === 'choice') return undefined
    if (galSkip && !node.isRead) { setGalSkip(false); return undefined }
    const delay = galSkip ? 120 : galSettings.auto
    const timer = setTimeout(() => { if (!galBusy) galCall(gal.free === true ? 'gal-free-next' : 'gal-advance') }, delay)
    return () => clearTimeout(timer)
  }, [galOpen, galLanding, gal, galAuto, galSkip, galBusy, galSettings.auto, galPanel, galTyping, sceneEditorOpen, signalPanelOpen,scenePreview,s?.sceneLayout])

  // Choices follow the actual dialogue height, including free-story narration.
  useEffect(() => {
    const stage = galStageRef.current
    const box = stage?.querySelector('.whg-gal-box')
    if (!stage || !box || typeof ResizeObserver === 'undefined') return undefined
    const measure = () => stage.style.setProperty('--gal-box-height', box.getBoundingClientRect().height + 'px')
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    measure()
    return () => observer.disconnect()
  }, [galOpen, gal?.started, gal?.ending, gal?.free])

  // ---- stage layout (drag to move, shift-drag to resize) ------------------
  // Every layer of the stage is addressable. Values are percentages of the
  // dialogue frame for translation, and a multiplier for scale, so the layout
  // survives a window resize.
  const STAGE_LAYERS = ['sprite', 'box', 'name', 'text', 'hud', 'choices'] as const
  const LAYOUT_DEFAULT: any = {
    sprite: { x: 0, y: 0, s: 1 },
    // The frame art is 2.76:1, so at full width it owns ~58% of the screen.
    // 80% is the same dialogue box, comfortably sized.
    box: { x: 0, y: 0, s: 0.8 },
    name: { x: 0, y: 0, s: 1 },
    text: { x: 0, y: 0, s: 1 },
    hud: { x: 0, y: 0, s: 1 },
    choices: { x: 0, y: 0, s: 1 },
  }
  function readLayout(raw: any): any {
    const out: any = {}
    for (const layer of STAGE_LAYERS) {
      const row = raw && raw[layer] ? raw[layer] : {}
      const scale = Number(row.s)
      out[layer] = {
        x: Number(row.x) || 0,
        y: Number(row.y) || 0,
        s: Number.isFinite(scale) && scale > 0.2 && scale < 3 ? scale : LAYOUT_DEFAULT[layer].s,
      }
    }
    return out
  }
  const [layout, setLayout] = useState<any>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('whg:stage-layout') || 'null')
      if (saved && typeof saved === 'object') return readLayout(saved)
    } catch (err) { /* ignore */ }
    return LAYOUT_DEFAULT
  })
  const [layoutEdit, setLayoutEdit] = useState(false)
  const layoutRef = useRef<any>(layout)
  layoutRef.current = layout
  const dialogueBoxRef = useRef<any>(null)
  function persistLayout(next: any): void {
    try { window.localStorage.setItem('whg:stage-layout', JSON.stringify(next)) } catch (err) { /* ignore */ }
  }
  function resetLayout(): void {
    setLayout(LAYOUT_DEFAULT)
    persistLayout(LAYOUT_DEFAULT)
  }
  /** Translation in percent of the frame plus a scale, as one transform. */
  function layoutStyle(kind: string): any {
    const row = layout[kind]
    if (!row) return undefined
    const moved = row.x !== 0 || row.y !== 0
    const scaled = row.s !== 1
    if (!moved && !scaled) return undefined
    // The frame is scaled by WIDTH, not by transform: transform leaves the
    // element's layout box untouched, so the choices above it would float in the
    // gap left behind by a shrunken frame.
    if (kind === 'box') {
      const boxStyle: any = { width: Math.round(row.s * 1000) / 10 + '%' }
      boxStyle.marginLeft = 'auto'
      boxStyle.marginRight = 'auto'
      if (moved) boxStyle.transform = 'translate(' + row.x + '%, ' + row.y + '%)'
      return boxStyle
    }
    return {
      transform: 'translate(' + row.x + '%, ' + row.y + '%) scale(' + row.s + ')',
      transformOrigin: 'center center',
    }
  }
  function mergeLayout(base: any, kind: string): any {
    const extra = layoutStyle(kind)
    const merged: any = { ...(base || {}) }
    if (extra) Object.assign(merged, extra)
    return merged
  }
  /**
   * One gesture handler for every layer: drag moves, Shift-drag scales. Keeping
   * resize on a modifier avoids a grip element on every layer (the frame, the
   * sprite and the nameplate are all different shapes).
   */
  function beginLayoutDrag(kind: string, event: any): void {
    if (!layoutEdit) return
    const host = event && event.currentTarget
    const own = host && host.getBoundingClientRect ? host.getBoundingClientRect() : null
    const frameNode = dialogueBoxRef.current
    const frame = frameNode && frameNode.getBoundingClientRect ? frameNode.getBoundingClientRect() : null
    const origin = frame && frame.width ? frame : own
    if (!origin || !origin.width || !origin.height) return
    if (event.preventDefault) event.preventDefault()
    if (event.stopPropagation) event.stopPropagation()
    const startX = event.clientX
    const startY = event.clientY
    const base = { ...(layoutRef.current[kind] || { x: 0, y: 0, s: 1 }) }
    const resizing = event.shiftKey === true
    const spanX = Math.max(1, own ? own.width : origin.width)
    const move = (moveEvent: any) => {
      if (resizing) {
        const delta = (moveEvent.clientX - startX) / spanX
        const next = Math.max(0.4, Math.min(2.5, Math.round((base.s + delta) * 100) / 100))
        setLayout((previous: any) => ({ ...previous, [kind]: { ...base, s: next } }))
        return
      }
      const dx = ((moveEvent.clientX - startX) / origin.width) * 100
      const dy = ((moveEvent.clientY - startY) / origin.height) * 100
      setLayout((previous: any) => ({
        ...previous,
        [kind]: {
          x: Math.round((base.x + dx) * 10) / 10,
          y: Math.round((base.y + dy) * 10) / 10,
          s: base.s,
        },
      }))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      persistLayout(layoutRef.current)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function sideStoryDialogue(scene: any): React.ReactElement {
    const beat = scene.beats[sideStoryBeatIndex(scene)]
    const isNarrator = !beat || beat.speaker === 'narrator'
    const isUser = !!beat && beat.speaker === 'user'
    const member = isNarrator || isUser ? null : scene.cast.find((row: any) => row.id === beat.speaker)
    const plateLabel = isUser ? '主人' : isNarrator ? '旁白' : (member ? member.name : '???')
    const plateColor = isUser ? '#ff9cc8' : isNarrator ? '#8fb4dd' : (member ? member.color : '#8fb4dd')
    const atEnd = sideStoryAtEnd(scene)
    // The server offers choices only at the interlude the master is standing in,
    // so their presence decides what this panel shows.
    const offered = Array.isArray(scene.choices) ? scene.choices : []
    let controls: React.ReactElement
    if (offered.length === 0 && !atEnd) {
      controls = React.createElement('div', { className: 'whg-choices' },
        React.createElement('button', {
          className: 'whg-choice',
          disabled: busy,
          onClick: () => { act('side-story', { op: 'advance' }) },
          type: 'button',
        }, '继续 ▸'))
    } else if (offered.length === 0) {
      controls = React.createElement('div', { className: 'whg-choices' },
        React.createElement('button', {
          className: 'whg-choice',
          disabled: busy,
          onClick: () => { act('side-story', { op: 'close' }) },
          type: 'button',
        }, '回到日常'))
    } else {
      // Deltas stay hidden until the choice is made; the closing beat reveals
      // who warmed up and who did not.
      const speak = () => {
        const spoken = skitText.trim()
        if (!spoken || busy) return
        setSkitText('')
        act('side-story', { op: 'speak', text: spoken })
      }
      controls = React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'whg-choices' },
          offered.map((choice: any, index: number) => React.createElement('button', {
            key: choice.id || index,
            className: 'whg-choice',
            disabled: busy,
            onClick: () => { act('side-story', { op: 'choose', choiceId: choice.id }) },
            type: 'button',
          }, choice.text))),
        // The master may say something of her own instead of picking a line.
        React.createElement('div', { className: 'whg-input-row' },
          React.createElement('input', {
            className: 'whg-input',
            value: skitText,
            placeholder: '或者，你自己开口说……',
            disabled: busy,
            onChange: (event: any) => { setSkitText(event.target.value) },
            onKeyDown: (event: any) => { if (event.key === 'Enter') speak() },
          }),
          React.createElement('button', {
            className: 'whg-send',
            disabled: busy || !skitText.trim(),
            onClick: speak,
            type: 'button',
          }, '说'),
        ),
      )
    }
    const sources = (scene.sources || []).length
      ? React.createElement('div', { className: 'whg-side-sources' },
        scene.sources.map((row: any) => React.createElement('a', {
          key: row.url,
          href: row.url,
          rel: 'noreferrer noopener',
          target: '_blank',
        }, row.title)))
      : null
    return React.createElement('div', { id: 'whg-panel', className: 'whg-dialogue-wrap' },
      React.createElement('div', { className: 'whg-choice-float' }, controls),
      React.createElement('div', {
        className: 'whg-dialogue' + (frameUrl ? ' has-asset-frame' : ' is-css-frame') + (layoutEdit ? ' whg-edit' : ''),
        onClick: revealDialogue,
        ref: dialogueBoxRef,
        onPointerDown: layoutEdit ? (event: any) => beginLayoutDrag('box', event) : undefined,
        style: mergeLayout(
          frameUrl ? { backgroundImage: 'url("' + frameUrl + '")' } : {},
          'box',
        ),
      },
        React.createElement('div', {
          className: 'whg-speaker' + (frameUrl ? ' has-asset-frame' : '') + (layoutEdit ? ' whg-edit' : ''),
          onPointerDown: layoutEdit ? (event: any) => beginLayoutDrag('name', event) : undefined,
          style: mergeLayout(frameUrl ? {} : { borderColor: plateColor }, 'name'),
        },
          React.createElement('span', { className: 'whg-speaker-name', style: { color: plateColor } }, plateLabel),
        ),
        React.createElement('div', {
          className: 'whg-side-seed',
        },
          React.createElement('span', { className: 'whg-side-badge' }, '小剧场 · 工坊传闻'),
          scene.seed && scene.seed.summary ? scene.seed.summary : '今天工坊里有点热闹。'),
        React.createElement('div', {
          className: 'whg-dialogue-text' + (isUser ? ' user' : isNarrator ? ' narrator' : '') + (layoutEdit ? ' whg-edit' : ''),
          onPointerDown: layoutEdit ? (event: any) => beginLayoutDrag('text', event) : undefined,
          style: layoutStyle('text'),
        },
          dialogueSource.slice(0, typedCount),
          typing ? React.createElement('span', { className: 'whg-caret' }, '▍') : null,
        ),
        sources,
      ),
    )
  }

  function dialogue(): React.ReactElement {
    const activeScene = sideStoryScene()
    if (activeScene) return sideStoryDialogue(activeScene)
    const frameUrl = dialogueFrameUrl
    const last = lastLine()
    const plateLabel = last
      ? (last.who === 'heroine' ? s.name : last.who === 'user' ? '主人' : '旁白')
      : s.name
    const plateClass = last ? (last.who === 'heroine' ? '' : ' ' + last.who) : ''
    const plateColor = last
      ? (last.who === 'heroine' ? s.color : last.who === 'user' ? '#ff9cc8' : '#8fb4dd')
      : s.color
    const showChoices = Array.isArray(s.choices) && s.choices.length > 0
    const choices = showChoices
      ? React.createElement('div', {
        className: 'whg-choice-float' + (layoutEdit ? ' whg-edit' : ''),
        onPointerDown: layoutEdit ? (event: any) => beginLayoutDrag('choices', event) : undefined,
        style: layoutStyle('choices'),
      },
        s.choices.map((c: any, i: number) => {
          const choiceText = typeof c === 'string' ? c : c && typeof c.text === 'string' ? c.text : ''
          const choiceId = typeof c === 'object' && c && c.id !== undefined ? String(c.id) : undefined
          const choiceIntent = typeof c === 'object' && c && typeof c.intent === 'string' ? c.intent : ''
          const choiceLabel = typeof c === 'object' && c && typeof c.label === 'string' ? c.label : ''
          return React.createElement('button', {
            key: choiceId || i,
            className: 'whg-choice' + (choiceIntent ? ' whg-choice-' + choiceIntent : ''),
            disabled: busy || !choiceText,
            onClick: () => { act('chat', choiceId ? { choiceId, text: choiceText } : { text: choiceText }) },
            title: choiceLabel || undefined,
            type: 'button',
          },
            choiceLabel ? React.createElement('span', { className: 'whg-choice-tag' }, choiceLabel) : null,
            React.createElement('span', { className: 'whg-choice-text' }, choiceText))
        }))
      : null
    const input = React.createElement('div', { className: 'whg-input-row' },
      React.createElement('input', {
        className: 'whg-input',
        value: text,
        placeholder: '回复 ' + s.name + ' …',
        disabled: busy,
        onChange: (e: any) => { setText(e.target.value) },
        onKeyDown: (e: any) => { if (e.key === 'Enter') send() },
      }),
      React.createElement('button', { className: 'whg-send', disabled: busy || !text.trim(), onClick: send }, '回复'),
      React.createElement('div', { className: 'whg-dialogue-tools' },
        React.createElement('button', {
          className: 'whg-tool',
          disabled: stageCgBusy,
          onClick: generateStageCg,
          title: '按当前角色与场景生成一张 CG',
          type: 'button',
        }, stageCgBusy ? '…' : '画一张'),
        React.createElement('button', {
          className: 'whg-tool',
          onClick: (event: any) => openArchive('history', event.currentTarget),
          title: '对话历史',
          type: 'button',
        }, '历史'),
        React.createElement('button', {
          className: 'whg-tool',
          onClick: (event: any) => openArchive('gallery', event.currentTarget),
          title: 'CG 图鉴',
          type: 'button',
        }, 'CG'),
        React.createElement('button', {
          className: 'whg-tool',
          onClick: (event: any) => openArchive('profile', event.currentTarget),
          title: '角色设定',
          type: 'button',
        }, '设定'),
        React.createElement('button', {
          className: 'whg-tool',
          onClick: openGal,
          title: '进入 GALGAME 剧情模式',
          type: 'button',
        }, '剧情'),
        React.createElement('button', {
          className: 'whg-tool' + (layoutEdit ? ' is-on' : ''),
          onClick: () => setLayoutEdit((previous) => !previous),
          title: layoutEdit ? '结束布局编辑（改动已自动保存）' : '布局编辑：拖动名牌 / 台词 / 好感度条调整位置',
          type: 'button',
        }, layoutEdit ? '完成' : '布局'),
        layoutEdit
          ? React.createElement('button', {
            className: 'whg-tool',
            onClick: resetLayout,
            title: '把名牌、台词、好感度条恢复到默认位置',
            type: 'button',
          }, '复位')
          : null,
        React.createElement('button', {
          className: 'whg-tool' + (dialogueSkin !== 'follow' ? ' is-on' : ''),
          onClick: cycleDialogueSkin,
          title: '对话框皮肤：' + (dialogueSkin === 'follow'
            ? '跟随角色（当前 ' + (DIALOGUE_SKINS.find((row) => row.id === followedSkin) || DIALOGUE_SKINS[0]).label + '）'
            : (DIALOGUE_SKINS.find((row) => row.id === dialogueSkin) || DIALOGUE_SKINS[0]).label),
          type: 'button',
        }, '皮肤'),
      ))
    const fallbackNote = s.fallbackUsed
      ? React.createElement('div', { className: 'whg-fallback-note' }, '（模型调用失败，' + s.name + ' 用了备用台词。原因：' + (s.fallbackReason || '未知') + ' · 目标模型：' + (s.lastModel || s.modelLabel || '未知') + '）')
      : null
    const spoken = last
      ? String(last.text || '')
      : '（点击输入框，开始和' + s.name + '对话吧）'
    const spokenClass = last ? (last.who === 'narrator' ? ' narrator' : last.who === 'user' ? ' user' : '') : ' narrator'
    const affectionRatio = Math.min(100, Math.round((s.affection / Math.max(1, s.cap)) * 100))
    return React.createElement('div', { id: 'whg-panel', className: 'whg-dialogue-wrap' + (layoutEdit ? ' whg-edit' : '') },
      layoutEdit
        ? React.createElement('div', { className: 'whg-edit-band' },
          React.createElement('span', null, '编辑模式：'),
          React.createElement('b', null, '拖动'),
          React.createElement('span', null, '移动'),
          React.createElement('b', null, 'Shift+拖动'),
          React.createElement('span', null, '缩放'),
          React.createElement('span', { style: { opacity: .55 } }, '· 立绘/边框/名牌/台词/好感度/选项'))
        : null,
      choices,
      React.createElement('div', {
        className: 'whg-dialogue' + (frameUrl ? ' has-asset-frame' : ' is-css-frame') + (layoutEdit ? ' whg-edit' : ''),
        onClick: revealDialogue,
        ref: dialogueBoxRef,
        onPointerDown: layoutEdit ? (event: any) => beginLayoutDrag('box', event) : undefined,
        style: mergeLayout(
          frameUrl ? { backgroundImage: 'url("' + frameUrl + '")' } : {},
          'box',
        ),
      },
        React.createElement('div', {
          className: 'whg-speaker' + (frameUrl ? ' has-asset-frame' : '') + (layoutEdit ? ' whg-edit' : ''),
          onPointerDown: layoutEdit ? (event: any) => beginLayoutDrag('name', event) : undefined,
          style: mergeLayout(frameUrl ? {} : { borderColor: plateColor }, 'name'),
        },
          React.createElement('span', { className: 'whg-speaker-name', style: { color: plateColor } }, plateLabel),
        ),
        React.createElement('div', {
          className: 'whg-dialogue-text' + spokenClass + (layoutEdit ? ' whg-edit' : ''),
          onPointerDown: layoutEdit ? (event: any) => beginLayoutDrag('text', event) : undefined,
          style: layoutStyle('text'),
        },
          (last ? dialogueSource.slice(0, typedCount) : spoken),
          last && typing ? React.createElement('span', { className: 'whg-caret' }, '▍') : null,
        ),
        fallbackNote,
        input,
        React.createElement('div', {
          className: 'whg-dialogue-meta' + (layoutEdit ? ' whg-edit' : ''),
          onPointerDown: layoutEdit ? (event: any) => beginLayoutDrag('hud', event) : undefined,
          style: mergeLayout(null, 'hud'),
        },
          React.createElement('span', null, 'Lv.' + s.level),
          React.createElement('div', { className: 'whg-dialogue-track' },
            React.createElement('div', { className: 'whg-dialogue-fill', style: { width: affectionRatio + '%' } })),
          React.createElement('span', null, s.affection + '/' + s.cap),
        ),
      ),
    )
  }

  function cgModal(): React.ReactElement | null {
    if (!settled || !s || !s.cg) return null
    if (s.cg.status === 'generating') {
      return React.createElement('div', { className: 'whg-toast' }, '🎨 正在绘制 Lv 纪念 CG……（约半分钟）')
    }
    if (s.cg.status === 'failed' && !s.cg.seen) {
      return React.createElement('div', { className: 'whg-toast', onClick: () => { act('cg-ack') } },
        '⚠️ CG 生成失败：' + (s.cg.error || '未知错误') + '（点击关闭）')
    }
    if (s.cg.status === 'ready' && !s.cg.seen) {
      const detailReady = rewardCgDetail
        && String(rewardCgDetail.id || '') === rewardCgId
        && typeof rewardCgDetail.dataUrl === 'string'
        && rewardCgDetail.dataUrl
      if (!detailReady) {
        return React.createElement('div', { 'aria-modal': 'true', className: 'whg-cg-backdrop', role: 'dialog' },
          React.createElement('div', { className: 'whg-cg-title' }, '🎁 升级啦 · ' + (s.cg.name || s.name) + '送给你的特殊CG'),
          rewardCgError
            ? React.createElement('div', { className: 'whg-archive-error', role: 'alert' }, '特殊 CG 读取失败：' + rewardCgError)
            : React.createElement('div', { className: 'whg-cg-title', role: 'status' }, rewardCgLoading ? '正在取出这份深海礼物……' : '正在准备这份深海礼物……'),
          rewardCgError
            ? React.createElement('div', { className: 'whg-cg-btns' },
              React.createElement('button', {
                className: 'whg-cg-btn',
                disabled: rewardCgLoading,
                onClick: () => loadRewardCg(rewardCgId),
                type: 'button',
              }, rewardCgLoading ? '重新读取中…' : '重新读取'),
              React.createElement('button', {
                className: 'whg-cg-btn alt',
                disabled: busy,
                onClick: acknowledgeRewardCg,
                type: 'button',
              }, '暂时收下并关闭'),
            )
            : null,
        )
      }
      return React.createElement('div', { 'aria-modal': 'true', className: 'whg-cg-backdrop', role: 'dialog' },
        React.createElement('div', { className: 'whg-cg-title' }, '🎁 升级啦 · ' + (s.cg.name || s.name) + '送给你的特殊CG'),
        React.createElement('img', { className: 'whg-cg-img', src: rewardCgDetail.dataUrl, alt: (s.cg.name || s.name) + '送给你的特殊CG' }),
        React.createElement('div', { className: 'whg-cg-btns' },
          s.cg.savedAsBg
            ? React.createElement('button', {
              className: 'whg-cg-btn alt',
              onClick: () => {
                bgCache.current = null
                act('cg-clear-bg')
              },
              type: 'button',
            }, '恢复默认背景')
            : React.createElement('button', {
              className: 'whg-cg-btn',
              disabled: busy,
              onClick: saveRewardCgBackground,
              type: 'button',
            }, '保存为galgame界面背景'),
          React.createElement('button', {
            className: 'whg-cg-btn alt',
            disabled: busy,
            onClick: acknowledgeRewardCg,
            type: 'button',
          }, '收下并关闭'),
        ),
      )
    }
    return null
  }

  const isTab = props.variant === 'tab'

  if (isTab) {
    if (s === null) {
      return React.createElement('div', { id: 'whg-tab-root', className: 'whg-root-tab' },
        React.createElement('div', { className: 'whg-bg whg-bg-fallback' }),
        React.createElement('div', { className: 'whg-toast' }, apiError ? '⚠️ ' + apiError : '连接 galgame 服务中…'),
      )
    }
    if (s.enabled === false) {
      return React.createElement('div', { id: 'whg-tab-root', className: 'whg-root-tab' },
        React.createElement('div', { className: 'whg-disabled' },
          React.createElement('div', { className: 'whg-disabled-card' },
            React.createElement('h2', null, '鲸鱼娘 Galgame 已关闭'),
            React.createElement('p', null, '在左侧“设置 → 插件 → 鲸鱼娘”中展开鲸鱼娘 Galgame，即可重新开启。'),
          ),
        ),
      )
    }
    if(galOpen)return React.createElement('div',{id:'whg-tab-root',className:'whg-root-tab'},galOverlay(),sceneEditorPanel())
    const bgSrc = s.bg === 'cg' || s.bg === 'custom' ? bgCache.current : art(s.bg)
    const bgEl = bgSrc
      ? React.createElement('img', { className: 'whg-bg', src: bgSrc, alt: '', draggable: false })
      : React.createElement('div', { className: 'whg-bg whg-bg-fallback' })
    return React.createElement('div', { id: 'whg-tab-root', className: 'whg-root-tab' },
      bgEl,
      React.createElement('div', { className: 'whg-vignette' }),
      topbar(false),
      (scenePreview || s?.sceneLayout) && !sideStoryScene() ? customScene(false) : React.createElement(React.Fragment,null,stage(),dialogue()),
      archiveDrawer(),
      cgModal(),
      sideStoryToast(),
      galOverlay(),
      sceneEditorPanel(),
    )
  }

  if (!open) {
    const petEnabled = !!s && s.enabled !== false && s.petEnabled !== false
    return React.createElement(React.Fragment, null,
      petEnabled
        ? React.createElement(Pet, {
          useSessions: props.useSessions,
          onOpen: () => {
            if (s !== null && !activateGalgameTab()) setOpen(true)
          },
        })
        : null,
      s === null
        ? React.createElement('div', { className: 'whg-toast' }, apiError ? '⚠️ ' + apiError : '连接 galgame 服务中…')
        : (apiError ? React.createElement('div', { className: 'whg-toast' }, '⚠️ ' + apiError) : null),
    )
  }
  if (s.enabled === false) return React.createElement(React.Fragment, null)
  const bgSrc = s.bg === 'cg' || s.bg === 'custom' ? bgCache.current : art(s.bg)
  const bgEl = bgSrc
    ? React.createElement('img', { className: 'whg-bg', src: bgSrc, alt: '', draggable: false })
    : React.createElement('div', { className: 'whg-bg whg-bg-fallback' })
  return React.createElement('div', { className: 'whg-root' },
    bgEl,
    React.createElement('div', { className: 'whg-vignette' }),
    topbar(true),
    (scenePreview || s?.sceneLayout) && !sideStoryScene() ? customScene(false) : React.createElement(React.Fragment,null,stage(),dialogue()),
    archiveDrawer(),
    cgModal(),
    sideStoryToast(),
    galOverlay(),
    sceneEditorPanel(),
  )
}

export const name = 'whale-galgame'
export const inject = ['slots']

export function apply(ctx: any): void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-whale-galgame'
  style.textContent = CSS
  document.head.appendChild(style)

  const slots = ctx.slots || ctx.get('slots')
  if (slots === undefined || typeof slots.inject !== 'function') {
    const hostRoot = document.createElement('div')
    document.body.appendChild(hostRoot)
    const root = createRoot(hostRoot)
    root.render(React.createElement(App, { useSessions: null }))
    ctx.effect(() => () => {
      root.unmount()
      hostRoot.remove()
      style.remove()
    }, 'dsh-whale-galgame: direct-mount overlay')
    return
  }
  slots.inject('shell.overlay', () => {
    return slots.register(
      { name: 'shell.overlay', id: 'whale-galgame', order: 900 },
      (slotProps: any) => {
        return React.createElement(App, { useSessions: slotProps && slotProps.useSessions })
      },
    )
  })

  // galgame as a first-class conversation view tab (对话 / 轨迹 / galgame)
  slots.inject('conversation.view', () => slots.register(
    { name: 'conversation.view', id: 'galgame', order: 100, label: 'galgame' },
    (slotProps: any) => React.createElement(App, {
      useSessions: slotProps && slotProps.useSessions,
      sessionId: slotProps && slotProps.sessionId,
      variant: 'tab',
      // The loopback runtime hosts this same view as the whole page and marks
      // itself in the props; DSH's slot props never carry it.
      standalone: slotProps && slotProps.standalone === true ? true : undefined,
    }),
  ))

  // The plugin owns its settings through /whale-galgame-api rather than a
  // DSH settings namespace, so expose it as a feature-owned Plugins tab.
  slots.inject('settings.plugins.tab', () => slots.register(
    { name: 'settings.plugins.tab', id: 'whale-galgame', order: 20, label: '鲸鱼娘' },
    () => React.createElement('ul', { className: 'whg-settings-tab-list' },
      React.createElement(PluginSettingsCard),
    ),
  ))

  ctx.effect(() => () => {
    style.remove()
  }, 'dsh-whale-galgame: pet + galgame overlay')
  ctx.effect(() => () => {
    delete document.body.dataset.whaleGalgameActive
    setComposerHidden(false)
  }, 'dsh-whale-galgame: composer restore')
}
