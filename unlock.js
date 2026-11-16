(()=>{
'use strict';
const encrypted=JSON.parse(document.getElementById('encrypted-document').textContent);
const sessionKey='gullak-unlock-'+encrypted.version;
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const encode=a=>btoa(String.fromCharCode(...a));
const form=document.getElementById('unlock-form');
const status=document.getElementById('unlock-status');
const button=document.getElementById('unlock-button');
async function show(raw){
 const key=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);
 const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(encrypted.iv)},key,bytes(encrypted.ciphertext));
 const content=new TextDecoder().decode(clear);
 try{sessionStorage.setItem(sessionKey,encode(raw));}catch(error){}
 window.gullakLock=()=>{try{sessionStorage.removeItem(sessionKey);}catch(error){}location.reload();};
 document.open();document.write(content);document.close();
}
form.addEventListener('submit',async event=>{
 event.preventDefault();button.disabled=true;status.textContent='Unlocking…';
 try{
  const password=document.getElementById('password').value;
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const raw=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(encrypted.salt),iterations:encrypted.iterations},material,256);
  await show(new Uint8Array(raw));
 }catch(error){status.textContent='Unable to unlock. Check the password and try again.';button.disabled=false;}
});
(async()=>{let cached;try{cached=sessionStorage.getItem(sessionKey);}catch(error){}if(cached){try{await show(bytes(cached));}catch(error){try{sessionStorage.removeItem(sessionKey);}catch(error){}status.textContent='Enter the password to unlock this version.';}}})();

})();
