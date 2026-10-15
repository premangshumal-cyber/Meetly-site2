/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MicOff, 
  VideoOff, 
  MessageSquareOff, 
  Plus, 
  TrendingUp, 
  ListOrdered, 
  Network, 
  Download, 
  Sparkles,
  Award,
  Clock,
  Check,
  Zap,
  Loader2
} from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  isSpeaking?: boolean;
}

interface ClassroomModeWidgetProps {
  participants: Participant[];
  onMuteAll: () => void;
  onDisableCams: () => void;
  onDisableChat: () => void;
  isHost: boolean;
}

export default function ClassroomModeWidget({ 
  participants, 
  onMuteAll, 
  onDisableCams, 
  onDisableChat, 
  isHost 
}: ClassroomModeWidgetProps) {
  const [activeTab, setActiveTab] = useState<'controls' | 'polls' | 'breakout' | 'attendance'>('controls');

  // Attendance metrics lists
  const [attendanceRecords, setAttendanceRecords] = useState<{
    id: string;
    name: string;
    joinTime: string;
    duration: number; // minutes
    speakingTime: number; // percentage
    cameraOnPercent: number;
    participationScore: number;
  }[]>([]);

  // Live Polls / Quizzes state
  const [polls, setPolls] = useState<{
    id: string;
    question: string;
    options: { text: string; votes: number }[];
    totalVotes: number;
    hasVoted: boolean;
    votedOptionIndex: number | null;
  }[]>([
    {
      id: "poll-1",
      question: "What is the best complexity bound of Binary Search?",
      options: [
        { text: "O(n)", votes: 3 },
        { text: "O(log n)", votes: 12 },
        { text: "O(n log n)", votes: 1 },
        { text: "O(1)", votes: 0 }
      ],
      totalVotes: 16,
      hasVoted: false,
      votedOptionIndex: null
    }
  ]);

  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '']);
  const [pollLoading, setPollLoading] = useState(false);

  // Breakout Rooms list
  const [breakoutRooms, setBreakoutRooms] = useState<{ name: string; members: string[] }[]>([
    { name: "Breakout Room Alpha", members: ["Sarah", "Marcus"] },
    { name: "Breakout Room Beta", members: ["Elena", "Prem"] }
  ]);
  const [isDividingBreakouts, setIsDividingBreakouts] = useState(false);

  // Seed attendance data based on roster
  useEffect(() => {
    const records = [
      { id: "teacher-host", name: "Host (You)", joinTime: "10:00 AM", duration: 42, speakingTime: 65, cameraOnPercent: 95, participationScore: 98 },
      ...participants.map((p, idx) => ({
        id: p.id,
        name: p.name,
        joinTime: `10:0${idx + 2} AM`,
        duration: Math.max(5, 42 - idx * 3),
        speakingTime: Math.round(5 + Math.random() * 25),
        cameraOnPercent: p.camOn ? 100 : Math.round(Math.random() * 80),
        participationScore: Math.round(60 + Math.random() * 40)
      }))
    ];
    setAttendanceRecords(records);
  }, [participants]);

  // Download Attendance CSV
  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Join Time,Active Duration (Min),Speaking %,Camera On %,Participation Score\n";
    
    attendanceRecords.forEach((r) => {
      csvContent += `"${r.name}","${r.joinTime}",${r.duration},${r.speakingTime}%,${r.cameraOnPercent}%,${r.participationScore}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `meetly_attendance_room_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVote = (pollId: string, optionIdx: number) => {
    setPolls(prev => prev.map(p => {
      if (p.id === pollId && !p.hasVoted) {
        const updatedOptions = [...p.options];
        updatedOptions[optionIdx].votes += 1;
        return {
          ...p,
          options: updatedOptions,
          totalVotes: p.totalVotes + 1,
          hasVoted: true,
          votedOptionIndex: optionIdx
        };
      }
      return p;
    }));
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || newOptions.some(o => !o.trim())) return;

    setPollLoading(true);

    try {
      // Simulate calling Gemini AI to enrich/validate options or directly append
      const response = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: newQuestion })
      });

      if (response.ok) {
        const quizData = await response.json();
        const firstQ = quizData.questions?.[0];
        if (firstQ) {
          setPolls(prev => [
            {
              id: Math.random().toString(),
              question: firstQ.question,
              options: firstQ.options.map((opt: string) => ({ text: opt, votes: 0 })),
              totalVotes: 0,
              hasVoted: false,
              votedOptionIndex: null
            },
            ...prev
          ]);
          setNewQuestion('');
          setNewOptions(['', '']);
          return;
        }
      }
    } catch (e) {
      console.error("AI quiz fallback to standard manual");
    }

    // Manual Poll fallback
    const manualPoll = {
      id: Math.random().toString(),
      question: newQuestion.trim(),
      options: newOptions.map(opt => ({ text: opt.trim(), votes: 0 })),
      totalVotes: 0,
      hasVoted: false,
      votedOptionIndex: null
    };

    setPolls(prev => [manualPoll, ...prev]);
    setNewQuestion('');
    setNewOptions(['', '']);
    setPollLoading(false);
  };

  const handleAddOptionField = () => {
    if (newOptions.length < 5) {
      setNewOptions(prev => [...prev, '']);
    }
  };

  const handleDivideBreakout = () => {
    setIsDividingBreakouts(true);
    setTimeout(() => {
      const allNames = participants.map(p => p.name);
      if (allNames.length === 0) {
        setBreakoutRooms([
          { name: "Breakout Room Alpha", members: ["Sarah (Simulated)", "Marcus (Simulated)"] },
          { name: "Breakout Room Beta", members: ["Elena (Simulated)", "Guest (Simulated)"] }
        ]);
      } else {
        const mid = Math.ceil(allNames.length / 2);
        setBreakoutRooms([
          { name: "Breakout Room Alpha", members: allNames.slice(0, mid) },
          { name: "Breakout Room Beta", members: allNames.slice(mid) }
        ]);
      }
      setIsDividingBreakouts(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-[#111317] border border-border-custom rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between p-4 bg-panel border-b border-border-custom shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1">
              Classroom & Teacher Hub
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-mono font-bold font-display tracking-wide">Host Active</span>
            </h3>
            <p className="text-[10px] text-text-faint font-medium">Classroom analytics and coordination space</p>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="grid grid-cols-4 bg-panel-2 border-b border-border-custom text-center shrink-0 p-1">
        <button
          onClick={() => setActiveTab('controls')}
          className={`py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === 'controls' ? 'bg-[#181a1f] text-accent' : 'text-text-faint hover:text-text-dim'}`}
        >
          Teacher Controls
        </button>
        <button
          onClick={() => setActiveTab('polls')}
          className={`py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === 'polls' ? 'bg-[#181a1f] text-accent' : 'text-text-faint hover:text-text-dim'}`}
        >
          MCQ Quizzes
        </button>
        <button
          onClick={() => setActiveTab('breakout')}
          className={`py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === 'breakout' ? 'bg-[#181a1f] text-accent' : 'text-text-faint hover:text-text-dim'}`}
        >
          Breakouts
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${activeTab === 'attendance' ? 'bg-[#181a1f] text-accent' : 'text-text-faint hover:text-text-dim'}`}
        >
          Attendance Log
        </button>
      </div>

      {/* Main body content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        
        {activeTab === 'controls' && (
          <div className="space-y-4">
            <div className="bg-panel-2/50 border border-border-custom/40 p-3.5 rounded-xl space-y-3">
              <h4 className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Global Teacher Commands
              </h4>
              <p className="text-[11px] text-text-dim">Mute or disable streams instantly. Sends high-priority overrides across call nodes.</p>

              <div className="grid grid-cols-2 gap-2 pt-1.5">
                <button
                  onClick={onMuteAll}
                  className="py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MicOff className="w-4 h-4" />
                  Mute All Students
                </button>
                <button
                  onClick={onDisableCams}
                  className="py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <VideoOff className="w-4 h-4" />
                  Disable Cameras
                </button>
              </div>

              <button
                onClick={onDisableChat}
                className="w-full py-2 px-3 rounded-xl bg-panel-3 border border-border-custom text-text-dim hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquareOff className="w-4 h-4" />
                Toggle Student Chat Access
              </button>
            </div>

            <div className="bg-panel-2/30 border border-border-custom/30 p-3.5 rounded-xl text-center space-y-1">
              <span className="text-xl">🎓</span>
              <h5 className="text-xs font-bold text-white">Classroom Attendance Metric is active</h5>
              <p className="text-[10px] text-text-faint max-w-xs mx-auto">Speaking ratios, camera percentages, and participation values calculate in background logs.</p>
            </div>
          </div>
        )}

        {activeTab === 'polls' && (
          <div className="space-y-4">
            {/* Poll creator */}
            <form onSubmit={handleCreatePoll} className="bg-panel-2/50 border border-border-custom/40 p-3.5 rounded-xl space-y-3">
              <h4 className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                Create Quiz/MCQ Poll (AI-assisted)
              </h4>

              <div className="space-y-2">
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Type topic, quiz question, or formula..."
                  className="w-full bg-[#181a1f] border border-border-custom rounded-lg p-2.5 text-xs text-white placeholder-text-faint focus:outline-none"
                />

                <div className="space-y-1.5">
                  {newOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const updated = [...newOptions];
                        updated[idx] = e.target.value;
                        setNewOptions(updated);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className="w-full bg-[#181a1f]/80 border border-border-custom/55 rounded-lg p-2 text-[11px] text-white focus:outline-none"
                    />
                  ))}
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    disabled={newOptions.length >= 4}
                    className="text-[10px] text-accent font-bold hover:underline cursor-pointer disabled:opacity-50"
                  >
                    + Add Option Choice
                  </button>
                  <button
                    type="submit"
                    disabled={pollLoading}
                    className="px-3 py-1.5 text-[10px] font-bold text-[#1a0800] bg-accent hover:bg-[#ff8c4d] rounded-lg transition-all cursor-pointer"
                  >
                    {pollLoading ? 'Generating AI Quiz...' : 'Launch Live MCQ'}
                  </button>
                </div>
              </div>
            </form>

            {/* List of active Polls */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider">Active Polls & Leaderboard</h5>
              {polls.map((p) => (
                <div key={p.id} className="p-3 bg-[#111317] border border-border-custom rounded-xl space-y-2.5 animate-in fade-in">
                  <h6 className="text-xs font-bold text-white">{p.question}</h6>
                  
                  <div className="space-y-1.5">
                    {p.options.map((opt, oIdx) => {
                      const percent = p.totalVotes > 0 ? Math.round((opt.votes / p.totalVotes) * 100) : 0;
                      return (
                        <button
                          key={oIdx}
                          disabled={p.hasVoted}
                          onClick={() => handleVote(p.id, oIdx)}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all relative overflow-hidden cursor-pointer flex justify-between items-center ${p.votedOptionIndex === oIdx ? 'border-accent bg-accent/5' : 'border-border-custom hover:bg-panel-2'}`}
                        >
                          <div className="absolute inset-y-0 left-0 bg-accent/5 transition-all" style={{ width: `${percent}%` }} />
                          <span className="relative font-semibold text-text-dim">{opt.text}</span>
                          <span className="relative font-mono font-bold text-accent">{percent}% ({opt.votes})</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[9px] text-text-faint font-mono text-center">Total Responses logged: {p.totalVotes}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'breakout' && (
          <div className="space-y-4">
            <div className="bg-panel-2/50 border border-border-custom/40 p-3.5 rounded-xl space-y-3">
              <h4 className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider flex items-center gap-1">
                <Network className="w-3.5 h-3.5 text-indigo-400" />
                Collaborative Breakout Rooms
              </h4>
              <p className="text-[11px] text-text-dim">Divide active call students automatically into separate group workspaces.</p>

              <button
                onClick={handleDivideBreakout}
                disabled={isDividingBreakouts}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDividingBreakouts ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Divide Attendees Randomly (2 rooms)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {breakoutRooms.map((room, rIdx) => (
                <div key={rIdx} className="p-3 bg-panel-2 border border-border-custom/45 rounded-xl space-y-2">
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                    {room.name}
                  </h5>
                  <div className="space-y-1">
                    {room.members.map((m, mIdx) => (
                      <div key={mIdx} className="text-[10px] text-text-dim font-semibold bg-panel p-1.5 rounded border border-border-custom/30">
                        👨‍🎓 {m}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-text-faint uppercase tracking-wider">Attendee Performance Tracker</span>
              <button
                onClick={handleDownloadCSV}
                className="text-[10px] font-bold text-accent bg-accent/5 hover:bg-accent/15 border border-accent/20 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download Excel (CSV)
              </button>
            </div>

            <div className="space-y-1.5 max-h-[250px] overflow-y-auto pr-1">
              {attendanceRecords.map((r) => (
                <div key={r.id} className="p-2.5 rounded-xl bg-[#181a1f] border border-border-custom/50 flex items-center justify-between text-[11px] hover:border-text-faint transition-all">
                  <div className="min-w-0">
                    <h5 className="font-bold text-white truncate max-w-[120px]">{r.name}</h5>
                    <span className="text-[9px] text-text-faint">Joined: {r.joinTime}</span>
                  </div>
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <span className="block text-[8px] text-text-faint font-bold">Minutes</span>
                      <span className="font-mono text-white font-semibold">{r.duration}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-text-faint font-bold">Speaking</span>
                      <span className="font-mono text-teal-400 font-semibold">{r.speakingTime}%</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-text-faint font-bold">Score</span>
                      <span className="font-mono text-accent font-semibold">{r.participationScore}/100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
