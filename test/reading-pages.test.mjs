import test from 'node:test'
import assert from 'node:assert/strict'
import {graphemes,paginateText} from '../src/reading-pages.ts'
test('measured pages preserve every authored character and whole graphemes',()=>{
 const text='夜潮拍着玻璃穹顶。\n「欢迎回来！」她轻声说。👩🏽‍🚀 e\u0301 与家人 👨‍👩‍👧‍👦 都在等你。'.repeat(3)
 const pages=paginateText(text,s=>graphemes(s).length<=18)
 assert.equal(pages.join(''),text)
 assert.ok(pages.length>3)
 for(const page of pages){assert.ok(graphemes(page).length<=18);assert.ok(!/^[，。！？、；：）》」』”’】]/u.test(page))}
 for(const cluster of ['👩🏽‍🚀','e\u0301','👨‍👩‍👧‍👦'])assert.equal(pages.filter(p=>p.includes(cluster)).length,3)
})
test('reading prefers sentence boundaries and cannot stall in a tiny viewport',()=>{
 assert.deepEqual(paginateText('',()=>true),[])
 const text='先读完这一句话。然后再翻下一页，看看海面上有什么。'
 const pages=paginateText(text,s=>s.length<=15)
 assert.equal(pages[0],'先读完这一句话。')
 assert.equal(pages.join(''),text)
 assert.deepEqual(paginateText('👩🏽‍🚀甲乙',()=>false),['👩🏽‍🚀','甲','乙'])
 assert.deepEqual(paginateText(text,()=>true),[text])
})
