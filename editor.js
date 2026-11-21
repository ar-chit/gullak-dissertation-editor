(() => {
'use strict';
const baseline = JSON.parse(document.getElementById('published-baseline').textContent);
const model = JSON.parse(document.getElementById('export-template').textContent);
const key = 'gullak-pages-edits-' + baseline.version;
function clearOlderEdits() {
  try { for (const oldKey of Object.keys(localStorage)) if (oldKey.startsWith('gullak-pages-edits-') && oldKey !== key) localStorage.removeItem(oldKey); } catch (_) {}
}
clearOlderEdits();
const fields = [...document.querySelectorAll('[contenteditable][data-line-id]')];
const ids = new Set(fields.map(e => e.dataset.lineId));
const publishedText = Object.fromEntries(fields.map(e => [e.dataset.lineId, e.innerText]));
const publishedMarkup = Object.fromEntries(fields.map(e => [e.dataset.lineId, e.innerHTML]));
const status = document.getElementById('save-status'), exportStatus = document.getElementById('export-status');
const emptyState = () => ({version: baseline.version, edits: {}, updatedAt: baseline.updatedAt});
let state = emptyState();
function valid(data) {
  return data && typeof data === 'object' && data.version === baseline.version && Number.isFinite(data.updatedAt) &&
    data.edits && typeof data.edits === 'object' && !Array.isArray(data.edits) &&
    Object.entries(data.edits).every(([id, value]) => ids.has(id) && typeof value === 'string' && value.length <= 100000);
}
function readSaved() {
  try { const data = JSON.parse(localStorage.getItem(key) || 'null'); if (valid(data)) return data; } catch (_) { return state; }
  return emptyState();
}
function apply() {
  for (const field of fields) {
    const id = field.dataset.lineId, value = Object.hasOwn(state.edits, id) ? state.edits[id] : publishedText[id];
    if (field.innerText !== value) {
      if (value === publishedText[id]) field.innerHTML = publishedMarkup[id]; else field.textContent = value;
    }
    field.classList.toggle('edited', value !== publishedText[id]);
  }
}
function showSaved() { status.textContent = 'Saved in this browser · ' + new Date().toLocaleTimeString(); status.style.color = '#176334'; }
function persist() {
  try { localStorage.setItem(key, JSON.stringify(state)); showSaved(); return true; }
  catch (_) { status.textContent = 'Browser saving is unavailable. Export your document or download an edits backup before refreshing.'; status.style.color = '#9b4a00'; return false; }
}
function commitField(field) {
  // Only merge this line, so changes in another tab are not overwritten.
  const latest = readSaved(), id = field.dataset.lineId, value = field.innerText;
  if (value === publishedText[id]) delete latest.edits[id]; else latest.edits[id] = value;
  latest.updatedAt = Math.max(Date.now(), latest.updatedAt + 1); state = latest; persist();
  field.classList.toggle('edited', value !== publishedText[id]);
}
function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], {type}), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
state = readSaved(); apply(); persist();
for (const field of fields) {
  field.contentEditable = 'true';
  field.addEventListener('input', () => commitField(field));
  field.addEventListener('paste', event => {
    event.preventDefault(); const text = event.clipboardData.getData('text/plain');
    if (!document.execCommand('insertText', false, text)) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0); range.deleteContents(); const node = document.createTextNode(text); range.insertNode(node);
        range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
      }
    }
    commitField(field);
  });
}
window.addEventListener('storage', event => {
  if (event.key && event.key.startsWith('gullak-pages-edits-') && event.key !== key) { clearOlderEdits(); return; }
  if (event.key === key) { state = readSaved(); apply(); showSaved(); }
});
window.addEventListener('pageshow', () => { clearOlderEdits(); state = readSaved(); apply(); });
// Every input is already saved. Closing a stale tab must never write its old state.
document.getElementById('save-now').addEventListener('click', () => { state = readSaved(); apply(); persist(); });
document.getElementById('backup').addEventListener('click', () => download('Gullak_V12_Current_Edits_Backup.json', JSON.stringify(state, null, 2), 'application/json'));
function richText(markup) {
  const template = document.createElement('template'); template.innerHTML = markup; const runs = [];
  function walk(node, bold = false, italic = false) {
    if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) runs.push({text: node.textContent, bold, italic}); return; }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (node.nodeName === 'BR') { runs.push({text: '\n', bold, italic}); return; }
    for (const child of node.childNodes) walk(child, bold || ['B', 'STRONG'].includes(node.nodeName), italic || ['I', 'EM'].includes(node.nodeName));
  }
  walk(template.content); return runs;
}
function snapshot() {
  const paragraphs = new Map(); let previous;
  for (const field of fields) {
    const index = Number(field.dataset.paragraphIndex), id = field.dataset.lineId;
    if (!paragraphs.has(index)) paragraphs.set(index, {index, text: '', runs: []});
    const paragraph = paragraphs.get(index), value = field.innerText;
    // Replacements must not silently join words split across original PDF lines.
    if (previous && Number(previous.dataset.paragraphIndex) === index && paragraph.text && value &&
        !/\s$/.test(paragraph.text) && !/^\s/.test(value) && /\s$/.test(publishedText[previous.dataset.lineId])) {
      paragraph.text += ' '; paragraph.runs.push({text: ' ', bold: false, italic: false});
    }
    const runs = value === publishedText[id] ? richText(publishedMarkup[id]) : [{text: value, bold: false, italic: false}];
    paragraph.text += value; paragraph.runs.push(...runs); previous = field;
  }
  return [...paragraphs.values()];
}
document.getElementById('export-text').addEventListener('click', () => download('Ananya_Dhand_Dissertation.txt', snapshot().map(p => p.text).join('\n\n'), 'text/plain;charset=utf-8'));
let exporting = false;
async function exportDocument(format) {
  if (exporting) return; exporting = true;
  for (const id of ['export-word', 'export-pdf']) document.getElementById(id).disabled = true;
  exportStatus.textContent = 'Preparing ' + format.toUpperCase() + ' with your current edits…';
  try {
    const current = snapshot();
    if (format === 'word') download('Ananya_Dhand_Dissertation.docx', GullakExport.createDocx(current, model, fflate), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    else if (GullakExport.isUnchanged(current, model)) download('Ananya_Dhand_Dissertation.pdf', GullakExport.decode(model.pdf), 'application/pdf');
    else {
      const definition = GullakExport.createPdfDefinition(current, model);
      const blob = await new Promise((resolve, reject) => { try { pdfMake.createPdf(definition).getBlob(resolve); } catch (error) { reject(error); } });
      download('Ananya_Dhand_Dissertation.pdf', blob, 'application/pdf');
    }
    exportStatus.textContent = 'Downloaded with the content currently shown in the editor.';
  } catch (error) { exportStatus.textContent = 'Export failed: ' + error.message + '. Your saved edits are still available.'; }
  finally { exporting = false; for (const id of ['export-word', 'export-pdf']) document.getElementById(id).disabled = false; }
}
document.getElementById('export-word').addEventListener('click', () => exportDocument('word'));
document.getElementById('export-pdf').addEventListener('click', () => exportDocument('pdf'));
document.getElementById('import-backup').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 2000000) throw Error('This backup is too large.');
    const incoming = JSON.parse(await file.text());
    if (!valid(incoming)) throw Error('Choose a backup from this fresh V12 release. Older edits cannot be imported.');
    state = {version: baseline.version, edits: {...incoming.edits}, updatedAt: Date.now()}; apply(); persist();
  } catch (error) { status.textContent = 'Import failed: ' + error.message; status.style.color = '#9b4a00'; }
  event.target.value = '';
});
if (typeof window.gullakLock === 'function') {
  const lock = document.createElement('button'); lock.textContent = 'Lock editor'; lock.addEventListener('click', window.gullakLock); document.querySelector('.actions').append(lock);
}
})();
