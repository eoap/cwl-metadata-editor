'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');
const { parseMetadata, updateMetadata } = require('./metadata');

function isCwl(document) {
  return document && document.uri.scheme === 'file' && document.fileName.toLowerCase().endsWith('.cwl');
}

function nonce() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function patchHtml(original, webview) {
  const token = nonce();
  let html = original
    .replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${token}'; connect-src https://api.ror.org https://pub.orcid.org;">`)
    .replace(/<script>/g, `<script nonce="${token}">`)
    .replace(/<script type="application\/json"/g, `<script nonce="${token}" type="application/json"`)
    .replace(/<a href="\.\.\/[^\"]+">/g, '<a href="#">');

  const bridge = `
      var vscodeApi = acquireVsCodeApi();
      var hostLoaded = false;

      function arrayValue(value) { return value == null ? [] : (Array.isArray(value) ? value : [value]); }
      function scalar(value) { return value == null ? "" : String(value); }
      function unwrapPerson(value, nestedProperty) {
        if (!value || typeof value !== "object") return {};
        if (value["@type"] === "s:Role") {
          var nested = value["s:" + nestedProperty] || {};
          return {
            role: { enabled: true, roleName: value["s:roleName"] || "", startDate: value["s:startDate"] || "", endDate: value["s:endDate"] || "", additionalType: value["s:additionalType"] || "" },
            givenName: nested["s:givenName"] || "", familyName: nested["s:familyName"] || "", email: nested["s:email"] || "", identifier: nested["s:identifier"] || "",
            affiliation: { name: (nested["s:affiliation"] || {})["s:name"] || "", email: (nested["s:affiliation"] || {})["s:email"] || "", identifier: (nested["s:affiliation"] || {})["s:identifier"] || "" }
          };
        }
        return {
          role: { enabled: false }, givenName: value["s:givenName"] || "", familyName: value["s:familyName"] || "", email: value["s:email"] || "", identifier: value["s:identifier"] || "",
          affiliation: { name: (value["s:affiliation"] || {})["s:name"] || "", email: (value["s:affiliation"] || {})["s:email"] || "", identifier: (value["s:affiliation"] || {})["s:identifier"] || "" }
        };
      }
      function loadMetadata(metadata) {
        setValue("name", scalar(metadata["s:name"]));
        setValue("description", scalar(metadata["s:description"]));
        setValue("date-created", scalar(metadata["s:dateCreated"]));
        setValue("identifier", scalar(metadata["s:identifier"]));
        setValue("same-as", arrayValue(metadata["s:sameAs"]).join("\\n"));
        setOperatingSystems(arrayValue(metadata["s:operatingSystem"]));
        setValue("software-requirements", arrayValue(metadata["s:softwareRequirements"]).join("\\n"));
        setValue("software-version", scalar(metadata["s:softwareVersion"]));
        var publisher = metadata["s:publisher"] || {};
        setValue("publisher-name", scalar(publisher["s:name"]));
        setValue("publisher-email", scalar(publisher["s:email"]));
        setValue("publisher-identifier", scalar(publisher["s:identifier"]));

        var licenses = arrayValue(metadata["s:license"]).map(function (item) { return { identifier: item["s:identifier"] || "", name: item["s:name"] || "", url: item["s:url"] || "" }; });
        var helpLinks = arrayValue(metadata["s:softwareHelp"]).map(function (item) { return { name: item["s:name"] || "", url: item["s:url"] || "" }; });
        setRepeater("licenses", licenses);
        setRepeater("help", helpLinks);
        setRepeater("authors", arrayValue(metadata["s:author"]).map(function (item) { return unwrapPerson(item, "author"); }));
        setRepeater("contributors", arrayValue(metadata["s:contributor"]).map(function (item) { return unwrapPerson(item, "contributor"); }));

        var keywordValues = arrayValue(metadata["s:keywords"]);
        var textKeywords = keywordValues.filter(function (item) { return typeof item === "string"; });
        var terms = keywordValues.filter(function (item) { return item && typeof item === "object"; }).map(function (item) { return { name: item["s:name"] || "", description: item["s:description"] || "", termCode: item["s:termCode"] || "", inDefinedTermSet: item["s:inDefinedTermSet"] || "" }; });
        setValue("keywords", textKeywords.join(", "));
        setRepeater("terms", terms);
        hostLoaded = true;
        render();
      }
      window.addEventListener("message", function (event) {
        if (event.data && event.data.type === "loadMetadata") loadMetadata(event.data.metadata || {});
      });
      vscodeApi.postMessage({ type: "ready" });
`;

  html = html.replace('      Object.keys(repeaters).forEach(function (type) {', bridge + '\n      Object.keys(repeaters).forEach(function (type) {');
  html = html.replace('        scheduleYamlOutputHeight();\n      }\n\n      function elementTop', '        scheduleYamlOutputHeight();\n        if (hostLoaded) { vscodeApi.postMessage({ type: "metadataChanged", metadata: metadata }); }\n      }\n\n      function elementTop');
  return html;
}

async function openEditor(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !isCwl(editor.document)) {
    vscode.window.showWarningMessage('Open a local .cwl file before starting the CWL Metadata Editor.');
    return;
  }

  const document = editor.document;
  const panel = vscode.window.createWebviewPanel('cwlMetadataEditor', `CWL Metadata: ${path.basename(document.fileName)}`, vscode.ViewColumn.Beside, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
  });

  const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'metadata-generator.html').fsPath;
  panel.webview.html = patchHtml(fs.readFileSync(htmlPath, 'utf8'), panel.webview);

  let applying = false;
  let timer;
  const sendCurrent = () => {
    try { panel.webview.postMessage({ type: 'loadMetadata', metadata: parseMetadata(document.getText()) }); }
    catch (error) { vscode.window.showErrorMessage(`Cannot parse CWL YAML: ${error.message}`); }
  };

  panel.webview.onDidReceiveMessage((message) => {
    if (message.type === 'ready') return sendCurrent();
    if (message.type !== 'metadataChanged') return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        applying = true;
        const current = document.getText();
        const updated = updateMetadata(current, message.metadata || {});
        if (updated !== current) {
          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(current.length));
          edit.replace(document.uri, fullRange, updated);
          await vscode.workspace.applyEdit(edit);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Unable to update CWL metadata: ${error.message}`);
      } finally { applying = false; }
    }, 250);
  });

  const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (!applying && event.document.uri.toString() === document.uri.toString()) sendCurrent();
  });
  panel.onDidDispose(() => { clearTimeout(timer); changeSubscription.dispose(); });
}

function activate(context) {
  context.subscriptions.push(vscode.commands.registerCommand('cwlMetadataEditor.open', () => openEditor(context)));
}

function deactivate() {}
module.exports = { activate, deactivate, patchHtml };
