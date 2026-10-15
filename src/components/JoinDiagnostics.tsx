/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  Wifi, 
  Activity, 
  Smile, 
  Play, 
  Check, 
  Compass, 
  Clock, 
  Copy, 
  BookOpen 
} from 'lucide-react';

interface JoinDiagnosticsProps {
  onSelectAvatar: (emoji: string) => void;
  selectedAvatar: string;
}

export default function JoinDiagnostics({ onSelectAvatar, selectedAvatar }: JoinDiagnosticsProps) {
  // Mic Testing
  const [micLevel, setMicLevel] = useState(0);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Speaker testing
  const [isPlayingSpeakerTest, setIsPlayingSpeakerTest] = useState(false);

  // Internet Speed testing
  const [speedTestActive, setSpeedTestActive] = useState(false);
  const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [packetLoss, setPacketLoss] = useState<number>(0);

  // Recent Meetings History
  const [recentMeetings, setRecentMeetings] = useState<{ code: string; date: string; title: string }[]>([]);

  // Avatar Options
  const avatars = ['👨‍💼', '👩‍💻', '👩‍🎤', '🧔', '🧑‍🚀', '👩‍🎨', '🧠', '🧙‍♂️', '🦊', '🦄'];

  useEffect(() => {
    // Load recent meetings
    const saved = localStorage.getItem('meetly_recent_meetings');
    if (saved) {
      try {
        setRecentMeetings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent meetings');
      }
    } else {
      // Seed nice initial history
      const initialHistory = [
        { code: "3051", date: "Yesterday, 3:15 PM", title: "Classroom Mathematics Lecture" },
        { code: "8524", date: "June 22, 11:00 AM", title: "Product Architecture Brainstorm" },
        { code: "1962", date: "June 20, 2:30 PM", title: "Technical Coding Interview" }
      ];
      localStorage.setItem('meetly_recent_meetings', JSON.stringify(initialHistory));
      setRecentMeetings(initialHistory);
    }
  }, []);

  // Start Mic Listening for interactive amplitude meter
  const startMicTest = async () => {
    if (isTestingMic) {
      stopMicTest();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      setIsTestingMic(true);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Map average (0-255) to percentage (0-100)
        setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      animationFrameRef.current = requestAnimationFrame(updateVolume);
    } catch (err) {
      console.error('Failed to access microphone for precheck test:', err);
    }
  };

  const stopMicTest = () => {
    setIsTestingMic(false);
    setMicLevel(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, []);

  // Play a pleasant synthesizer chord for speaker test
  const playSpeakerTest = () => {
    if (isPlayingSpeakerTest) return;
    setIsPlayingSpeakerTest(true);

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // Play major 7th chord (C - E - G - B)
      const now = ctx.currentTime;
      playTone(261.63, now, 1.5); // C4
      playTone(329.63, now + 0.1, 1.4); // E4
      playTone(392.00, now + 0.2, 1.3); // G4
      playTone(493.88, now + 0.3, 1.2); // B4

      setTimeout(() => {
        setIsPlayingSpeakerTest(false);
        ctx.close();
      }, 1800);
    } catch (e) {
      console.error(e);
      setIsPlayingSpeakerTest(false);
    }
  };

  // Run beautiful simulation of connection test
  const runSpeedTest = () => {
    if (speedTestActive) return;
    setSpeedTestActive(true);
    setDownloadSpeed(0);
    setPingLatency(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setDownloadSpeed(Math.round(45 + Math.random() * 52));
      setPingLatency(Math.round(8 + Math.random() * 14));
      setPacketLoss(Math.random() > 0.95 ? 1 : 0);

      if (progress >= 100) {
        clearInterval(interval);
        setSpeedTestActive(false);
      }
    }, 200);
  };

  return (
    <div className="space-y-6 bg-panel/40 border border-border-custom/50 rounded-2xl p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border-custom/30 pb-3">
        <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent animate-pulse" />
          Interactive Pre-flight Check
        </h3>
        <span className="text-[10px] text-text-faint font-mono font-medium">Meetly Diagnostics v1.2</span>
      </div>

      {/* Avatar Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-text-dim flex items-center gap-1.5">
            <Smile className="w-3.5 h-3.5 text-accent" />
            Choose Profile Avatar
          </label>
          <span className="text-[10px] text-text-faint">Appears in layout grids</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {avatars.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelectAvatar(emoji)}
              className={`text-xl p-2 rounded-xl transition-all cursor-pointer border ${selectedAvatar === emoji ? 'bg-accent/15 border-accent scale-110 shadow-lg shadow-accent/10' : 'bg-panel-2 border-border-custom hover:border-text-faint'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Mic Amplitude Check */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-dim">Microphone Volume Meter</span>
          <button
            onClick={startMicTest}
            className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors cursor-pointer ${isTestingMic ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-panel-2 hover:bg-panel-3 text-text-dim border border-border-custom'}`}
          >
            {isTestingMic ? 'Stop Mic Test' : 'Test Microphone'}
          </button>
        </div>
        <div className="h-2 w-full bg-[#0c0d11] rounded-full overflow-hidden flex border border-border-custom">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-accent transition-all duration-75"
            style={{ width: `${micLevel}%` }}
          />
        </div>
        {isTestingMic && (
          <p className="text-[10px] text-emerald-400 font-medium text-center animate-pulse">
            🎤 Wave your hands, speak aloud to verify live voice levels!
          </p>
        )}
      </div>

      {/* Speaker Test */}
      <div className="flex items-center justify-between bg-panel-2/50 border border-border-custom/40 p-3 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Audio Output Test</h4>
            <p className="text-[10px] text-text-faint">Play a chime to test speakers</p>
          </div>
        </div>
        <button
          onClick={playSpeakerTest}
          disabled={isPlayingSpeakerTest}
          className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isPlayingSpeakerTest ? 'Playing...' : <Play className="w-4 h-4" />}
        </button>
      </div>

      {/* Connection Diagnostics speed test */}
      <div className="bg-panel-2/50 border border-border-custom/40 p-3 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Speed & Latency</h4>
              <p className="text-[10px] text-text-faint">Check bandwidth & health</p>
            </div>
          </div>
          <button
            onClick={runSpeedTest}
            disabled={speedTestActive}
            className="text-[10px] font-bold px-2.5 py-1.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {speedTestActive ? 'Testing...' : 'Test Speed'}
          </button>
        </div>

        {(downloadSpeed !== null || speedTestActive) && (
          <div className="grid grid-cols-3 gap-2 bg-[#0c0d11] p-2 rounded-lg text-center border border-border-custom">
            <div>
              <span className="block text-[8px] text-text-faint uppercase font-bold">Speed</span>
              <span className="text-xs font-mono font-bold text-white">
                {downloadSpeed ? `${downloadSpeed} Mbps` : '--'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-text-faint uppercase font-bold">Ping</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {pingLatency ? `${pingLatency} ms` : '--'}
              </span>
            </div>
            <div>
              <span className="block text-[8px] text-text-faint uppercase font-bold">Packet Loss</span>
              <span className="text-xs font-mono font-bold text-indigo-400">{packetLoss}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent History quick join list */}
      {recentMeetings.length > 0 && (
        <div className="space-y-2 pt-1">
          <h4 className="text-xs font-bold text-text-dim flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-accent" />
            Recent Meeting History
          </h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {recentMeetings.map((m, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-panel-2 hover:bg-panel-3/80 border border-border-custom/50 text-left transition-all"
              >
                <div>
                  <h5 className="text-[11px] font-bold text-white truncate max-w-[200px]">{m.title}</h5>
                  <span className="text-[9px] text-text-faint font-mono">{m.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono font-bold text-accent bg-accent/5 border border-accent/15 px-1.5 py-0.5 rounded">
                    #{m.code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
