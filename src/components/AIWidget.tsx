/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Sparkles, 
  MessageSquare, 
  ListTodo, 
  FileText, 
  Clock, 
  HelpCircle, 
  CheckSquare, 
  Bookmark, 
  Send,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface AIWidgetProps {
  transcriptLines: { sender: string; text: string; time: string }[];
  bookmarks: { time: string; text: string }[];
  onAddBookmark: (text: string) => void;
  roomCode: string;
}

export default function AIWidget({ transcriptLines, bookmarks, onAddBookmark, roomCode }: AIWidgetProps) {
  const [activeTab, setActiveTab] = useState<'assistant' | 'chat' | 'bookmarks'>('assistant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Meeting Data from server
  const [aiData, setAiData] = useState<{
    summary: string;
    actionItems: string[];
    keyDecisions: string[];
    questions: string[];
    tasks: string[];
    timeline: { timestamp: string; title: string; description: string }[];
  } | null>(null);

  // Chat copilot states
  const [chatInp, setChatInp] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([
    { sender: 'ai', text: 'Hello! I am your Meetly Copilot. Ask me anything about this meeting\'s transcription or slides.', time: '00:01' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Slide/Moment Bookmark state
  const [bookmarkInp, setBookmarkInp] = useState('');

  // Fetch or trigger live AI summarization and note generation
  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptLines })
      });

      if (!response.ok) {
        throw new Error('Server error generating AI notes');
      }

      const data = await response.json();
      setAiData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to call AI model');
    } finally {
      setLoading(false);
    }
  };

  // Run initial call when component loads or when transcript lines grow
  useEffect(() => {
    if (transcriptLines.length > 0 && !aiData) {
      handleGenerateSummary();
    }
  }, [transcriptLines.length]);

  const handleSendChat = async () => {
    if (!chatInp.trim() || chatLoading) return;
    
    const userMsg = chatInp.trim();
    setChatInp('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg, time: timeStr }]);
    setChatLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptLines, message: userMsg })
      });

      if (!response.ok) {
        throw new Error('AI Chat response failed');
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, { sender: 'ai', text: data.answer, time: timeStr }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'I encountered an error trying to connect to Gemini. Please try again.', time: timeStr }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddBookmarkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookmarkInp.trim()) return;
    onAddBookmark(bookmarkInp.trim());
    setBookmarkInp('');
  };

  return (
    <div className="flex flex-col h-full bg-[#111317] border border-border-custom rounded-2xl overflow-hidden shadow-2xl">
      {/* Widget Header bar */}
      <div className="flex items-center justify-between p-4 bg-panel border-b border-border-custom shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Brain className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1">
              AI Co-pilot Space
              <Sparkles className="w-3 h-3 text-accent" />
            </h3>
            <p className="text-[10px] text-text-faint font-medium">Gemini 3.5 Live Assistant</p>
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateSummary}
          disabled={loading}
          className="px-2.5 py-1 text-[10px] font-bold text-accent bg-accent/5 hover:bg-accent/15 border border-accent/20 rounded-md transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          Refresh AI Analysis
        </button>
      </div>

      {/* Selector Tabs */}
      <div className="grid grid-cols-3 bg-panel-2 border-b border-border-custom text-center shrink-0 p-1">
        <button
          onClick={() => setActiveTab('assistant')}
          className={`py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'assistant' ? 'bg-[#181a1f] text-accent border border-accent/10' : 'text-text-faint hover:text-text-dim'}`}
        >
          <FileText className="w-3.5 h-3.5" />
          Live Notes
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'chat' ? 'bg-[#181a1f] text-accent border border-accent/10' : 'text-text-faint hover:text-text-dim'}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Ask AI Chat
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${activeTab === 'bookmarks' ? 'bg-[#181a1f] text-accent border border-accent/10' : 'text-text-faint hover:text-text-dim'}`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          Bookmarked
        </button>
      </div>

      {/* Interactive Main Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {activeTab === 'assistant' && (
          <div className="space-y-5">
            {loading && !aiData && (
              <div className="flex flex-col items-center justify-center py-12 text-center text-text-dim gap-3">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <div>
                  <h4 className="text-xs font-bold text-white">Transcribing & Organizing...</h4>
                  <p className="text-[10px] text-text-faint">Gemini is processing active conversation streams</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex gap-2.5">
                <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                <div>
                  <h5 className="font-bold">AI Assistant Sandbox Mode</h5>
                  <p className="text-[11px] opacity-80 mt-0.5">{error}. Simulated offline summaries are generated for presentation check.</p>
                </div>
              </div>
            )}

            {/* Offline Seed fallback or active AI summary data */}
            {(!loading || aiData) && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Live Summary */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    Live Summary
                  </h4>
                  <p className="text-xs text-text-dim leading-relaxed bg-panel-2/50 border border-border-custom/40 p-3 rounded-xl">
                    {aiData?.summary || "No summarization compiled yet. As discussions occur on screen, verbal transcripts will populate a comprehensive executive summary."}
                  </p>
                </div>

                {/* Key Decisions */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                    Key Decisions
                  </h4>
                  <ul className="space-y-1">
                    {(aiData?.keyDecisions || [
                      "Organized visual presentation layers side-by-side with student grid views",
                      "Agreed to build direct Excel spreadsheet logging for automated classroom attendance"
                    ]).map((dec, idx) => (
                      <li key={idx} className="text-xs text-text-dim flex items-start gap-2 bg-panel-2/30 px-3 py-2 rounded-lg border border-border-custom/30">
                        <span className="text-indigo-400 font-extrabold shrink-0">•</span>
                        {dec}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Items */}
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-teal-400" />
                    Action Items
                  </h4>
                  <ul className="space-y-1">
                    {(aiData?.actionItems || [
                      "Create sandbox Python/Node interpreter compilers inside coding modules",
                      "Ensure laser pointers and screen draw features work in whiteboard grids"
                    ]).map((act, idx) => (
                      <li key={idx} className="text-xs text-text-dim flex items-start gap-2 bg-panel-2/30 px-3 py-2 rounded-lg border border-border-custom/30">
                        <input type="checkbox" className="rounded text-teal-500 border-border-custom mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* AI Detected Tasks & Questions */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
                      Detected Questions
                    </h5>
                    <div className="space-y-1.5">
                      {(aiData?.questions || [
                        "Can teachers freeze active whiteboard frames?",
                        "How do students bookmarks chapter highlights?"
                      ]).map((q, idx) => (
                        <div key={idx} className="text-[11px] text-text-dim bg-[#181a1f] p-2 rounded-lg border border-border-custom/40">
                          {q}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5 text-pink-400" />
                      Detected Tasks
                    </h5>
                    <div className="space-y-1.5">
                      {(aiData?.tasks || [
                        "Compile active speech-to-text transcript lists",
                        "Configure classroom attendee active metrics"
                      ]).map((t, idx) => (
                        <div key={idx} className="text-[11px] text-text-dim bg-[#181a1f] p-2 rounded-lg border border-border-custom/40">
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    Meeting Timeline
                  </h4>
                  <div className="relative border-l-2 border-border-custom pl-4 ml-2 space-y-4">
                    {(aiData?.timeline || [
                      { timestamp: "00:01", title: "Welcome & Setup", description: "Host initiated the PeerJS WebRTC room and connected pre-flight grids." },
                      { timestamp: "00:12", title: "Whiteboard Drawing", description: "Teacher began illustrating system architectures on collaborative whiteboards." }
                    ]).map((time, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-panel shadow" />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-accent bg-accent/5 px-1 rounded">{time.timestamp}</span>
                          <h5 className="text-xs font-bold text-white">{time.title}</h5>
                        </div>
                        <p className="text-[11px] text-text-faint mt-0.5">{time.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full space-y-3 min-h-[350px]">
            {/* Scrollable chat body */}
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto max-h-[290px] pr-1">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'items-start'}`}
                >
                  <span className="text-[9px] text-text-faint mb-0.5">{msg.sender === 'user' ? 'You' : 'AI Copilot'} • {msg.time}</span>
                  <div className={`p-2.5 text-xs rounded-xl border ${msg.sender === 'user' ? 'bg-accent/10 border-accent/20 text-white rounded-tr-none' : 'bg-panel border-border-custom text-text-dim rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-text-faint text-[10px] py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                  <span>Gemini co-pilot is brainstorming...</span>
                </div>
              )}
            </div>

            {/* Inp box */}
            <div className="flex gap-1.5 pt-1.5 border-t border-border-custom/50 shrink-0">
              <input
                type="text"
                value={chatInp}
                onChange={(e) => setChatInp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask about conversation or code..."
                className="flex-1 bg-[#181a1f] border border-border-custom rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-faint focus:outline-none focus:border-accent font-semibold"
              />
              <button
                onClick={handleSendChat}
                className="p-2.5 rounded-xl bg-accent text-[#1a0800] hover:bg-[#ff8c4d] transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <div className="space-y-4">
            <form onSubmit={handleAddBookmarkSubmit} className="flex gap-1.5 shrink-0">
              <input
                type="text"
                value={bookmarkInp}
                onChange={(e) => setBookmarkInp(e.target.value)}
                placeholder="Bookmark slide note/concept..."
                className="flex-1 bg-[#181a1f] border border-border-custom rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-text-faint focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all cursor-pointer text-xs font-bold"
              >
                Bookmark
              </button>
            </form>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider">Saved Bookmarks</h5>
                <span className="text-[9px] text-text-faint font-mono">Linked to call timestamps</span>
              </div>

              {bookmarks.length === 0 ? (
                <div className="text-center py-8 text-text-faint text-[11px] bg-panel-2/30 border border-border-custom/30 rounded-xl">
                  📖 No bookmarks saved. Click Bookmark to save notable moments!
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {bookmarks.map((bm, idx) => (
                    <div 
                      key={idx}
                      className="p-2.5 rounded-xl bg-panel border border-border-custom flex items-start gap-2.5 relative group animate-in slide-in-from-bottom-2 duration-150"
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                        <Bookmark className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1 rounded">{bm.time}</span>
                          <span className="text-[9px] text-text-faint font-medium">Lecture Bookmarked</span>
                        </div>
                        <p className="text-xs text-text-dim mt-1 font-semibold leading-relaxed break-words">{bm.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
