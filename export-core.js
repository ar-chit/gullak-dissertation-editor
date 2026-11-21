(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.GullakExport = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function decode(value) { return Uint8Array.from(atob(value), character => character.charCodeAt(0)); }
  function validate(snapshot, model) {
    const expected = model.paragraphs.filter(p => p.text !== '');
    if (snapshot.length !== expected.length) throw Error('A document paragraph is missing.');
    const actual = new Map();
    for (const p of snapshot) {
      if (actual.has(p.index) || typeof p.text !== 'string' || !Array.isArray(p.runs) || p.runs.map(r => r.text).join('') !== p.text) throw Error('Document text is inconsistent.');
      actual.set(p.index, p);
    }
    for (const p of expected) if (!actual.has(p.index)) throw Error('A document paragraph is missing.');
    return actual;
  }
  function isUnchanged(snapshot, model) {
    const actual = validate(snapshot, model); return model.paragraphs.every(p => p.text === '' || actual.get(p.index).text === p.text);
  }
  const xml = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'}[c]));
  function makeRun(run, properties) {
    let pr = properties || '<w:rPr></w:rPr>';
    pr = pr.replace(/<w:(?:b|i)(?=[\s/>])[^>]*(?:\/>|>[\s\S]*?<\/w:(?:b|i)>)/g, '');
    if (pr.endsWith('/>')) pr = pr.slice(0, -2) + '></w:rPr>';
    pr = pr.replace('</w:rPr>', '<w:b w:val="' + (run.bold ? '1' : '0') + '"/><w:i w:val="' + (run.italic ? '1' : '0') + '"/></w:rPr>');
    const parts = run.text.replace(/\r\n?/g, '\n').split(/(\n|\t)/);
    return '<w:r>' + pr + parts.map(text => text === '\n' ? '<w:br/>' : text === '\t' ? '<w:tab/>' : '<w:t xml:space="preserve">' + xml(text) + '</w:t>').join('') + '</w:r>';
  }
  function createDocx(snapshot, model, zip) {
    const actual = validate(snapshot, model); if (isUnchanged(snapshot, model)) return decode(model.docx);
    const files = zip.unzipSync(decode(model.docx)), original = new TextDecoder().decode(files['word/document.xml']); let index = -1;
    const updated = original.replace(/<w:p(?=[\s>])[^>]*>[\s\S]*?<\/w:p>/g, paragraph => {
      index++; const source = model.paragraphs[index], current = actual.get(index);
      if (!source || !current || current.text === source.text) return paragraph;
      const opening = paragraph.match(/^<w:p(?=[\s>])[^>]*>/)[0];
      const pPr = (paragraph.match(/<w:pPr(?=[\s>])[^>]*(?:\/>|>[\s\S]*?<\/w:pPr>)/) || [''])[0];
      return opening + pPr + current.runs.map(run => makeRun({...run, bold: run.bold || source.bold, italic: run.italic || source.italic}, source.runProperties)).join('') + '</w:p>';
    });
    if (index + 1 !== model.paragraphs.length) throw Error('The Word template does not match this release.');
    files['word/document.xml'] = new TextEncoder().encode(updated);
    if (snapshot.some(p => p.text.includes('\n')) && files['word/settings.xml']) {
      // Word otherwise stretches justified text before a user-added line break.
      let settings = new TextDecoder().decode(files['word/settings.xml']);
      if (/<w:doNotExpandShiftReturn(?=[\s/>])/.test(settings)) settings = settings.replace(/<w:doNotExpandShiftReturn[^>]*\/>/, '<w:doNotExpandShiftReturn/>');
      else if (settings.includes('</w:compat>')) settings = settings.replace('</w:compat>', '<w:doNotExpandShiftReturn/></w:compat>');
      else settings = settings.replace('</w:settings>', '<w:compat><w:doNotExpandShiftReturn/></w:compat></w:settings>');
      files['word/settings.xml'] = new TextEncoder().encode(settings);
    }
    return zip.zipSync(files, {level: 6});
  }
  function createPdfDefinition(snapshot, model) {
    const actual = validate(snapshot, model), content = [];
    for (const source of model.paragraphs) {
      if (source.image) { content.push({image: source.image, width: source.imageWidth, alignment: 'center', margin: [0, source.before, 0, source.after]}); continue; }
      if (!actual.has(source.index)) continue;
      const current = actual.get(source.index), node = {
        text: current.runs.length ? current.runs.map(run => ({text: run.text, bold: run.bold || source.bold, italics: run.italic || source.italic})) : ' ',
        fontSize: source.fontSize, alignment: source.alignment, lineHeight: source.lineHeight, leadingIndent: source.firstLine,
        margin: [source.left, source.before, source.right, source.after]
      };
      if (source.mainHeading) { node.pageBreak = 'before'; node.headlineLevel = 1; } else if (source.subHeading) node.headlineLevel = 2;
      content.push(node);
    }
    // Keep each heading with its first paragraph, including consecutive headings.
    const grouped = [];
    for (let i = 0; i < content.length; i++) {
      if (!content[i].headlineLevel) { grouped.push(content[i]); continue; }
      const first = content[i], pageBreak = first.pageBreak, stack = [first];
      delete first.pageBreak;
      while (i + 1 < content.length && content[i + 1].headlineLevel && !content[i + 1].pageBreak) stack.push(content[++i]);
      if (i + 1 < content.length && !content[i + 1].pageBreak) {
        const next = content[i + 1], text = next.text.map(run => run.text).join('');
        if (text.length <= 1800) stack.push(content[++i]);
        else {
          // Long additions must remain able to span pages. Keep just the opening
          // lines with the heading, then allow the rest of the paragraph to flow.
          const cut = text.indexOf(' ', 180) + 1 || 180;
          const left = [], right = []; let offset = 0;
          for (const run of next.text) {
            const boundary = Math.max(0, Math.min(run.text.length, cut - offset));
            if (boundary) left.push({...run, text: run.text.slice(0, boundary)});
            if (boundary < run.text.length) right.push({...run, text: run.text.slice(boundary)});
            offset += run.text.length;
          }
          stack.push({...next, text: left, margin: [next.margin[0], next.margin[1], next.margin[2], 0]});
          content[i + 1] = {...next, text: right, leadingIndent: 0, margin: [next.margin[0], 0, next.margin[2], next.margin[3]]};
        }
      }
      const group = {stack, unbreakable: true}; if (pageBreak) group.pageBreak = pageBreak;
      grouped.push(group);
    }
    return {
      info: {title: 'Ananya Dhand Dissertation', subject: 'Current edited dissertation'},
      pageSize: {width: model.page.width, height: model.page.height}, pageMargins: model.page.margins,
      defaultStyle: {font: 'DissertationSerif', fontSize: 12, color: '#000000'},
      header: page => page === 1 ? null : {text: 'Dhand ' + page, alignment: 'right', fontSize: 12, margin: [72, 32, 72, 0]},
      content: grouped
    };
  }
  return {decode, validate, isUnchanged, createDocx, createPdfDefinition};
});
