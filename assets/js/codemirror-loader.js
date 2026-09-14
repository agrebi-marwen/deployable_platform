// codemirror-loader.js - ES module that pulls CodeMirror 6 from cdn.jsdelivr.net
// and exposes a tiny, CSP-friendly API for the submit page.
//
// The site CSP only allows scripts from 'self' and https://cdn.jsdelivr.net, so
// the editor cannot be built from npm/bundled files. This module is loaded with
// `<script type="module" src="...">` (a script-src 'self' URL) and only imports
// ESM from jsdelivr (+esm bundles).
//
// Exposed globals (used by submit.js via waitForEditor polling):
//   window.cmReady           -> resolved once the editor is usable
//   window.makeCodeEditor(el) -> creates an editor inside <el>, returns its View
//   window.cmSetLanguage(view, langKey)
//   window.cmGetCode(view)    -> current source as a string
//   window.cmSetCode(view, string)

import { basicSetup, EditorView } from 'https://cdn.jsdelivr.net/npm/codemirror@6/+esm';
import { StateEffect } from 'https://cdn.jsdelivr.net/npm/@codemirror/state@6/+esm';
import { keymap } from 'https://cdn.jsdelivr.net/npm/@codemirror/view@6/+esm';
import { indentWithTab } from 'https://cdn.jsdelivr.net/npm/@codemirror/commands@6/+esm';
import { cpp as cppLang, c as cLang } from 'https://cdn.jsdelivr.net/npm/@codemirror/lang-cpp@6/+esm';
import { python as pythonLang } from 'https://cdn.jsdelivr.net/npm/@codemirror/lang-python@6/+esm';
import { java as javaLang } from 'https://cdn.jsdelivr.net/npm/@codemirror/lang-java@6/+esm';
import { oneDark } from 'https://cdn.jsdelivr.net/npm/@codemirror/theme-one-dark@6/+esm';

const LANG_EXT = {
  c: cLang,
  'c++': cppLang,
  python: pythonLang,
  java: javaLang
};

const BASE_EXT = [basicSetup, oneDark, keymap.of([indentWithTab])];

let activeEditor = null;

function makeCodeEditor(container) {
  if (activeEditor) {
    container.appendChild(activeEditor.dom);
    return activeEditor;
  }
  activeEditor = new EditorView({
    parent: container,
    extensions: BASE_EXT
  });
  return activeEditor;
}

function cmSetLanguage(view, langKey) {
  const extFn = LANG_EXT[langKey] || cppLang;
  view.dispatch({
    effects: StateEffect.reconfigure.of([...BASE_EXT, extFn()])
  });
}

function cmGetCode(view) {
  return view ? view.state.doc.toString() : '';
}

function cmSetCode(view, source) {
  if (!view) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source || '' } });
}

window.makeCodeEditor = makeCodeEditor;
window.cmSetLanguage = cmSetLanguage;
window.cmGetCode = cmGetCode;
window.cmSetCode = cmSetCode;
window.cmReady = Promise.resolve();