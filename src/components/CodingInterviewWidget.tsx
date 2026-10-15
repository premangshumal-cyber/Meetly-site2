/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Code, 
  Terminal, 
  Play, 
  Award, 
  Clock, 
  FileText, 
  User, 
  ShieldAlert, 
  Check, 
  Sparkles,
  Loader2,
  ThumbsUp,
  RotateCcw
} from 'lucide-react';

interface CodingInterviewWidgetProps {
  onUpdateCode: (code: string) => void;
  code: string;
}

export default function CodingInterviewWidget({ onUpdateCode, code }: CodingInterviewWidgetProps) {
  const [language, setLanguage] = useState<'javascript' | 'python' | 'cpp'>('javascript');
  const [terminalLogs, setTerminalLogs] = useState<string>('Terminal initialized. Click Run Code to compile.');
  const [compiling, setCompiling] = useState(false);

  // Scorecard
  const [problemSolving, setProblemSolving] = useState(4);
  const [technicalSkill, setTechnicalSkill] = useState(4);
  const [communication, setCommunication] = useState(5);
  const [interviewerNotes, setInterviewerNotes] = useState('Excellent structure. Candidate explains time-complexity tradeoffs perfectly.');

  // Timer
  const [timeLeft, setTimeLeft] = useState(2700); // 45 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Seed standard boilerplate templates when changing language
  useEffect(() => {
    if (!code) {
      if (language === 'javascript') {
        onUpdateCode(`// Meetly Shared Javascript Editor\nfunction findMeetingConflict(intervals) {\n  console.log("Analyzing schedules...");\n  // Write your code here\n  return true;\n}\n\nfindMeetingConflict([[9, 10], [10, 11]]);`);
      } else if (language === 'python') {
        onUpdateCode(`# Meetly Shared Python 3.10 Editor\ndef find_meeting_conflict(intervals):\n    print("Analyzing schedules...")\n    # Write your code here\n    return True\n\nfind_meeting_conflict([[9, 10], [10, 11]])`);
      } else if (language === 'cpp') {
        onUpdateCode(`// Meetly Shared C++ Compiler\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Meetly real-time C++ online compiler" << endl;\n    return 0;\n}`);
      }
    }
  }, [language]);

  const handleRunCode = async () => {
    setCompiling(true);
    setTerminalLogs('Compiling streams... requesting server resources...');

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });

      if (!response.ok) {
        throw new Error('Server compilation error');
      }

      const data = await response.json();
      if (data.error) {
        setTerminalLogs(`⚠️ Compile Error:\n${data.error}`);
      } else {
        setTerminalLogs(data.output);
      }
    } catch (err: any) {
      setTerminalLogs(`⚠️ Execution failed:\n${err?.message || 'Server connection timed out'}`);
    } finally {
      setCompiling(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-[500px] bg-[#0c0d11] rounded-2xl p-4 overflow-hidden">
      
      {/* Code Editor and Terminal: 8 columns */}
      <div className="lg:col-span-8 flex flex-col space-y-3">
        
        {/* Editor Settings bar */}
        <div className="flex items-center justify-between bg-panel p-3 border border-border-custom rounded-xl shrink-0">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-white">Live Editor Canvas</span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => {
                onUpdateCode('');
                setLanguage(e.target.value as any);
              }}
              className="bg-panel-2 border border-border-custom rounded-lg px-2.5 py-1 text-[11px] font-bold text-accent cursor-pointer"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python 3</option>
              <option value="cpp">C++ 17</option>
            </select>

            <button
              onClick={handleRunCode}
              disabled={compiling}
              className="px-3.5 py-1 text-[11px] font-bold text-[#1a0800] bg-gradient-to-r from-accent to-accent-2 hover:from-[#ff8c4d] rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-accent/10 disabled:opacity-50"
            >
              {compiling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run Code
            </button>
          </div>
        </div>

        {/* Text editor box */}
        <div className="flex-1 min-h-[250px] relative border border-border-custom rounded-xl overflow-hidden shadow-inner flex bg-[#111317]">
          {/* Editor gutter */}
          <div className="bg-panel-2 px-3 py-3 border-r border-border-custom text-right font-mono text-[11px] text-text-faint space-y-1 shrink-0 select-none">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={code}
            onChange={(e) => onUpdateCode(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-transparent p-3 font-mono text-xs text-text-dim focus:outline-none resize-none leading-relaxed overflow-y-auto"
            placeholder="// Collaborators can write codes and formulas directly in this shared compiler editor..."
          />
        </div>

        {/* Console Terminal */}
        <div className="bg-[#0c0d11] border border-border-custom rounded-xl p-3 flex flex-col space-y-1.5 h-32 shrink-0">
          <div className="flex items-center justify-between text-[10px] text-text-faint border-b border-border-custom/40 pb-1">
            <span className="font-bold flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" />
              Terminal Console Logs
            </span>
            <button 
              onClick={() => setTerminalLogs('Terminal logs cleared.')}
              className="hover:text-white flex items-center gap-0.5"
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          </div>
          <pre className="flex-1 overflow-y-auto text-[11px] font-mono text-emerald-400 font-semibold leading-relaxed">
            {terminalLogs}
          </pre>
        </div>
      </div>

      {/* Candidate Profile, Scorecard, Interview Notes: 4 columns */}
      <div className="lg:col-span-4 flex flex-col space-y-3">
        
        {/* Profile Card & countdown timer */}
        <div className="bg-panel border border-border-custom rounded-xl p-3.5 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-accent uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              Candidate Panel
            </span>
            <span className="text-xs font-bold font-mono text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/15 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="flex items-center gap-3 bg-panel-2 p-2.5 rounded-xl border border-border-custom/50">
            <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-xl">
              🧑‍💻
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Elena Smith</h4>
              <p className="text-[10px] text-text-faint">Senior Software Engineer Candidate</p>
            </div>
          </div>
        </div>

        {/* Candidate Resume Summary (Simulated PDF) */}
        <div className="bg-panel border border-border-custom rounded-xl p-3.5 flex-1 min-h-[120px] overflow-y-auto space-y-2.5">
          <h4 className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            Resume Profile
          </h4>
          <div className="space-y-1.5 text-[11px] text-text-dim">
            <p className="font-bold text-white">Experience: 5 Years</p>
            <p>• Lead Javascript developer at tech start-up in Seattle.</p>
            <p>• Specialized in WebRTC multi-user video grids and collaborative whiteboard systems.</p>
            <p>• Bachelor of Computer Science, Washington State.</p>
          </div>
        </div>

        {/* Interview Scorecard */}
        <div className="bg-panel border border-border-custom rounded-xl p-3.5 space-y-3 shrink-0">
          <h4 className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            Interviewer Scorecard
          </h4>

          <div className="space-y-2">
            {/* Rating Item 1 */}
            <div className="flex items-center justify-between text-xs text-text-dim">
              <span>Problem Solving</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button 
                    key={s} 
                    onClick={() => setProblemSolving(s)}
                    className={`text-xs transition-colors cursor-pointer ${problemSolving >= s ? 'text-accent' : 'text-text-faint'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Item 2 */}
            <div className="flex items-center justify-between text-xs text-text-dim">
              <span>Technical Skills</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button 
                    key={s} 
                    onClick={() => setTechnicalSkill(s)}
                    className={`text-xs transition-colors cursor-pointer ${technicalSkill >= s ? 'text-accent' : 'text-text-faint'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Item 3 */}
            <div className="flex items-center justify-between text-xs text-text-dim">
              <span>Communication</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button 
                    key={s} 
                    onClick={() => setCommunication(s)}
                    className={`text-xs transition-colors cursor-pointer ${communication >= s ? 'text-accent' : 'text-text-faint'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={interviewerNotes}
              onChange={(e) => setInterviewerNotes(e.target.value)}
              placeholder="Write reviewer comments here..."
              className="w-full bg-[#181a1f] border border-border-custom rounded-lg p-2 text-[10px] text-text-dim focus:outline-none"
              rows={2}
            />
          </div>
        </div>

      </div>

    </div>
  );
}
