/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Tv, 
  MessageSquare, 
  Users, 
  MoreHorizontal, 
  PhoneOff, 
  Copy, 
  Check, 
  Shield, 
  Award, 
  Volume2, 
  Globe, 
  HelpCircle, 
  Sparkles, 
  FileText, 
  Download, 
  Grid, 
  PenTool, 
  Eraser, 
  Trash2, 
  X,
  Plus,
  ArrowLeft,
  Flame,
  ThumbsUp,
  Heart,
  Laugh,
  Smile,
  PartyPopper,
  Info,
  Code,
  GraduationCap,
  Edit3
} from 'lucide-react';
import QRCode from 'qrcode';
import { Participant, Message, Recording, Poll } from '../types';
import AIWidget from './AIWidget';
import WhiteboardWidget from './WhiteboardWidget';
import CodingInterviewWidget from './CodingInterviewWidget';
import ClassroomModeWidget from './ClassroomModeWidget';
import SharedNotesWidget from './SharedNotesWidget';

interface CallScreenProps {
  name: string;
  roomCode: string;
  isHost: boolean;
  localStream: MediaStream | null;
  initialMicOn: boolean;
  initialCamOn: boolean;
  initialBlurLevel: 'none' | 'soft' | 'strong';
  participants: Participant[];
  messages: Message[];
  pendingAdmissions: { id: string; name: string; conn: any }[];
  myId: string;
  
  // Callback actions
  onAdmit: (id: string) => void;
  onDeny: (id: string) => void;
  onLeave: () => void;
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleHand: () => void;
  onMutePeer: (id: string) => void;
  onRemovePeer: (id: string) => void;
  onSendReaction: (emoji: string) => void;
  onSendWbStroke: (stroke: any) => void;
  onSendWbClear: () => void;
  onToggleWaitingRoom: (enabled: boolean) => void;
  onUpdateName: (newName: string) => void;
  
  // Collaborative state hooks
  wbStrokes: any[];
  onAddLocalWbStroke: (stroke: any) => void;
  onClearLocalWb: () => void;
  
  // React state for raised hand queue
  myHandRaised: boolean;
  onBroadcast?: (msg: any) => void;
}

export default function CallScreen({
  name,
  roomCode,
  isHost,
  localStream,
  initialMicOn,
  initialCamOn,
  initialBlurLevel,
  participants,
  messages,
  pendingAdmissions,
  myId,
  onAdmit,
  onDeny,
  onLeave,
  onSendMessage,
  onToggleMic,
  onToggleCam,
  onToggleHand,
  onMutePeer,
  onRemovePeer,
  onSendReaction,
  onSendWbStroke,
  onSendWbClear,
  onToggleWaitingRoom,
  onUpdateName,
  wbStrokes,
  onAddLocalWbStroke,
  onClearLocalWb,
  myHandRaised,
  onBroadcast
}: CallScreenProps) {
  
  // Navigation states
  const [activePage, setActivePage] = useState<'lobby' | 'people-grid' | 'notes' | 'transcript' | 'recordings' | 'settings' | 'whiteboard' | 'code' | 'classroom' | 'shared-notes'>('lobby');
  const [bookmarks, setBookmarks] = useState<{ time: string; text: string }[]>([]);
  const [code, setCode] = useState('// Collaborate on code here!\nfunction solution() {\n  console.log("Welcome to Meetly Code Hub!");\n}');
  const [sharedNotes, setSharedNotes] = useState('# Meeting Agenda & Shared Notes\n\n- Discuss project requirements\n- Plan architecture\n- Assign tasks\n');
  const [showRightRail, setShowRightRail] = useState(true);
  const [rightRailPanel, setRightRailPanel] = useState<'people' | 'chat'>('chat');
  
  // Local audio/video toggles (mirrors app state)
  const [micOn, setMicOn] = useState(initialMicOn);
  const [camOn, setCamOn] = useState(initialCamOn);
  const [blurLevel, setBlurLevel] = useState<'none' | 'soft' | 'strong'>(initialBlurLevel);
  const [screenSharing, setScreenSharing] = useState(false);
  const [noiseGateOn, setNoiseGateOn] = useState(false);
  
  // Timer state
  const [duration, setDuration] = useState(0);
  
  // Input and UI triggers
  const [chatInp, setChatInp] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'spotlight'>('grid');
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  
  // Speech-to-text live captions / transcript
  const [captionsOn, setCaptionsOn] = useState(false);
  const [liveCaptions, setLiveCaptions] = useState<{ sender: string; text: string; final: boolean }[]>([]);
  const [transcript, setTranscript] = useState<{ sender: string; text: string; time: string }[]>([]);
  const recognizerRef = useRef<any>(null);

  // Whiteboard drawing states
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [wbColor, setWbColor] = useState('#ef4444');
  const [wbTool, setWbTool] = useState<'pen' | 'erase'>('pen');
  const wbCanvasRef = useRef<HTMLCanvasElement>(null);
  const wbCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const wbDrawingRef = useRef(false);
  const wbLastPosRef = useRef<{ x: number; y: number } | null>(null);

  // QR Code data URL
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Local Recording State
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingsList, setRecordingsList] = useState<Recording[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recRafRef = useRef<number | null>(null);
  const recStartTimeRef = useRef<number>(0);

  // Floating reactions container
  const [reactions, setReactions] = useState<{ id: string; emoji: string; peerId: string }[]>([]);

  // Network Quality simulation
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good');

  // Video stream references
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Compute invite link
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  // Run call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Run random network fluctuation
  useEffect(() => {
    const netTimer = setInterval(() => {
      const rand = Math.random();
      if (rand > 0.85) setNetworkQuality('fair');
      else if (rand > 0.98) setNetworkQuality('poor');
      else setNetworkQuality('good');
    }, 8000);
    return () => clearInterval(netTimer);
  }, []);

  // Generate QR code for invite
  useEffect(() => {
    QRCode.toDataURL(inviteUrl, { width: 150, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('QR code generation failed:', err));
  }, [inviteUrl]);

  // Bind local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream && camOn) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, camOn]);

  // Sync mic trigger
  const handleToggleMicLocal = () => {
    setMicOn(prev => !prev);
    onToggleMic();
  };

  // Sync cam trigger
  const handleToggleCamLocal = () => {
    setCamOn(prev => !prev);
    onToggleCam();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSendMessage = () => {
    if (!chatInp.trim()) return;
    onSendMessage(chatInp.trim());
    setChatInp('');
  };

  // Web Speech API Live Captions & Transcript handler
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && captionsOn) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let text = '';
        let isFinal = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
          if (event.results[i].isFinal) isFinal = true;
        }

        if (text.trim()) {
          // Display in-call overlay captions
          setLiveCaptions([{ sender: name, text, final: isFinal }]);
          
          if (isFinal) {
            // Append to full transcript
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setTranscript(prev => [...prev, { sender: name, text, time: timeStr }]);
            setTimeout(() => setLiveCaptions([]), 3500);
          }
        }
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
      };

      rec.onend = () => {
        if (captionsOn) {
          try { rec.start(); } catch (e) {}
        }
      };

      rec.start();
      recognizerRef.current = rec;
    } else {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
        recognizerRef.current = null;
      }
      setLiveCaptions([]);
    }

    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
    };
  }, [captionsOn, name]);

  // Whiteboard drawing synchronization
  useEffect(() => {
    if (wbCanvasRef.current) {
      const canvas = wbCanvasRef.current;
      wbCtxRef.current = canvas.getContext('2d');
      if (wbCtxRef.current) {
        wbCtxRef.current.lineCap = 'round';
        wbCtxRef.current.lineJoin = 'round';
      }
      resizeWhiteboard();
    }
  }, [showWhiteboard]);

  const resizeWhiteboard = () => {
    const canvas = wbCanvasRef.current;
    if (canvas && canvas.parentElement) {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      redrawWhiteboard();
    }
  };

  const redrawWhiteboard = () => {
    const canvas = wbCanvasRef.current;
    const ctx = wbCtxRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      wbStrokes.forEach(stroke => {
        drawStrokeOnCanvas(stroke);
      });
    }
  };

  const drawStrokeOnCanvas = (stroke: any) => {
    const canvas = wbCanvasRef.current;
    const ctx = wbCtxRef.current;
    if (canvas && ctx) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.globalCompositeOperation = stroke.tool === 'erase' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.tool === 'erase' ? 18 : 3;
      ctx.beginPath();
      ctx.moveTo(stroke.x0 * w, stroke.y0 * h);
      ctx.lineTo(stroke.x1 * w, stroke.y1 * h);
      ctx.stroke();
    }
  };

  // Re-draw whiteboard when new strokes arrive
  useEffect(() => {
    if (showWhiteboard) {
      redrawWhiteboard();
    }
  }, [wbStrokes, showWhiteboard]);

  const handleWbPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    wbDrawingRef.current = true;
    const canvas = wbCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      wbLastPosRef.current = { x, y };
    }
  };

  const handleWbPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!wbDrawingRef.current || !wbLastPosRef.current) return;
    const canvas = wbCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const stroke = {
        x0: wbLastPosRef.current.x,
        y0: wbLastPosRef.current.y,
        x1: x,
        y1: y,
        color: wbColor,
        tool: wbTool
      };

      // Add locally and send to peers
      onAddLocalWbStroke(stroke);
      onSendWbStroke(stroke);
      wbLastPosRef.current = { x, y };
    }
  };

  const handleWbPointerUpOrLeave = () => {
    wbDrawingRef.current = false;
    wbLastPosRef.current = null;
  };

  const handleWbClear = () => {
    onClearLocalWb();
    onSendWbClear();
  };

  // Trigger floating reactions
  const triggerReactionLocal = (emoji: string) => {
    onSendReaction(emoji);
    handleSpawnReaction(myId, emoji);
  };

  const handleSpawnReaction = (peerId: string, emoji: string) => {
    const id = Math.random().toString(36).substring(7);
    setReactions(prev => [...prev, { id, emoji, peerId }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  // Composite canvas recording logic (records all visible video feeds on a grid)
  const startLocalRecording = () => {
    if (!window.MediaRecorder) {
      alert('Local video recording is not supported in this browser.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    recCanvasRef.current = canvas;
    recStartTimeRef.current = Date.now();
    setRecordedChunks([]);

    const drawGrid = () => {
      ctx.fillStyle = '#080909';
      ctx.fillRect(0, 0, 1280, 720);

      // Find all visible video elements
      const videos: HTMLVideoElement[] = [];
      if (localVideoRef.current && camOn) {
        videos.push(localVideoRef.current);
      }
      
      // Select the video feeds of other participants
      const remoteTileVideos = document.querySelectorAll('.remote-video') as NodeListOf<HTMLVideoElement>;
      remoteTileVideos.forEach(v => {
        if (v && v.srcObject) videos.push(v);
      });

      const count = videos.length || 1;
      const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
      const rows = Math.ceil(count / cols);
      const cellW = 1280 / cols;
      const cellH = 720 / rows;

      videos.forEach((v, idx) => {
        try {
          ctx.drawImage(v, (idx % cols) * cellW, Math.floor(idx / cols) * cellH, cellW, cellH);
        } catch (err) {}
      });

      recRafRef.current = requestAnimationFrame(drawGrid);
    };

    drawGrid();

    const stream = canvas.captureStream(20);
    // Include user audio track
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        try { stream.addTrack(track); } catch (e) {}
      });
    }

    const chunks: Blob[] = [];
    const options = { mimeType: 'video/webm;codecs=vp9' };
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const durationSec = Math.round((Date.now() - recStartTimeRef.current) / 1000);
      const recName = `meetly-rec-${roomCode}-${Date.now()}.webm`;

      // Save to list
      const newRec: Recording = {
        name: recName,
        url: url,
        size: blob.size,
        duration: durationSec
      };
      setRecordingsList(prev => [newRec, ...prev]);

      // Auto trigger browser download
      const a = document.createElement('a');
      a.href = url;
      a.download = recName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
    };

    mediaRecorder.start(1000);
    mediaRecorderRef.current = mediaRecorder;
    setRecordingActive(true);
  };

  const stopLocalRecording = () => {
    if (recRafRef.current) {
      cancelAnimationFrame(recRafRef.current);
      recRafRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordingActive(false);
  };

  // Listen to remote actions in stream or text events via ref syncing
  useEffect(() => {
    // Add incoming peer message callbacks
    // When reactions are broadcasted, they can be spawned on CallScreen!
    // We bind custom global events for React calling synchronization
    const handleRemoteReaction = (e: CustomEvent<{ peerId: string; emoji: string }>) => {
      handleSpawnReaction(e.detail.peerId, e.detail.emoji);
    };

    const handleRemoteCaption = (e: CustomEvent<{ name: string; text: string; final: boolean; peerId: string }>) => {
      setLiveCaptions([{ sender: e.detail.name, text: e.detail.text, final: e.detail.final }]);
      if (e.detail.final) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setTranscript(prev => [...prev, { sender: e.detail.name, text: e.detail.text, time: timeStr }]);
        setTimeout(() => setLiveCaptions([]), 3500);
      }
    };

    const handleRemoteCodeSync = (e: CustomEvent<{ code: string }>) => {
      setCode(e.detail.code);
    };

    const handleRemoteNotesSync = (e: CustomEvent<{ notes: string }>) => {
      setSharedNotes(e.detail.notes);
    };

    window.addEventListener('remote-reaction' as any, handleRemoteReaction);
    window.addEventListener('remote-caption' as any, handleRemoteCaption);
    window.addEventListener('remote-code-sync' as any, handleRemoteCodeSync);
    window.addEventListener('remote-notes-sync' as any, handleRemoteNotesSync);

    return () => {
      window.removeEventListener('remote-reaction' as any, handleRemoteReaction);
      window.removeEventListener('remote-caption' as any, handleRemoteCaption);
      window.removeEventListener('remote-code-sync' as any, handleRemoteCodeSync);
      window.removeEventListener('remote-notes-sync' as any, handleRemoteNotesSync);
    };
  }, []);

  const getInitials = (n: string) => {
    const p = n.trim().split(/\s+/);
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[1][0]).toUpperCase();
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleAddBookmark = (text: string) => {
    const timeStr = formatTime(duration);
    setBookmarks(prev => [...prev, { time: timeStr, text }]);
  };

  const activeParticipants = [
    { id: myId, name, micOn, camOn, handRaised: myHandRaised, isHost, stream: localStream, isSpeaking: false },
    ...participants
  ];

  // Active Raised hand queue computation
  const raisedHandsQueue = activeParticipants.filter(p => p.handRaised);

  return (
    <div className="h-screen bg-bg text-[#f1f2f4] flex flex-col overflow-hidden relative selection:bg-accent selection:text-white">
      
      {/* Dynamic Subtitles Caption Overlay */}
      {liveCaptions.length > 0 && (
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col gap-2 w-full max-w-xl px-4">
          {liveCaptions.map((cap, i) => (
            <div key={i} className="bg-black/85 text-white text-sm font-semibold py-2.5 px-5 rounded-xl border border-white/10 text-center shadow-xl animate-in slide-in-from-top-3">
              <span className="text-accent font-bold uppercase tracking-wider text-[11px] block mb-0.5">{cap.sender} Speaking</span>
              {cap.text}
            </div>
          ))}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border-custom bg-panel/90 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent to-accent-2 flex items-center justify-center shadow-md relative">
            <div className="absolute inset-2 rounded-[3px] bg-panel" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white leading-tight">Meetly</h2>
            <p className="text-[9px] text-text-faint font-semibold tracking-wider uppercase">Simple • Secure • Fast</p>
          </div>
        </div>

        {/* Center Indicators */}
        <div className="hidden md:flex items-center gap-6 text-xs text-text-dim">
          <div className="flex items-center gap-1">
            Meeting ID: <span className="font-semibold text-white font-mono">{roomCode}</span>
            <button onClick={handleCopyId} className="p-1 rounded hover:bg-panel-3 hover:text-white transition-colors cursor-pointer" title="Copy Room ID">
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          
          <div className="h-4 w-px bg-border-custom" />

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-white">Active Room</span>
          </div>

          <div className="h-4 w-px bg-border-custom" />

          <div className="flex items-center gap-1.5">
            ⏱ Duration: <span className="font-mono font-bold text-white">{formatTime(duration)}</span>
          </div>

          <div className="h-4 w-px bg-border-custom" />

          <div className="flex items-center gap-1.5">
            👥 Peers: <span className="font-bold text-accent">{activeParticipants.length}</span>
          </div>

          <div className="h-4 w-px bg-border-custom" />

          {/* Dynamic Network indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-3">
              <span className={`w-0.75 rounded-t-sm ${networkQuality !== 'poor' ? 'bg-emerald-500' : 'bg-red-500'} h-1`} />
              <span className={`w-0.75 rounded-t-sm ${networkQuality === 'good' ? 'bg-emerald-500' : networkQuality === 'fair' ? 'bg-yellow-500' : 'bg-text-faint'} h-2`} />
              <span className={`w-0.75 rounded-t-sm ${networkQuality === 'good' ? 'bg-emerald-500' : 'bg-text-faint'} h-3`} />
            </div>
            <span className="font-semibold text-white">{networkQuality === 'good' ? 'Excellent' : networkQuality === 'fair' ? 'Fair' : 'Poor'}</span>
          </div>
          <span className="text-[9px] font-extrabold text-[#22c55e] border border-[#22c55e]/30 px-1 py-0.5 rounded leading-none bg-[#22c55e]/10">HD</span>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={recordingActive ? stopLocalRecording : startLocalRecording}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${recordingActive ? 'bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20' : 'bg-panel-2 border-border-custom hover:border-text-faint text-text-dim hover:text-white'}`}
          >
            <span className={`w-2 h-2 rounded-full bg-red-500 ${recordingActive ? 'animate-ping' : ''}`} />
            {recordingActive ? 'Recording' : 'Record'}
          </button>

          <button 
            onClick={() => {
              setActivePage('notes');
              document.querySelectorAll('.sn-item').forEach(e => e.classList.remove('active'));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel-2 border border-[#a78bfa]/25 text-[#c4b5fd] hover:text-white hover:bg-[#a78bfa]/10 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Notes
          </button>

          <button 
            onClick={() => {
              setActivePage('transcript');
              document.querySelectorAll('.sn-item').forEach(e => e.classList.remove('active'));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel-2 border border-blue-400/25 text-blue-300 hover:text-white hover:bg-blue-400/10 text-xs font-semibold cursor-pointer transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Transcript
          </button>

          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-accent-2 flex items-center justify-center font-bold text-xs text-white uppercase ml-1">
            {getInitials(name)}
          </div>
        </div>
      </div>

      {/* Raised Hands Queue Banner */}
      {raisedHandsQueue.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 px-6 flex items-center gap-2 text-xs text-amber-500 shrink-0">
          <span className="font-extrabold flex items-center gap-1 shrink-0">✋ Raised hands:</span>
          <div className="flex flex-wrap gap-1.5">
            {raisedHandsQueue.map((p, idx) => (
              <span key={idx} className="bg-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Waiting Room Admissions Panel */}
      {isHost && pendingAdmissions.length > 0 && (
        <div className="bg-accent/10 border-b border-accent/20 py-2.5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 z-10 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">People waiting to join this meeting</h4>
          </div>
          <div className="flex flex-col gap-2">
            {pendingAdmissions.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 bg-[#111317] border border-border-custom/50 px-3 py-1.5 rounded-xl">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                  {getInitials(entry.name)}
                </div>
                <span className="text-xs text-white font-semibold">{entry.name}</span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => onAdmit(entry.id)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-[11px] px-3 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    Admit
                  </button>
                  <button 
                    onClick={() => onDeny(entry.id)}
                    className="text-red-400 hover:bg-red-500/10 font-bold text-[11px] px-3 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Container Shell */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* Left Vertical Sidenav Bar */}
        <aside className="w-20 border-r border-border-custom bg-panel flex flex-col items-center justify-between py-6 shrink-0 z-10">
          <div className="flex flex-col gap-4 w-full">
            <button 
              onClick={() => setActivePage('lobby')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3.5 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'lobby' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <Video className="w-5 h-5" />
              <span className="text-[10px]">Lobby</span>
            </button>

            <button 
              onClick={() => setActivePage('people-grid')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3.5 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'people-grid' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px]">Participants</span>
              <span className="absolute top-1 right-2 px-1.5 py-0.5 rounded-full bg-accent text-[#1a0800] text-[9px] font-bold leading-none shrink-0 scale-90">
                {activeParticipants.length}
              </span>
            </button>

            <button 
              onClick={() => {
                setShowRightRail(true);
                setRightRailPanel('chat');
              }}
              className="sn-item w-full flex flex-col items-center gap-1.5 py-3.5 text-text-faint hover:text-text-dim transition-all relative"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px]">Chat</span>
              {messages.length > 0 && (
                <span className="absolute top-1 right-2 px-1.5 py-0.5 rounded-full bg-accent text-[#1a0800] text-[9px] font-bold leading-none shrink-0 scale-90">
                  {messages.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActivePage('notes')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'notes' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-[10px]">AI Assistant</span>
            </button>

            <button 
              onClick={() => setActivePage('whiteboard')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'whiteboard' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <PenTool className="w-5 h-5 text-blue-400" />
              <span className="text-[10px]">Whiteboard</span>
            </button>

            <button 
              onClick={() => setActivePage('code')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'code' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <Code className="w-5 h-5 text-emerald-400" />
              <span className="text-[10px]">Code Editor</span>
            </button>

            <button 
              onClick={() => setActivePage('shared-notes')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'shared-notes' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <Edit3 className="w-5 h-5 text-cyan-400" />
              <span className="text-[10px]">Shared Notes</span>
            </button>

            <button 
              onClick={() => setActivePage('classroom')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'classroom' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <GraduationCap className="w-5 h-5 text-amber-400" />
              <span className="text-[10px]">Classroom</span>
            </button>

            <button 
              onClick={() => setActivePage('transcript')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'transcript' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-[10px]">Transcript</span>
            </button>

            <button 
              onClick={() => setActivePage('recordings')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'recordings' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <Download className="w-5 h-5" />
              <span className="text-[10px]">Recordings</span>
            </button>

            <button 
              onClick={() => setActivePage('settings')}
              className={`sn-item w-full flex flex-col items-center gap-1.5 py-3 text-text-faint hover:text-text-dim transition-all relative ${activePage === 'settings' ? 'text-accent border-r-2 border-accent bg-accent/5 font-semibold' : ''}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span className="text-[10px]">Settings</span>
            </button>
          </div>

          {/* Network indicator inside sidebar */}
          <div className="w-full flex flex-col items-center gap-1.5 pt-4 border-t border-border-custom/35 text-text-faint">
            <div className="flex items-end gap-0.5 h-3">
              <span className={`w-0.75 rounded-t-sm ${networkQuality !== 'poor' ? 'bg-emerald-500' : 'bg-red-500'} h-1`} />
              <span className={`w-0.75 rounded-t-sm ${networkQuality === 'good' ? 'bg-emerald-500' : networkQuality === 'fair' ? 'bg-yellow-500' : 'bg-text-faint'} h-2`} />
              <span className={`w-0.75 rounded-t-sm ${networkQuality === 'good' ? 'bg-emerald-500' : 'bg-text-faint'} h-3`} />
            </div>
            <span className="text-[9px] font-bold">Network</span>
          </div>
        </aside>

        {/* Central Active Page Workspace Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#08090b] relative overflow-y-auto p-6 md:p-8">
          
          {/* -------------------------------------------
              LOBBY HOME & ACTIVE VIDEO CALL WORKSPACE 
             ------------------------------------------- */}
          {activePage === 'lobby' && (
            <div className="flex-1 flex flex-col justify-between h-full relative">
              
              {/* Solo Lobby (when alone) */}
              {participants.length === 0 ? (
                <div className="max-w-xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-300">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent to-accent-2 flex items-center justify-center shadow-xl shadow-accent/10 relative">
                    <span className="text-3xl font-extrabold text-white">{getInitials(name)}</span>
                    <span className="absolute bottom-0 right-0 px-2 py-0.5 rounded bg-accent text-[#1a0800] text-[10px] font-bold border border-[#08090b]">
                      Host
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold font-display text-white">
                      Prem <span className="text-accent text-sm font-bold border border-accent/30 px-2 py-0.5 rounded-full ml-1.5">Host</span>
                    </h2>
                    <h3 className="text-lg font-bold text-white tracking-tight">You are the only participant</h3>
                    <p className="text-xs text-text-dim">Share the meeting link with others to start collaborating.</p>
                  </div>

                  {/* Invitation Info Box Card */}
                  <div className="w-full bg-[#111317] border border-border-custom rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 text-left">
                    <div className="flex-1 space-y-3.5">
                      <div>
                        <span className="block text-[10px] font-bold text-text-faint uppercase tracking-wider mb-0.5">Meeting ID</span>
                        <div className="flex items-center gap-2 text-md font-bold text-accent font-mono">
                          {roomCode}
                          <button onClick={handleCopyId} className="p-1 rounded hover:bg-[#181a1f] text-text-faint hover:text-white transition-colors cursor-pointer">
                            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-text-faint uppercase tracking-wider mb-0.5">Invite others</span>
                        <div className="flex items-center gap-2 text-xs text-white">
                          <span className="truncate max-w-[240px] font-semibold text-text-dim">{inviteUrl}</span>
                          <button onClick={handleCopyLink} className="p-1 rounded hover:bg-[#181a1f] text-text-faint hover:text-white transition-colors cursor-pointer">
                            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* QR Code Container */}
                    {qrCodeDataUrl && (
                      <div className="w-24 h-24 bg-white rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-lg">
                        <img src={qrCodeDataUrl} alt="Join QR" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>

                  {/* Copy Link & Invite Button Actions */}
                  <div className="flex gap-3">
                    <button 
                      onClick={handleCopyLink}
                      className="py-3 px-6 rounded-xl bg-accent hover:bg-[#ff8c4d] text-[#1a0800] font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                    <button 
                      onClick={handleCopyLink}
                      className="py-3 px-6 rounded-xl bg-panel-2 border border-border-custom hover:border-text-faint text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Invite People
                    </button>
                  </div>
                </div>
              ) : (
                /* Stage Calling Video Grid (when peers are active) */
                <div className={`flex-1 grid gap-4 ${
                  layoutMode === 'grid' 
                    ? activeParticipants.length <= 1 
                      ? 'grid-cols-1' 
                      : activeParticipants.length <= 2 
                        ? 'grid-cols-1 md:grid-cols-2' 
                        : 'grid-cols-2'
                    : 'grid-cols-4 grid-rows-4 h-full'
                }`}>
                  
                  {/* Spotlight Layout wrapper triggers */}
                  {layoutMode === 'spotlight' ? (
                    <>
                      {/* Active Spotlight Main Video Tile */}
                      <div className="col-span-4 row-span-3 relative bg-[#0c0d11] border-2 border-border-custom rounded-2xl overflow-hidden group">
                        {/* Render pinned peer or host first */}
                        {(() => {
                          const mainPeer = activeParticipants.find(p => p.id === (pinnedPeerId || myId)) || activeParticipants[0];
                          return (
                            <>
                              {mainPeer.id === myId ? (
                                camOn ? (
                                  <video 
                                    ref={localVideoRef} 
                                    autoPlay 
                                    muted 
                                    playsInline 
                                    className={`w-full h-full object-cover scale-x-[-1] ${blurLevel === 'soft' ? 'blur-[4px]' : blurLevel === 'strong' ? 'blur-[12px]' : ''}`}
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <div className="w-20 h-20 rounded-full bg-panel-2 flex items-center justify-center text-xl font-bold text-white">
                                      {getInitials(mainPeer.name)}
                                    </div>
                                    <span className="text-xs text-text-faint font-semibold">Camera off</span>
                                  </div>
                                )
                              ) : (
                                mainPeer.camOn && mainPeer.stream ? (
                                  <video 
                                    ref={(el) => { if (el) el.srcObject = mainPeer.stream as MediaStream; }}
                                    autoPlay 
                                    playsInline 
                                    className="remote-video w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold text-accent">
                                      {getInitials(mainPeer.name)}
                                    </div>
                                    <span className="text-xs text-text-faint font-semibold">Camera off</span>
                                  </div>
                                )
                              )}

                              {/* Indicator Pill overlay */}
                              <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                                <span className="text-xs font-semibold text-white truncate max-w-[150px]">{mainPeer.name}</span>
                                {mainPeer.micOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                              </div>

                              {/* Pinned Indicator badge */}
                              <div className="absolute top-3 left-3 bg-accent text-[#1a0800] text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Pinned Spotlight
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Filmstrip peer list below spotlight */}
                      <div className="col-span-4 row-span-1 flex gap-3 overflow-x-auto py-1">
                        {activeParticipants.map((peer) => (
                          <div 
                            key={peer.id} 
                            onClick={() => setPinnedPeerId(peer.id)}
                            className={`w-36 flex-shrink-0 bg-[#0c0d11] rounded-xl border relative overflow-hidden flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${pinnedPeerId === peer.id ? 'border-accent ring-2 ring-accent/20' : 'border-border-custom hover:border-text-faint'}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-panel-2 flex items-center justify-center text-xs font-bold text-white mb-1.5">
                              {getInitials(peer.name)}
                            </div>
                            <span className="text-[10px] font-semibold text-text-dim truncate max-w-full">{peer.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    /* Standard Grid Layout */
                    activeParticipants.map((peer) => {
                      const isMe = peer.id === myId;
                      return (
                        <div 
                          key={peer.id} 
                          className={`relative bg-[#0c0d11] border rounded-2xl overflow-hidden group aspect-[16/10] flex items-center justify-center transition-all ${
                            peer.isSpeaking ? 'border-emerald-500 shadow-lg shadow-emerald-500/5' : 'border-border-custom/80'
                          }`}
                        >
                          {/* Floating Peer Reaction Emoji overlays */}
                          {reactions.filter(r => r.peerId === peer.id).map((r) => (
                            <div key={r.id} className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-30 pointer-events-none text-4xl reaction-pop">
                              {r.emoji}
                            </div>
                          ))}

                          {isMe ? (
                            /* Local user video tile */
                            camOn ? (
                              <video 
                                ref={localVideoRef} 
                                autoPlay 
                                muted 
                                playsInline 
                                className={`w-full h-full object-cover scale-x-[-1] ${blurLevel === 'soft' ? 'blur-[4px]' : blurLevel === 'strong' ? 'blur-[12px]' : ''}`}
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-panel-2 flex items-center justify-center text-lg font-bold text-white">
                                  {getInitials(peer.name)}
                                </div>
                                <span className="text-xs text-text-faint font-semibold">Camera off</span>
                              </div>
                            )
                          ) : (
                            /* Remote peer video tile */
                            peer.camOn && peer.stream ? (
                              <video 
                                ref={(el) => { if (el) el.srcObject = peer.stream as MediaStream; }}
                                autoPlay 
                                playsInline 
                                className="remote-video w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-lg font-bold text-accent">
                                  {getInitials(peer.name)}
                                </div>
                                <span className="text-xs text-text-faint font-semibold">Camera off</span>
                              </div>
                            )
                          )}

                          {/* Top Right Pin Button */}
                          <button 
                            onClick={() => {
                              setLayoutMode('spotlight');
                              setPinnedPeerId(peer.id);
                            }}
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/50 border border-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-black/75 transition-all cursor-pointer"
                            title="Pin Spotlignt"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-1.4-9.1A2 2 0 0 0 15.6 6H8.4a2 2 0 0 0-2 1.9L5 17z"/><line x1="9" y1="6" x2="9" y2="3"/><line x1="15" y1="6" x2="15" y2="3"/></svg>
                          </button>

                          {/* Bottom Info Bar overlay */}
                          <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1.5 rounded-lg border border-white/10 flex items-center gap-2 max-w-[85%] z-10">
                            <span className="text-[11px] font-bold text-white truncate">{peer.name} {isMe && '(You)'}</span>
                            {!peer.micOn && <MicOff className="w-3 h-3 text-red-400 shrink-0" />}
                          </div>

                          {/* Hand Raised Icon badge */}
                          {peer.handRaised && (
                            <span className="absolute top-3 left-3 w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-sm shadow-lg border border-white/10 animate-bounce">
                              ✋
                            </span>
                          )}

                          {/* Host badge */}
                          {peer.isHost && (
                            <span className="absolute top-3 left-3 bg-accent text-[#1a0800] text-[8px] font-bold px-1.5 py-0.5 rounded leading-none">
                              Host
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}

                </div>
              )}

              {/* Whiteboard overlay board inside lobby page workspace */}
              {showWhiteboard && (
                <div className="absolute inset-0 bg-[#1c1d20] z-30 rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 shadow-2xl border border-border-custom">
                  {/* Whiteboard toolbar controls */}
                  <div className="flex items-center justify-between px-6 py-3.5 bg-panel border-b border-border-custom shrink-0 flex-wrap gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5 p-1 bg-panel-2 border border-border-custom rounded-xl">
                        {['#1a1a1a', '#ef4444', '#22c55e', '#3b82f6', '#ff7a30'].map(color => (
                          <button
                            key={color}
                            onClick={() => {
                              setWbColor(color);
                              setWbTool('pen');
                            }}
                            style={{ backgroundColor: color }}
                            className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-all ${wbColor === color && wbTool === 'pen' ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setWbTool('pen')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${wbTool === 'pen' ? 'bg-accent/10 border-accent text-accent' : 'bg-panel-2 border-border-custom text-text-dim hover:border-text-faint'}`}
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          Pen
                        </button>
                        <button
                          onClick={() => setWbTool('erase')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${wbTool === 'erase' ? 'bg-accent/10 border-accent text-accent' : 'bg-panel-2 border-border-custom text-text-dim hover:border-text-faint'}`}
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          Eraser
                        </button>
                        <button
                          onClick={handleWbClear}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-panel-2 hover:bg-panel-3 border border-border-custom text-red-400 font-bold text-xs cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Clear All
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowWhiteboard(false)}
                      className="px-4 py-1.5 bg-panel-2 border border-border-custom hover:border-text-faint text-text-dim hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Close Board
                    </button>
                  </div>

                  {/* Canvas area */}
                  <div className="flex-1 min-h-0 bg-white relative">
                    <canvas
                      ref={wbCanvasRef}
                      onPointerDown={handleWbPointerDown}
                      onPointerMove={handleWbPointerMove}
                      onPointerUp={handleWbPointerUpOrLeave}
                      onPointerLeave={handleWbPointerUpOrLeave}
                      className="absolute inset-0 cursor-crosshair"
                    />
                  </div>
                </div>
              )}

              {/* Float flying emoji panel */}
              <div className="absolute bottom-[24px] left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 rounded-2xl bg-panel border border-border-custom/80 shadow-2xl z-20 pointer-events-auto shrink-0 transition-opacity hidden">
                {/* Embedded Reactions Tray overlay helper */}
              </div>
            </div>
          )}

          {/* -------------------------------------------
              PARTICIPANTS GRID PAGE VIEW 
             ------------------------------------------- */}
          {activePage === 'people-grid' && (
            <div className="space-y-6 animate-in fade-in duration-250">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-display text-white">Participants View</h2>
                    <p className="text-xs text-text-dim">Everyone in this meeting, at a glance</p>
                  </div>
                </div>
                <button
                  onClick={() => setActivePage('lobby')}
                  className="px-4 py-2 bg-panel border border-border-custom hover:border-text-faint rounded-xl text-xs font-semibold text-text-dim hover:text-white cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Meeting
                </button>
              </div>

              {/* Roster Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {activeParticipants.map((peer) => {
                  const isMe = peer.id === myId;
                  return (
                    <div key={peer.id} className="bg-panel border border-border-custom rounded-2xl p-5 flex flex-col items-center gap-3 text-center relative group">
                      
                      {/* Host Tag Indicator */}
                      {peer.isHost && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-accent font-bold text-[9px] uppercase tracking-wider">
                          Host
                        </span>
                      )}

                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-accent to-accent-2 border-2 border-[#16181c] flex items-center justify-center text-lg font-bold text-white shadow-lg">
                        {getInitials(peer.name)}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-white truncate max-w-[140px]">{peer.name} {isMe && '(You)'}</h4>
                        <div className="flex items-center justify-center gap-2 text-text-faint">
                          <span className={peer.micOn ? 'text-emerald-400' : 'text-red-400'}>
                            {peer.micOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                          </span>
                          <span className={peer.camOn ? 'text-emerald-400' : 'text-red-400'}>
                            {peer.camOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                      </div>

                      {/* Admin controls for Host */}
                      {isHost && !isMe && (
                        <div className="pt-2 w-full flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onMutePeer(peer.id)}
                            className="flex-1 py-1.5 rounded-lg bg-panel-2 hover:bg-panel-3 border border-border-custom text-text-dim hover:text-white font-bold text-[10px] cursor-pointer"
                          >
                            Mute
                          </button>
                          <button
                            onClick={() => onRemovePeer(peer.id)}
                            className="flex-1 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-[10px] cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* -------------------------------------------
              AI NOTES & ASSISTANT VIEW 
             ------------------------------------------- */}
          {activePage === 'notes' && (
            <AIWidget 
              transcriptLines={transcript}
              bookmarks={bookmarks}
              onAddBookmark={handleAddBookmark}
              roomCode={roomCode}
            />
          )}

          {/* -------------------------------------------
              INTERACTIVE WHITEBOARD VIEW 
             ------------------------------------------- */}
          {activePage === 'whiteboard' && (
            <WhiteboardWidget 
              strokes={wbStrokes}
              onAddStroke={(stroke) => {
                onAddLocalWbStroke(stroke);
                onSendWbStroke(stroke);
              }}
              onClearBoard={() => {
                onClearLocalWb();
                onSendWbClear();
              }}
            />
          )}

          {/* -------------------------------------------
              CODE HUB & COMPILER VIEW 
             ------------------------------------------- */}
          {activePage === 'code' && (
            <CodingInterviewWidget 
              code={code}
              onUpdateCode={(newCode) => {
                setCode(newCode);
                if (onBroadcast) {
                  onBroadcast({ type: 'code-sync', code: newCode });
                }
              }}
            />
          )}

          {/* -------------------------------------------
              SHARED NOTES WORKSPACE VIEW 
             ------------------------------------------- */}
          {activePage === 'shared-notes' && (
            <SharedNotesWidget 
              notes={sharedNotes}
              onUpdateNotes={(newNotes) => {
                setSharedNotes(newNotes);
                if (onBroadcast) {
                  onBroadcast({ type: 'notes-sync', notes: newNotes });
                }
              }}
            />
          )}

          {/* -------------------------------------------
              CLASSROOM & TEACHER CONTROLS VIEW 
             ------------------------------------------- */}
          {activePage === 'classroom' && (
            <ClassroomModeWidget 
              participants={activeParticipants}
              isHost={isHost}
              onMuteAll={() => {
                if (onBroadcast) {
                  onBroadcast({ type: 'mute-request' });
                }
              }}
              onDisableCams={() => {
                alert('Sent cameras disable request to classroom.');
              }}
              onDisableChat={() => {
                alert('Sent chat disable request to classroom.');
              }}
            />
          )}

          {/* -------------------------------------------
              SPEECH-TO-TEXT TRANSCRIPT VIEW 
             ------------------------------------------- */}
          {activePage === 'transcript' && (
            <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in duration-250">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-display text-white">Transcript</h2>
                    <p className="text-xs text-text-dim">Speech-to-text logs of what was said</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setCaptionsOn(!captionsOn)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${captionsOn ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-panel border-border-custom text-text-dim hover:border-text-faint hover:text-white'}`}
                >
                  {captionsOn ? 'Stop Captions' : 'Turn on Captions'}
                </button>
              </div>

              {/* Transcript Display logs card */}
              <div className="bg-[#111317] border border-border-custom rounded-2xl p-5 flex flex-col h-[380px]">
                {transcript.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 p-6">
                    <div className="w-10 h-10 rounded-full bg-panel-2 flex items-center justify-center text-text-faint">
                      <FileText className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-text-faint max-w-xs leading-relaxed">
                      Transcript list is currently empty. Turn on captions and start speaking to see real-time text logs!
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {transcript.map((line, idx) => (
                      <div key={idx} className="border-b border-border-custom/40 pb-3 last:border-0 leading-relaxed text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-extrabold text-accent">{line.sender}</span>
                          <span className="text-[10px] text-text-faint">{line.time}</span>
                        </div>
                        <p className="text-text-dim font-medium">{line.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------
              RECORDINGS VIEW PAGE 
             ------------------------------------------- */}
          {activePage === 'recordings' && (
            <div className="max-w-xl mx-auto w-full space-y-6 animate-in fade-in duration-250">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display text-white">Recordings</h2>
                  <p className="text-xs text-text-dim">Saved locally directly to your device downloads</p>
                </div>
              </div>

              {/* Recording logs list */}
              <div className="bg-[#111317] border border-border-custom rounded-2xl p-5">
                {recordingsList.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-panel-2 flex items-center justify-center text-text-faint mx-auto">
                      <Download className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-text-faint">No recordings captured this session. Press "Record" inside the top-right toolbar to start one.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recordingsList.map((rec, i) => {
                      const mins = Math.floor(rec.duration / 60);
                      const secs = rec.duration % 60;
                      const sizeMb = (rec.size / 1024 / 1024).toFixed(1);
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-panel-2 border border-border-custom rounded-xl hover:border-text-faint transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-white truncate max-w-[200px]">{rec.name}</h5>
                              <p className="text-[10px] text-text-faint mt-0.5">{mins}m {secs}s • {sizeMb} MB</p>
                            </div>
                          </div>
                          <a 
                            href={rec.url} 
                            download={rec.name}
                            className="p-2 rounded-lg bg-panel hover:bg-[#181a1f] text-text-dim hover:text-white transition-all cursor-pointer"
                            title="Download video file"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------
              SETTINGS PREFERENCES VIEW 
             ------------------------------------------- */}
          {activePage === 'settings' && (
            <div className="max-w-xl mx-auto w-full space-y-6 animate-in fade-in duration-250">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-panel-3 border border-border-custom flex items-center justify-center text-text-dim">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display text-white">Settings</h2>
                  <p className="text-xs text-text-dim">Customize your in-call configurations</p>
                </div>
              </div>

              {/* Toggles List card */}
              <div className="bg-[#111317] border border-border-custom rounded-2xl p-5 space-y-5">
                {/* Blur */}
                <div className="flex items-center justify-between pb-4 border-b border-border-custom/30">
                  <div>
                    <span className="text-xs font-bold text-white block">Background blur</span>
                    <span className="text-[11px] text-text-faint">Blur what is behind you using video filters</span>
                  </div>
                  <button 
                    onClick={() => setBlurLevel(prev => prev === 'none' ? 'soft' : 'none')}
                    className={`w-10 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${blurLevel !== 'none' ? 'bg-accent' : 'bg-panel-3'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${blurLevel !== 'none' ? 'translate-x-4' : ''}`} />
                  </button>
                </div>

                {/* Noise suppression */}
                <div className="flex items-center justify-between pb-4 border-b border-border-custom/30">
                  <div>
                    <span className="text-xs font-bold text-white block">Basic noise suppression</span>
                    <span className="text-[11px] text-text-faint">Suppress background room hums</span>
                  </div>
                  <button 
                    onClick={() => setNoiseGateOn(!noiseGateOn)}
                    className={`w-10 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${noiseGateOn ? 'bg-accent' : 'bg-panel-3'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${noiseGateOn ? 'translate-x-4' : ''}`} />
                  </button>
                </div>

                {/* Live captions */}
                <div className="flex items-center justify-between pb-4 border-b border-border-custom/30">
                  <div>
                    <span className="text-xs font-bold text-white block">Live captions</span>
                    <span className="text-[11px] text-text-faint">Turn on real-time browser speech translation</span>
                  </div>
                  <button 
                    onClick={() => setCaptionsOn(!captionsOn)}
                    className={`w-10 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${captionsOn ? 'bg-accent' : 'bg-panel-3'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${captionsOn ? 'translate-x-4' : ''}`} />
                  </button>
                </div>

                {/* Waiting room setting */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Waiting room</span>
                    <span className="text-[11px] text-text-faint">
                      {isHost ? 'Force guests to wait for admission' : 'Controlled entirely by the room host'}
                    </span>
                  </div>
                  <button 
                    onClick={() => {
                      if (!isHost) {
                        alert('Only the room host can toggle the waiting room settings.');
                        return;
                      }
                      onToggleWaitingRoom(true); // toggles waiting room state
                    }}
                    disabled={!isHost}
                    className={`w-10 h-6 rounded-full relative transition-colors shrink-0 disabled:opacity-45 ${isHost ? 'cursor-pointer bg-accent' : 'bg-panel-3'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isHost ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right sliding / static panel: Chat and Participants List stacked */}
        {showRightRail && (
          <div className="w-80 border-l border-border-custom bg-panel/95 backdrop-blur-md flex flex-col shrink-0 z-10 animate-in slide-in-from-right duration-250">
            
            {/* Right rail headers tab selector */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-custom shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => setRightRailPanel('chat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${rightRailPanel === 'chat' ? 'bg-[#181a1f] text-accent border border-accent/15' : 'text-text-dim hover:text-white'}`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setRightRailPanel('people')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${rightRailPanel === 'people' ? 'bg-[#181a1f] text-accent border border-accent/15' : 'text-text-dim hover:text-white'}`}
                >
                  Participants ({activeParticipants.length})
                </button>
              </div>
              <button 
                onClick={() => setShowRightRail(false)}
                className="p-1 rounded hover:bg-panel-2 text-text-faint hover:text-white transition-colors cursor-pointer"
                title="Collapse sidebar panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages Log view content */}
            {rightRailPanel === 'chat' ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.own ? 'ml-auto items-end text-right' : 'items-start text-left'}`}>
                      <div className="text-[10px] text-text-faint font-semibold mb-0.5 flex gap-1.5 items-baseline">
                        <span>{msg.senderName}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className={`text-xs p-2.5 rounded-xl border leading-relaxed break-all ${msg.own ? 'bg-accent/10 border-accent/30 text-[#ffd4a8]' : 'bg-[#181a1f] border-border-custom text-white'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat text input bar */}
                <div className="p-3 border-t border-border-custom bg-panel shrink-0 flex gap-2">
                  <input
                    type="text"
                    value={chatInp}
                    onChange={(e) => setChatInp(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                    placeholder="Type a message..."
                    className="flex-1 bg-panel-2 border border-border-custom rounded-xl py-2 px-3 text-xs text-white placeholder-text-faint focus:outline-none focus:border-accent"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!chatInp.trim()}
                    className="px-4 bg-accent hover:bg-[#ff8c4d] disabled:opacity-50 text-[#1a0800] font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : (
              /* People Participants List View content */
              <div className="flex-grow overflow-y-auto p-4 space-y-2">
                {activeParticipants.map((peer) => {
                  const isMe = peer.id === myId;
                  return (
                    <div key={peer.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-panel-2 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-accent-2 flex items-center justify-center font-bold text-xs text-white uppercase shrink-0">
                          {getInitials(peer.name)}
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate max-w-[130px]">{peer.name} {isMe && '(You)'}</h5>
                          {peer.isHost && <span className="text-[8px] font-extrabold text-accent">Room Host</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-text-faint">
                        {peer.micOn ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                        {isHost && !isMe && (
                          <button 
                            onClick={() => onRemovePeer(peer.id)}
                            className="p-1 rounded hover:bg-panel-3 text-red-400 cursor-pointer"
                            title="Remove guest"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* Floating control elements flying bar */}
      {/* Bottom control items buttons */}
      <div className="flex items-center justify-center gap-3 py-3.5 px-4 bg-panel border-t border-border-custom shrink-0 flex-wrap relative z-20">
        
        {/* Toggle Mic */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={handleToggleMicLocal}
            className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 ${micOn ? 'bg-[#1d1f24] hover:bg-panel-3 border-border-custom text-white' : 'bg-red-500 border-red-500 text-white'}`}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <span className="text-[10px] text-text-faint">Mic</span>
        </div>

        {/* Toggle Camera */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={handleToggleCamLocal}
            className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 ${camOn ? 'bg-[#1d1f24] hover:bg-panel-3 border-border-custom text-white' : 'bg-red-500 border-red-500 text-white'}`}
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <span className="text-[10px] text-text-faint">Camera</span>
        </div>

        {/* Screen Share */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => {
              if (screenSharing) {
                setScreenSharing(false);
              } else {
                setScreenSharing(true);
                setLayoutMode('spotlight');
                setPinnedPeerId(myId);
                alert('Sharing your local screen presentation!');
              }
            }}
            className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 ${screenSharing ? 'bg-accent/15 border-accent text-accent' : 'bg-[#1d1f24] hover:bg-panel-3 border-border-custom text-white'}`}
          >
            <Tv className="w-5 h-5" />
          </button>
          <span className="text-[10px] text-text-faint">Present</span>
        </div>

        {/* Raise Hand Toggle */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={onToggleHand}
            className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 ${myHandRaised ? 'bg-accent/15 border-accent text-accent animate-bounce' : 'bg-[#1d1f24] hover:bg-panel-3 border-border-custom text-white'}`}
          >
            <span className="text-md">✋</span>
          </button>
          <span className="text-[10px] text-text-faint">Raise Hand</span>
        </div>

        {/* Floating Reactions Tray */}
        <div className="flex flex-col items-center gap-1 shrink-0 relative">
          <button
            onClick={() => setShowMoreMenu(prev => !prev)}
            className="w-11 h-11 rounded-full border bg-[#1d1f24] hover:bg-panel-3 border-border-custom text-white flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Smile className="w-5 h-5" />
          </button>
          <span className="text-[10px] text-text-faint">React</span>
          
          {/* Reaction picker popover menu */}
          {showMoreMenu && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-panel border border-border-custom rounded-xl p-2.5 flex items-center gap-1.5 shadow-2xl animate-in zoom-in-95 duration-100 z-50">
              {['👍', '❤️', '😂', '👏', '🎉', '😮', '🔥', '🙌'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    triggerReactionLocal(emoji);
                    setShowMoreMenu(false);
                  }}
                  className="w-9 h-9 rounded-lg hover:bg-panel-2 text-lg flex items-center justify-center transition-colors cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toggle Chat rail */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setShowRightRail(prev => !prev);
              setRightRailPanel('chat');
            }}
            className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 relative ${showRightRail && rightRailPanel === 'chat' ? 'bg-accent/15 border-accent text-accent' : 'bg-[#1d1f24] hover:bg-panel-3 border-border-custom text-white'}`}
          >
            <MessageSquare className="w-5 h-5" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-accent text-[#1a0800] text-[9px] font-bold shrink-0">
                {messages.length}
              </span>
            )}
          </button>
          <span className="text-[10px] text-text-faint">Chat</span>
        </div>

        {/* Toggle Participants List rail */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setShowRightRail(prev => !prev);
              setRightRailPanel('people');
            }}
            className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 relative ${showRightRail && rightRailPanel === 'people' ? 'bg-accent/15 border-accent text-accent' : 'bg-[#1d1f24] hover:bg-panel-3 border-border-custom text-white'}`}
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-accent text-[#1a0800] text-[9px] font-bold shrink-0">
              {activeParticipants.length}
            </span>
          </button>
          <span className="text-[10px] text-text-faint">People</span>
        </div>

        {/* Quick Toolbox controls toggle */}
        <div className="flex flex-col items-center gap-1 shrink-0 relative">
          <button
            onClick={() => setShowLayoutMenu(prev => !prev)}
            className="w-11 h-11 rounded-full border bg-[#1d1f24] hover:bg-panel-3 border-border-custom text-white flex items-center justify-center shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <span className="text-[10px] text-text-faint">More</span>

          {/* Quick toolbox popover dropdown options */}
          {showLayoutMenu && (
            <div className="absolute bottom-14 right-0 w-52 bg-panel border border-border-custom rounded-xl py-1.5 shadow-2xl z-50 animate-in fade-in duration-100 font-semibold">
              <button
                onClick={() => {
                  setShowWhiteboard(true);
                  setActivePage('lobby');
                  setShowLayoutMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-text-dim hover:text-white hover:bg-panel-2 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                Whiteboard Draw
              </button>
              <button
                onClick={() => {
                  setLayoutMode(prev => prev === 'grid' ? 'spotlight' : 'grid');
                  setShowLayoutMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-text-dim hover:text-white hover:bg-panel-2 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Grid className="w-3.5 h-3.5" />
                Change layout ({layoutMode === 'grid' ? 'Spotlight' : 'Grid'})
              </button>
              <button
                onClick={() => {
                  setCaptionsOn(prev => !prev);
                  setShowLayoutMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-text-dim hover:text-white hover:bg-panel-2 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                {captionsOn ? 'Turn off Captions' : 'Live Speech Captions'}
              </button>
              <button
                onClick={() => {
                  setBlurLevel(prev => prev === 'none' ? 'soft' : 'none');
                  setShowLayoutMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-xs text-text-dim hover:text-white hover:bg-panel-2 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {blurLevel !== 'none' ? 'Turn off Blur' : 'Background Blur'}
              </button>
              <div className="h-px bg-border-custom/50 my-1" />
              <button
                onClick={recordingActive ? stopLocalRecording : startLocalRecording}
                className="w-full text-left px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-panel-2 transition-colors flex items-center gap-2 cursor-pointer font-bold"
              >
                <span className={`w-2 h-2 rounded-full bg-red-500 ${recordingActive ? 'animate-ping' : ''}`} />
                {recordingActive ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border-custom mx-1 hidden sm:block" />

        {/* Leave Room red pill button */}
        <button
          onClick={onLeave}
          className="py-3 px-6 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-500/10 active:scale-95"
        >
          <PhoneOff className="w-4 h-4" />
          Leave Call
        </button>

      </div>

    </div>
  );
}
