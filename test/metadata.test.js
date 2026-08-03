'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMetadata, updateMetadata } = require('../dist/metadata');
const { dumpYaml } = require('../dist/yaml-cst');

test('extracts metadata with namespaced keys and ignores CWL structure', () => {
  const source = '$namespaces:\n  s: https://schema.org/\n\'@type\': s:SoftwareApplication\ns:name: Demo\ncwlVersion: v1.2\nclass: CommandLineTool\ninputs: {}\noutputs: {}\n';
  const metadata = parseMetadata(source);
  assert.equal(metadata['s:name'], 'Demo');
  assert.equal(metadata.class, undefined);
});

test('updates metadata while preserving non-metadata CWL bytes', () => {
  const body = 'cwlVersion: v1.2\nclass: CommandLineTool\n# preserve me\nbaseCommand: echo\ninputs:\n  message: string\noutputs: {}\n';
  const source = 's:name: Old\ns:description: old text\n\n' + body;
  const updated = updateMetadata(source, {
    '$namespaces': { s: 'https://schema.org/' },
    '@type': 's:SoftwareApplication',
    's:name': 'New'
  });
  assert.ok(updated.endsWith(body));
  assert.equal(parseMetadata(updated)['s:name'], 'New');
  assert.ok(!updated.includes('old text'));
});

test('removes interleaved metadata using CST ranges without reformatting CWL', () => {
  const source = [
    'cwlVersion: v1.2',
    's:name: Old',
    'class: CommandLineTool',
    'inputs: { message: string } # inline comment',
    's:softwareVersion: 0.1.0',
    'outputs: {}',
    ''
  ].join('\n');
  const updated = updateMetadata(source, { 's:name': 'New' });
  assert.equal(updated, 's:name: New\n\ncwlVersion: v1.2\nclass: CommandLineTool\ninputs: { message: string } # inline comment\noutputs: {}\n');
});

test('quotes keys and values that begin with a YAML reserved character', () => {
  const reserved = ['@', '{', '}', '[', ']', ':', '#', '&', '*', '!', '%', '|', '>', '?', '-', '<', '=', ',', '`'];
  const value = Object.fromEntries(reserved.map((character, index) => [character + 'key', character + 'value-' + index]));
  const output = dumpYaml(value);

  reserved.forEach((character, index) => {
    assert.ok(output.includes(`${JSON.stringify(character + 'key')}: ${JSON.stringify(character + 'value-' + index)}\n`));
  });
});
