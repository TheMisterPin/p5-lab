'use client'

import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const extensions = [
  javascript(),
  EditorView.contentAttributes.of({ 'aria-label': 'Sketch JavaScript code' }),
  EditorView.theme({
    '&': { backgroundColor: 'var(--background)', color: 'var(--foreground)', fontSize: '14px' },
    '.cm-scroller': { fontFamily: 'var(--font-geist-mono), monospace', lineHeight: '1.7' },
    '.cm-content': { padding: '16px 0', caretColor: 'var(--primary)' },
    '.cm-gutters': { backgroundColor: 'var(--card)', color: 'var(--muted-foreground)', borderRight: '1px solid var(--border)' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--secondary)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor': { borderLeftColor: 'var(--primary)' },
  }),
  syntaxHighlighting(HighlightStyle.define([
    { tag: [tags.keyword, tags.string], color: 'var(--primary)' },
    { tag: [tags.number, tags.function(tags.variableName)], color: 'var(--ink-blue)' },
    { tag: tags.comment, color: 'var(--muted-foreground)', fontStyle: 'italic' },
    { tag: [tags.variableName, tags.propertyName, tags.operator, tags.punctuation], color: 'var(--foreground)' },
  ])),
]

export default function CodeEditor({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  return <CodeMirror value={value} onChange={onChange} height="520px" extensions={extensions} theme="none" basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }} />
}
