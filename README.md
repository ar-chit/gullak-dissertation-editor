# Password-protected dissertation editor

GitHub Pages static site. The document HTML, initial edited text and original review highlights are encrypted with AES-256-GCM. The password is not stored in this repository. PBKDF2-SHA256 with a random salt and 600,000 iterations derives the encryption key; AES-GCM verifies integrity.

Unlocking happens locally in the browser. A derived key is kept in the tab session so a refresh remains unlocked; Lock editor or closing the tab clears that session. New edits save in browser storage and do not sync across devices or update the publication. Export an edits backup before switching devices, and import it after unlocking on the other device. Backups contain readable text, so share them only with intended recipients.

The initial version includes all 27 saved manual edits from 16 November 2026. Historic detector highlighting is not a live assessment. No analytics, external scripts, paid services or backend are used. A noindex directive requests that crawlers skip the page; encryption protects the document content.

Publish the main branch root through GitHub Pages. Use HTTPS or localhost for Web Crypto support.
