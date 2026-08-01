# CWL Metadata Editor

A VS Code extension for editing Schema.org metadata in the currently open `*.cwl` document.

## Behavior

- Opens a form bound to the active CWL file.
- Reads existing supported metadata and pre-fills the form.
- Updates metadata in the active document while typing.
- Preserves all non-metadata CWL text, comments, ordering, and formatting.
- Uses VS Code theme variables rather than a standalone application theme.
- Is implemented in TypeScript.
- Includes a bundled, source-preserving YAML CST layer specialized for top-level CWL metadata sections.

## Install

```bash
code --install-extension cwl-metadata-editor.vsix
```

Open a local `.cwl` document and run **CWL: Edit Metadata**.

## Development

```bash
npm run compile
npm test
npm run package
```

The extension sources are under `src/`; the document-bound form is in `media/editor.html`.

## Documentation

The documentation follows the [Diátaxis](https://diataxis.fr/) approach and is organized into tutorials, how-to guides, reference, and explanation.

```bash
python3 -m pip install -r requirements-docs.txt
mkdocs serve
```
