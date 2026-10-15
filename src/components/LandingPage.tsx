/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Video, 
  Shield, 
  Smile, 
  Plus, 
  Hash, 
  HelpCircle, 
  Globe, 
  ChevronDown, 
  Copy, 
  Check, 
  Users, 
  Lock, 
  Zap,
  Mic,
  VideoOff,
  Tv,
  MessageSquare,
  MoreHorizontal,
  PhoneOff,
  Award
} from 'lucide-react';

interface LandingPageProps {
  onStartMeeting: (name: string, requireApproval: boolean) => void;
  onJoinMeeting: (name: string, code: string) => void;
  initialRoomCode?: string;
}

export default function LandingPage({ onStartMeeting, onJoinMeeting, initialRoomCode = '' }: LandingPageProps) {
  const [name, setName] = useState('Prem');
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [requireApproval, setRequireApproval] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [copied, setCopied] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Mock call buttons states on the visual showcase
  const [mockMic, setMockMic] = useState(true);
  const [mockCam, setMockCam] = useState(true);

  const handleCopyCode = () => {
    navigator.clipboard.writeText('7room-6390');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onStartMeeting(name.trim(), requireApproval);
  };

  const handleJoin = () => {
    if (!name.trim() || !roomCode.trim()) return;
    onJoinMeeting(name.trim(), roomCode.trim());
  };

  return (
    <div className="min-h-screen cosmic-bg relative overflow-x-hidden flex flex-col justify-between selection:bg-accent selection:text-white">
      {/* Glow Orbs in Background */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl glow-orb -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-purple-600/5 rounded-full filter blur-3xl glow-orb -z-10 pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-accent-2 flex items-center justify-center shadow-lg shadow-accent/20 relative">
            <div className="absolute inset-2.5 rounded-[5px] bg-[#0c0d11]" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white leading-none">Meetly</h1>
            <p className="text-[10px] text-text-faint font-medium tracking-wider uppercase mt-1">Simple • Secure • Fast Meetings</p>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-panel border border-border-custom text-xs text-text-dim font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Ready to connect
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowLanguage(!showLanguage)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-panel border border-border-custom hover:border-text-faint text-xs text-text-dim hover:text-white transition-all cursor-pointer font-medium"
            >
              <Globe className="w-3.5 h-3.5" />
              {selectedLanguage}
              <ChevronDown className={`w-3 h-3 transition-transform ${showLanguage ? 'rotate-180' : ''}`} />
            </button>
            {showLanguage && (
              <div className="absolute right-0 mt-1.5 w-32 rounded-lg bg-panel border border-border-custom shadow-xl py-1 z-20 animate-in fade-in duration-100">
                {['English', 'Español', 'Français', 'Deutsch'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setShowLanguage(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-text-dim hover:text-white hover:bg-panel-2 transition-colors"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        
        {/* Left Column: Brand Statement */}
        <div className="lg:col-span-4 flex flex-col justify-center h-full space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-tight">
              Meetly makes <br />
              every <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">meeting</span> <br />
              matter.
            </h2>
            <p className="text-text-dim text-sm leading-relaxed max-w-sm">
              Create a room, share the link, and collaborate instantly. No sign-up, no hassle, just seamless meetings.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">100% Free</h4>
                <p className="text-xs text-text-faint mt-0.5">No hidden charges. Ever.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Instant Meetings</h4>
                <p className="text-xs text-text-faint mt-0.5">Start in seconds, not minutes.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Secure & Private</h4>
                <p className="text-xs text-text-faint mt-0.5">Your meetings are end-to-end secure.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">No Signup Required</h4>
                <p className="text-xs text-text-faint mt-0.5">Jump in quickly. Stay connected.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Interactive Action Card */}
        <div className="lg:col-span-4">
          <div className="bg-[#111317]/95 border border-border-custom rounded-2xl p-6 lg:p-8 shadow-2xl relative">
            
            {/* Tag Badge */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 rounded-full border border-accent/30 bg-[#16181c] flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold text-accent tracking-widest uppercase font-display">⭐ Free • Peer-to-Peer • No Signup</span>
            </div>

            <div className="text-center space-y-2 mt-2 mb-6">
              <h3 className="text-2xl font-bold font-display text-white tracking-tight">
                Start meeting <br />
                in <span className="text-accent">seconds.</span>
              </h3>
              <p className="text-xs text-text-dim leading-relaxed">
                Create a room and share the link, or join one with a meeting code. Works directly in your browser.
              </p>
            </div>

            {/* Selection Tabs */}
            <div className="grid grid-cols-2 bg-[#0c0d11] p-1 rounded-xl border border-border-custom mb-6">
              <button 
                onClick={() => setActiveTab('create')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'create' ? 'bg-[#181a1f] text-accent border border-accent/20' : 'text-text-faint hover:text-text-dim'}`}
              >
                Create New Meeting
              </button>
              <button 
                onClick={() => setActiveTab('join')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'join' ? 'bg-[#181a1f] text-accent border border-accent/20' : 'text-text-faint hover:text-text-dim'}`}
              >
                Join Meeting
              </button>
            </div>

            {/* Dynamic Card Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-faint uppercase tracking-wider mb-1.5">Your name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-faint">
                    <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">P</span>
                  </div>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Prem" 
                    maxLength={20}
                    className="w-full bg-[#181a1f] border border-border-custom rounded-xl py-3.5 pl-11 pr-4 text-sm text-white placeholder-text-faint focus:outline-none focus:border-accent transition-colors font-semibold"
                  />
                </div>
              </div>

              {activeTab === 'create' ? (
                /* Create View */
                <div className="space-y-4 pt-2">
                  <button 
                    onClick={handleCreate}
                    disabled={!name.trim()}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-accent to-accent-2 hover:from-[#ff8c4d] hover:to-[#ff7043] text-[#1a0800] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                  >
                    <Video className="w-4.5 h-4.5 shrink-0" />
                    New meeting
                    <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                  </button>

                  <div className="flex items-center justify-between py-2 border-t border-border-custom mt-2">
                    <label className="flex items-center gap-2 text-xs text-text-dim cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={requireApproval}
                        onChange={(e) => setRequireApproval(e.target.checked)}
                        className="rounded border-border-custom text-accent focus:ring-accent bg-panel"
                      />
                      Require host approval (waiting room)
                    </label>
                    <HelpCircle className="w-3.5 h-3.5 text-text-faint hover:text-text-dim cursor-help" title="If enabled, guests must be admitted by you to join the call." />
                  </div>
                </div>
              ) : (
                /* Join View */
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-text-faint uppercase tracking-wider mb-1.5">Enter meeting code</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
                        <input 
                          type="text" 
                          value={roomCode}
                          onChange={(e) => setRoomCode(e.target.value)}
                          placeholder="e.g. 7room-6390"
                          className="w-full bg-[#181a1f] border border-border-custom rounded-xl py-3 pl-10 pr-3 text-sm text-white placeholder-text-faint focus:outline-none focus:border-accent transition-colors font-mono"
                        />
                      </div>
                      <button 
                        onClick={handleJoin}
                        disabled={!name.trim() || !roomCode.trim()}
                        className="py-3 px-5 rounded-xl bg-panel-2 border border-border-custom text-white hover:text-accent hover:border-accent font-bold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Separator or */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border-custom/50"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-text-faint uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-border-custom/50"></div>
              </div>

              {/* Fast code preview */}
              <div className="text-center pt-1">
                <div className="inline-flex items-center gap-1.5 text-xs text-text-dim">
                  Share a link like:
                  <code className="px-2 py-1 rounded bg-[#0c0d11] border border-border-custom text-accent font-mono text-[11px] font-semibold flex items-center gap-1.5">
                    7room-6390
                    <button onClick={handleCopyCode} className="text-text-faint hover:text-white transition-colors cursor-pointer">
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </code>
                  with others.
                </div>
              </div>
            </div>

            {/* Prompt Footer */}
            <p className="text-[10px] text-text-faint text-center mt-6">
              Works best in <span className="text-blue-400 font-semibold">Chrome</span>, <span className="text-teal-400 font-semibold">Edge</span> or <span className="text-orange-400 font-semibold">Firefox</span>.
            </p>
          </div>
        </div>

        {/* Right Column: High Fidelity 3D Video Call Grid Showcase */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-6">
          <div className="relative w-full max-w-[340px] aspect-square rounded-2xl bg-panel border border-border-custom/50 shadow-2xl p-4 floating-mockup flex flex-col justify-between" style={{
            transformStyle: 'preserve-3d',
            perspective: '1000px',
            transform: 'perspective(1000px) rotateY(-8deg) rotateX(3deg)'
          }}>
            {/* Ambient Shadow glow */}
            <div className="absolute inset-0 bg-accent/5 rounded-2xl -z-10 blur-xl pointer-events-none" />

            {/* Mock Window Header */}
            <div className="flex items-center justify-between shrink-0 mb-3 pb-1 border-b border-border-custom/30">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#facc15]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
              </div>
              <span className="text-[9px] text-text-faint font-mono">Meetly Video Room — 4 peers</span>
            </div>

            {/* 2x2 Video Call Grid Mockup */}
            <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 mb-3">
              {/* Participant 1 */}
              <div className="relative rounded-lg overflow-hidden bg-[#0c0d11] border border-border-custom/50 flex flex-col justify-end p-2 aspect-[4/3] group shadow-inner">
                {/* Visual Avatar */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center border-2 border-[#16181c] shadow-lg relative">
                    <span className="text-sm font-bold text-white">👨‍💼</span>
                    <span className="absolute -bottom-1 -right-1 text-xs">👋</span>
                  </div>
                </div>
                <span className="text-[9px] text-white bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-[2px] z-10 font-medium max-w-[85%] truncate">
                  Prem (Waving)
                </span>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>

              {/* Participant 2 */}
              <div className="relative rounded-lg overflow-hidden bg-[#0c0d11] border border-border-custom/50 flex flex-col justify-end p-2 aspect-[4/3] group shadow-inner">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center border-2 border-[#16181c] shadow-lg">
                    <span className="text-sm font-bold text-white">👩‍💻</span>
                  </div>
                </div>
                <span className="text-[9px] text-white bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-[2px] z-10 font-medium max-w-[85%] truncate">
                  Elena
                </span>
              </div>

              {/* Participant 3 */}
              <div className="relative rounded-lg overflow-hidden bg-[#0c0d11] border border-border-custom/50 flex flex-col justify-end p-2 aspect-[4/3] group shadow-inner">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-teal-500 flex items-center justify-center border-2 border-[#16181c] shadow-lg">
                    <span className="text-sm font-bold text-white">👩‍🎤</span>
                  </div>
                </div>
                <span className="text-[9px] text-white bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-[2px] z-10 font-medium max-w-[85%] truncate">
                  Sarah
                </span>
              </div>

              {/* Participant 4 */}
              <div className="relative rounded-lg overflow-hidden bg-[#0c0d11] border border-border-custom/50 flex flex-col justify-end p-2 aspect-[4/3] group shadow-inner">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center border-2 border-[#16181c] shadow-lg">
                    <span className="text-sm font-bold text-white">🧔</span>
                  </div>
                </div>
                <span className="text-[9px] text-white bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-[2px] z-10 font-medium max-w-[85%] truncate">
                  Marcus
                </span>
              </div>
            </div>

            {/* Mock Call Controls */}
            <div className="flex items-center justify-center gap-1.5 bg-[#0c0d11] py-1.5 px-3 rounded-xl border border-border-custom/60 shrink-0">
              <button 
                onClick={() => setMockMic(!mockMic)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${mockMic ? 'bg-panel hover:bg-panel-2 text-white' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setMockCam(!mockCam)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${mockCam ? 'bg-panel hover:bg-panel-2 text-white' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}
              >
                {mockCam ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              </button>
              <button className="p-1.5 rounded-lg bg-panel hover:bg-[#181a1f] text-white cursor-pointer hover:text-accent">
                <Tv className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg bg-panel hover:bg-[#181a1f] text-white cursor-pointer hover:text-accent">
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <button className="p-1.5 rounded-lg bg-panel hover:bg-[#181a1f] text-white cursor-pointer hover:text-accent">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-border-custom mx-0.5" />
              <button className="p-1.5 rounded-lg bg-red-500 text-white cursor-pointer hover:bg-red-600">
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Privacy Protection Callout */}
          <div className="w-full max-w-[340px] bg-panel-2/40 border border-border-custom/50 rounded-xl p-4 flex items-start gap-3.5 shadow-lg">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Your privacy is our priority</h4>
              <p className="text-[11px] text-text-faint leading-relaxed mt-0.5">
                No data is stored on our servers. Your conversations stay private.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Decorative Mug and Plant at bottom-left */}
      <div className="hidden lg:block absolute bottom-4 left-6 pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-end gap-3 scale-75 origin-bottom-left">
          {/* Plant */}
          <div className="flex flex-col items-center">
            {/* Leaves */}
            <div className="flex justify-center -space-x-1 mb-[-4px]">
              <span className="w-4 h-6 bg-emerald-600/60 rounded-full rotate-[-25deg] origin-bottom" />
              <span className="w-4 h-7 bg-emerald-500/70 rounded-full rotate-[-5deg] origin-bottom" />
              <span className="w-4 h-6 bg-emerald-600/60 rounded-full rotate-[20deg] origin-bottom" />
            </div>
            {/* Pot */}
            <div className="w-10 h-8 bg-panel-3 border border-border-custom rounded-b-lg rounded-t-sm flex items-center justify-center">
              <span className="text-[8px] font-bold text-text-faint font-mono">PLNT</span>
            </div>
          </div>
          
          {/* Mug */}
          <div className="relative">
            {/* Handle */}
            <div className="absolute top-1.5 right-[-6px] w-3.5 h-5 rounded-r-lg border-2 border-border-custom bg-transparent" />
            {/* Mug Body */}
            <div className="w-9 h-8 bg-[#181a1f] border border-border-custom rounded-b-md rounded-t-sm flex items-center justify-center relative">
              <div className="w-3 h-3 rounded bg-accent/10 flex items-center justify-center">
                <span className="text-[7px] text-accent font-extrabold">M</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <footer className="w-full py-4 text-center border-t border-border-custom/30 text-text-faint text-[11px] font-medium z-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-8">
        <div>Made with <span className="text-rose-500">❤️</span> by Meetly Team</div>
        <div className="hidden sm:block text-border-custom">|</div>
        <div className="font-mono text-[10px]">V 1.0.0</div>
      </footer>
    </div>
  );
}
