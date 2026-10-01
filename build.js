// Сборка: node build.js <пароль>  →  dist/app.html (открытый) и dist/index.html (зашифрованный)
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const R=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const cfg=JSON.parse(R('build.json'));          // {available:[...], steps:{1:[..],...}}
const vm=require('vm');const ctx={L:[]};vm.createContext(ctx);
fs.readdirSync(path.join(__dirname,'content')).sort().forEach(f=>vm.runInContext(R('content/'+f),ctx));
vm.runInContext(R('src/algo.js')+';this.ALGO=ALGO;this.PARTS=PARTS;this.PART_ORDER=PART_ORDER;',ctx);
const all=ctx.L, avail=new Set(cfg.available);
const STEP_OF={},NAMES={};Object.entries(cfg.steps).forEach(([s,ids])=>ids.forEach(id=>STEP_OF[id]=+s));
Object.assign(NAMES,cfg.names||{});
const lessons=all.filter(x=>avail.has(x.id));
const PENDING={};Object.keys(cfg.names||{}).filter(id=>!avail.has(id)).forEach(id=>{const p=cfg.parts[id];(PENDING[p]=PENDING[p]||[]).push([cfg.names[id],STEP_OF[id]||'—'])});
const data=`const L=${JSON.stringify(lessons)};const STEP_OF=${JSON.stringify(STEP_OF)};const NAMES=${JSON.stringify(NAMES)};const PENDING=${JSON.stringify(PENDING)};`;
const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Оптометрия по Ринской</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>${R('src/style.css')}</style></head><body>
<header class="top"><div class="top-in"><a class="brand" href="#algo"><span class="brand-mark"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F7C77" stroke-width="1.8"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></span><span>Оптометрия по Ринской<small>учебник-алгоритм подбора коррекции</small></span></a>
<nav class="nav"><a href="#algo" data-tab="algo">Алгоритм</a><a href="#lessons" data-tab="lessons">Уроки</a><a href="#form" data-tab="form">Опросный лист</a></nav></div></header>
<main id="main"></main>
<script>${data}\n${R('src/algo.js')}\n${R('src/svg.js')}\n${R('src/form.js')}\n${R('src/app.js')}</script></body></html>`;
fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'dist/app.html'),html);
const pass=process.argv[2]||process.env.SITE_PASSWORD;
if(pass){
 const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),it=250000;
 const key=crypto.pbkdf2Sync(pass,salt,it,32,'sha256');
 const c=crypto.createCipheriv('aes-256-gcm',key,iv);
 const enc=Buffer.concat([c.update(zlib.gzipSync(Buffer.from(html,'utf8'),{level:9})),c.final(),c.getAuthTag()]);
 const b=x=>x.toString('base64');
 const gate=R('src/gate.html').replace('__SALT__',b(salt)).replace('__IV__',b(iv)).replace('__IT__',it).replace('__DATA__',b(enc).replace(/(.{100})/g,'$1\n'));
 fs.writeFileSync(path.join(__dirname,'dist/index.html'),gate);
 console.log('encrypted',gate.length);
}
console.log('lessons',lessons.length,'html',html.length);
