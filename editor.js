'use strict';
const baseline=JSON.parse(document.getElementById('published-baseline').textContent);
const key='gullak-pages-edits-'+baseline.version;
// A publication is a fresh baseline. Discard saved overlays from older versions.
try{for(const oldKey of Object.keys(localStorage)){if(oldKey.startsWith('gullak-pages-edits-')&&oldKey!==key)localStorage.removeItem(oldKey);}}catch(error){}
const fields=[...document.querySelectorAll('[contenteditable][data-line-id]')];
const ids=new Set(fields.map(e=>e.dataset.lineId));
const publishedText=Object.fromEntries(fields.map(e=>[e.dataset.lineId,e.innerText]));
const publishedMarkup=Object.fromEntries(fields.map(e=>[e.dataset.lineId,e.innerHTML]));
const status=document.getElementById('save-status');
let state={version:baseline.version,edits:{...baseline.edits},updatedAt:baseline.updatedAt};
function valid(data){return data&&typeof data==='object'&&data.version===baseline.version&&data.edits&&typeof data.edits==='object'&&!Array.isArray(data.edits)&&Object.entries(data.edits).every(([k,v])=>ids.has(k)&&typeof v==='string'&&v.length<100000);}
function apply(){for(const e of fields){const id=e.dataset.lineId;const value=state.edits[id];if(value!==undefined){if(value!==publishedText[id])e.textContent=value;e.classList.add('edited');}else{e.innerHTML=publishedMarkup[id];e.classList.remove('edited');}}}
function save(){try{localStorage.setItem(key,JSON.stringify(state));status.textContent='Saved in this browser · '+new Date().toLocaleTimeString();status.style.color='#176334';}catch(error){status.textContent='Browser saving is unavailable. Download an edits backup before closing or refreshing.';status.style.color='#9b4a00';}}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
try{const stored=JSON.parse(localStorage.getItem(key)||'null');if(valid(stored)&&stored.updatedAt>=baseline.updatedAt)state={version:baseline.version,edits:{...baseline.edits,...stored.edits},updatedAt:stored.updatedAt};}catch(error){}
apply();save();
for(const e of fields){e.addEventListener('input',()=>{const id=e.dataset.lineId,value=e.innerText;if(value===publishedText[id]){if(Object.hasOwn(baseline.edits,id))state.edits[id]=baseline.edits[id];else delete state.edits[id];}else state.edits[id]=value;e.classList.toggle('edited',Object.hasOwn(state.edits,id));state.updatedAt=Math.max(Date.now(),state.updatedAt+1);save();});}
document.getElementById('save-now').addEventListener('click',save);
document.getElementById('backup').addEventListener('click',()=>download('Gullak_Manual_Edits_Backup.json',JSON.stringify(state,null,2),'application/json'));
document.getElementById('export-text').addEventListener('click',()=>{const content=[...document.querySelectorAll('section')].map(section=>{const title=section.querySelector('h2').textContent;const lines=[...section.querySelectorAll('.words')].map(e=>e.innerText);return title+'\n\n'+lines.join('\n');}).join('\n\n');download('Gullak_Edited_Text.txt',content,'text/plain;charset=utf-8');});
document.getElementById('import-backup').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('This backup is too large.');const incoming=JSON.parse(await file.text());if(!valid(incoming))throw Error('Choose a valid backup for this dissertation version.');state={version:baseline.version,edits:{...baseline.edits,...incoming.edits},updatedAt:Math.max(Date.now(),state.updatedAt+1)};apply();save();}catch(error){status.textContent='Import failed: '+error.message;status.style.color='#9b4a00';}event.target.value='';});
window.addEventListener('pagehide',save);

if(typeof window.gullakLock==='function'){const lock=document.createElement('button');lock.textContent='Lock editor';lock.addEventListener('click',window.gullakLock);document.querySelector('.actions').append(lock);}
