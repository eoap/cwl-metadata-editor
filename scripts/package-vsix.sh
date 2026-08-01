#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$ROOT/.vsix-stage"
OUT="$ROOT/terradue.cwl-metadata-editor-0.2.0.vsix"
rm -rf "$STAGE" "$OUT"
mkdir -p "$STAGE/extension"
cp -R "$ROOT/dist" "$ROOT/media" "$ROOT/package.json" "$ROOT/README.md" "$ROOT/LICENSE" "$STAGE/extension/"
cat > "$STAGE/[Content_Types].xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json"/><Default Extension="js" ContentType="application/javascript"/>
  <Default Extension="map" ContentType="application/json"/><Default Extension="html" ContentType="text/html"/>
  <Default Extension="md" ContentType="text/markdown"/><Default Extension="txt" ContentType="text/plain"/>
  <Default Extension="vsixmanifest" ContentType="text/xml"/>
</Types>
XML
cat > "$STAGE/extension.vsixmanifest" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata><Identity Language="en-US" Id="cwl-metadata-editor" Version="0.2.0" Publisher="terradue"/>
    <DisplayName>CWL Metadata Editor</DisplayName><Description xml:space="preserve">Edit Schema.org metadata in the active CWL file through a structured form.</Description>
    <Tags>CWL,Schema.org,metadata,CodeMeta,Earth Observation</Tags><Categories>Other,Programming Languages</Categories><GalleryFlags>Public</GalleryFlags>
    <Properties><Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.100.0"/></Properties></Metadata>
  <Installation><InstallationTarget Id="Microsoft.VisualStudio.Code" Version="[1.100.0,)"/></Installation><Dependencies/>
  <Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true"/></Assets>
</PackageManifest>
XML
(cd "$STAGE" && zip -qr "$OUT" .)
rm -rf "$STAGE"
echo "$OUT"
