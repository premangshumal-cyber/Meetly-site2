/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  Bold, 
  Italic, 
  List, 
  CheckSquare, 
  Code, 
  Eye, 
  Edit3 
} from 'lucide-react';

interface SharedNotesWidgetProps {
  onUpdateNotes: (notes: string) => void;
  notes: string;
}

export default function SharedNotesWidget({ onUpdateNotes, notes }: SharedNotesWidgetProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  const addFormatting = (syntax: string) => {
    onUpdateNotes(notes + syntax);
  };

  const renderSimpleMarkdown = (text: string) => {
    if (!text.trim()) return '<p class="text-text-faint italic">No shared notes written yet. Start typing to collaborate...</p>';
    
    // Simple fast safe regex parser to render markdown in vanilla elements safely
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headings
    html = html.replace(/^### (.*?)$/gm, '<h4 class="text-sm font-bold text-white mt-3 mb-1">$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3 class="text-base font-bold text-white mt-4 mb-2">$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2 class="text-lg font-bold text-accent mt-5 mb-2">$1</h2>');

    // Bold / Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/`(.*?)`/g, '<code class="bg-[#181a1f] px-1.5 py-0.5 rounded text-accent font-mono text-[11px] font-semibold">$1</code>');

    // Checkbox lists
    html = html.replace(/^- \[ \] (.*?)$/gm, '<div class="flex items-center gap-2 text-xs my-1"><input type="checkbox" disabled class="rounded text-accent border-border-custom bg-panel" /> <span>$1</span></div>');
    html = html.replace(/^- \[x\] (.*?)$/gm, '<div class="flex items-center gap-2 text-xs my-1"><input type="checkbox" checked disabled class="rounded text-accent border-border-custom bg-panel" /> <span class="line-through opacity-65">$1</span></div>');

    // Bullet lists
    html = html.replace(/^- (.*?)$/gm, '<li class="text-xs text-text-dim list-disc ml-4 my-1">$1</li>');

    // Line breaks
    html = html.replace(/\n/g, '<br/>');

    return html;
  };

  return (
    <div className="flex flex-col h-full bg-[#111317] border border-border-custom rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header bar */}
      <div className="flex items-center justify-between p-3.5 bg-panel border-b border-border-custom shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Collaborative Shared Notes</h3>
            <p className="text-[10px] text-text-faint font-medium">Real-time markdown workspace</p>
          </div>
        </div>

        {/* View selection mode */}
        <div className="flex bg-[#0c0d11] p-0.5 rounded-lg border border-border-custom">
          <button
            onClick={() => setMode('edit')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1 ${mode === 'edit' ? 'bg-[#181a1f] text-accent' : 'text-text-faint hover:text-white'}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1 ${mode === 'preview' ? 'bg-[#181a1f] text-accent' : 'text-text-faint hover:text-white'}`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>

      {/* Formatting Tools Panel */}
      {mode === 'edit' && (
        <div className="flex items-center gap-1 p-2 bg-panel-2 border-b border-border-custom/50 shrink-0">
          <button
            onClick={() => addFormatting(' **bold text**')}
            className="p-1.5 hover:bg-panel-3 rounded text-text-dim hover:text-white cursor-pointer"
            title="Bold text"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => addFormatting(' *italic text*')}
            className="p-1.5 hover:bg-panel-3 rounded text-text-dim hover:text-white cursor-pointer"
            title="Italic text"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-border-custom/50 mx-1" />
          <button
            onClick={() => addFormatting('\n- list item')}
            className="p-1.5 hover:bg-panel-3 rounded text-text-dim hover:text-white cursor-pointer"
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => addFormatting('\n- [ ] task item')}
            className="p-1.5 hover:bg-panel-3 rounded text-text-dim hover:text-white cursor-pointer"
            title="Checklist task"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => addFormatting(' `code snippet`')}
            className="p-1.5 hover:bg-panel-3 rounded text-text-dim hover:text-white cursor-pointer"
            title="Code tag"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main editor box */}
      <div className="flex-1 min-h-[300px] overflow-hidden flex bg-[#111317]">
        {mode === 'edit' ? (
          <textarea
            value={notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            className="flex-1 bg-transparent p-4 font-mono text-xs text-text-dim focus:outline-none resize-none leading-relaxed overflow-y-auto"
            placeholder={`# Lecture/Meeting notes\nWrite collaborative markdown notes together here...\n\n- [ ] Prem to review architectures\n- [x] Elena configured connection metrics`}
          />
        ) : (
          <div 
            className="flex-1 p-4 overflow-y-auto text-xs text-text-dim leading-relaxed select-text select-all"
            dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(notes) }}
          />
        )}
      </div>

    </div>
  );
}
