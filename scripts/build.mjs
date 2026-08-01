import { build } from 'esbuild';

await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['vscode'],
  sourcemap: true
});

await build({
  entryPoints: ['src/metadata.ts'],
  bundle: true,
  outfile: 'dist/metadata.js',
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: true
});
