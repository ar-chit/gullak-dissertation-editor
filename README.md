# Password-protected dissertation editor

GitHub Pages static editor with an encrypted V12 baseline matching the DOCX and PDF last sent to Echo. The 26-page baseline contains 123 text paragraphs and 511 editable lines. The original files and all document text remain inside AES-256-GCM encrypted content. The existing password is unchanged; PBKDF2-SHA256 uses a random salt and 600,000 iterations. No password, readable dissertation, analytics or external script service is published.

This release deliberately starts a fresh editing epoch, `v12-reset-20261121-4499b91e87bc`. Each browser discards its older website edit overlays on its next load, before unlocking. Old backups are rejected. New edits save immediately under the fresh version and survive refresh. Same-browser tabs merge line edits and listen for storage changes; a stale tab does not write old state when closing. Edits are browser-local and do not automatically sync between devices. Use the JSON backup/import controls to transfer new edits.

The editor provides Word (.docx), PDF, plain-text and JSON-backup downloads. An unchanged baseline exports the exact original V12 DOCX/PDF bytes. Edited Word exports patch changed paragraphs in the original DOCX package, retaining the remaining content, styles, crest, headers, footers and document parts. Edited PDF exports use the same current paragraph snapshot, with the crest, headings, emphasis and page numbers; text reflows with a bundled Liberation Serif font, so pagination can differ from Word. Added lines are included. Export processing stays in the browser, including when offline after assets have loaded.

Vendored libraries: fflate 0.8.3 (MIT), pdfmake 0.2.20 (MIT), Liberation Fonts (SIL Open Font License). Their licenses are in `vendor/`. Fonts and library code contain no dissertation content. The Content Security Policy prohibits external connections. A noindex directive requests that crawlers skip the page; encryption protects the content.

Publish the main branch root through GitHub Pages. Web Crypto requires HTTPS or localhost. Private preparation and QA files must remain outside this repository.
