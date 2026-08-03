'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const manifest = require('../package.json');

test('contributes a scoped shortcut for opening the metadata editor', () => {
  const binding = manifest.contributes.keybindings.find(
    (entry) => entry.command === 'cwlMetadataEditor.open'
  );

  assert.deepEqual(binding, {
    command: 'cwlMetadataEditor.open',
    key: 'ctrl+k shift+m',
    mac: 'cmd+k shift+m',
    when: 'editorTextFocus && resourceScheme == file && resourceExtname == .cwl'
  });
});
