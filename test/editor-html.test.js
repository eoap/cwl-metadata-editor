'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const editorHtml = fs.readFileSync(path.join(__dirname, '..', 'media', 'editor.html'), 'utf8');

test('marks URL and email fields with their HTML input types', () => {
  const urlFields = editorHtml.match(/<input[^>]+type="url"[^>]*>/g) || [];
  const emailFields = editorHtml.match(/<input[^>]+type="email"[^>]*>/g) || [];

  assert.equal(urlFields.length, 4);
  assert.equal(emailFields.length, 3);
});

test('does not emit metadata while a formatted field is invalid', () => {
  assert.match(
    editorHtml,
    /var formatsValid = formattedFieldsAreValid\(\);\s+if \(hostLoaded && formatsValid\)/
  );
  assert.match(editorHtml, /field\.checkValidity\(\)/);
  assert.match(editorHtml, /field\.setAttribute\("aria-invalid", "true"\)/);
});
