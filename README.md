# Password-protected dissertation editor

GitHub Pages static site. The document HTML and initial v12 content are encrypted with AES-256-GCM. The password is not stored in this repository. PBKDF2-SHA256 with a random salt and 600,000 iterations derives the encryption key; AES-GCM verifies integrity.

Unlocking happens locally in the browser. A derived key is kept in the tab session so a refresh remains unlocked; Lock editor or closing the tab clears that session. New edits save in browser storage and do not sync across devices or update the publication. Export an edits backup before switching devices, and import it after unlocking on the other device. Backups contain readable text, so share them only with intended recipients.

The published content is v12, updated 17 November 2026, with 26 PDF pages and 511 editable lines. Every source paragraph is reproduced exactly, including its quotations and references. The initial saved-edit overlay is empty. This release uses a new storage version, discards previous browser edit overlays on load and rejects backups from other versions. New edits to v12 still save across refreshes. Earlier detector highlights and page scores have been removed because they describe older content.

The existing password is unchanged. No analytics, external scripts, paid services or backend are used. A noindex directive requests that crawlers skip the page; encryption protects the document content.

Publish the main branch root through GitHub Pages. Use HTTPS or localhost for Web Crypto support.
