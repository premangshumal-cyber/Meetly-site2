/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, ArrowRight } from 'lucide-react';
import JoinDiagnostics from './JoinDiagnostics';

interface PrecheckPageProps {
  name: string;
  roomCode: string;
  isHost: boolean;
  onJoinCall: (stream: MediaStream | null, micOn: boolean, camOn: boolean, blurLevel: 'none' | 'soft' | 'strong') => void;
  onCancel: () => void;
  onSelectAvatar: (emoji: string) => void;
  selectedAvatar: string;
}

export default function PrecheckPage({ 
  name, 
  roomCode, 
  isHost, 
  onJoinCall, 
  onCancel,
  onSelectAvatar,
  selectedAvatar
}: PrecheckPageProps) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [blurLevel, setBlurLevel] = useState<'none' | 'soft' | 'strong'>('none');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handedOffRef = useRef(false);

  // Request camera and microphone stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError('Camera and microphone require HTTPS or localhost and browser permission.');
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach(track => track.stop()); return; }
        setStream(s);
        activeStream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => {
        console.error('Camera/mic access error:', err);
        setPermissionError('Could not access your camera and microphone. Please check browser permissions and reload.');
      });

    return () => {
      cancelled = true;
      if (activeStream && !handedOffRef.current) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Sync mic trigger
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = micOn;
      });
    }
  }, [micOn, stream]);

  // Sync cam trigger
  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = camOn;
      });
    }
  }, [camOn, stream]);

  const handleJoin = () => {
    // Transfer media ownership to App; the preview unmount must not stop the call.
    handedOffRef.current = true;
    onJoinCall(stream, micOn, camOn, blurLevel);
  };

  const getInitials = (n: string) => {
    const p = n.trim().split(/\s+/);
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen cosmic-bg flex flex-col items-center justify-center p-4 md:p-8 selection:bg-accent selection:text-white">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* Left column: Camera Preview and joining options */}
        <div className="bg-panel border border-border-custom rounded-2xl p-6 shadow-2xl space-y-6">
          {/* Title Block */}
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-bold font-display text-white">Check your camera & mic</h2>
            <p className="text-xs text-text-dim">
              {isHost ? 'Starting this meeting. Invite others once you join.' : 'Joining room. Get ready.'}
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-panel-2 border border-border-custom text-[11px] font-mono font-bold text-accent">
              Code: {roomCode}
            </div>
          </div>

          {/* Blur Chips */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-text-faint uppercase tracking-wider text-center">Background styling</span>
            <div className="flex justify-center gap-2">
              {(['none', 'soft', 'strong'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setBlurLevel(level)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${blurLevel === level ? 'bg-accent/10 border-accent text-accent' : 'bg-panel-2 border-border-custom text-text-dim hover:border-text-faint'}`}
                >
                  {level === 'none' ? 'No blur' : level === 'soft' ? 'Soft blur' : 'Strong blur'}
                </button>
              ))}
            </div>
          </div>

          {/* Video Camera Preview Frame */}
          <div className="relative aspect-[16/10] bg-[#0c0d11] rounded-xl border border-border-custom overflow-hidden shadow-inner group flex items-center justify-center">
            {camOn && !permissionError ? (
              <video 
                ref={videoRef}
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full object-cover scale-x-[-1] transition-all ${blurLevel === 'soft' ? 'blur-[4px]' : blurLevel === 'strong' ? 'blur-[12px]' : ''}`}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-text-faint">
                <div className="w-16 h-16 rounded-full bg-panel-2 border border-border-custom flex items-center justify-center text-lg font-bold text-text-dim">
                  {selectedAvatar || getInitials(name)}
                </div>
                <span className="text-xs font-semibold">
                  {permissionError ? 'Permissions Blocked' : 'Camera is off'}
                </span>
              </div>
            )}

            {/* Quick Overlay status indicator for testing mic */}
            {micOn && camOn && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/50 backdrop-blur-[2px] border border-white/10 text-[9px] text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Mic active
              </div>
            )}

            {/* Frame Toggles */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3 z-10">
              <button
                onClick={() => setMicOn(!micOn)}
                className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-lg transition-all cursor-pointer ${micOn ? 'bg-panel/80 hover:bg-panel border-white/15 text-white' : 'bg-red-500 border-red-500 text-white'}`}
                aria-label={micOn ? "Mute mic" : "Unmute mic"}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setCamOn(!camOn)}
                className={`w-11 h-11 rounded-full border flex items-center justify-center shadow-lg transition-all cursor-pointer ${camOn ? 'bg-panel/80 hover:bg-panel border-white/15 text-white' : 'bg-red-500 border-red-500 text-white'}`}
                aria-label={camOn ? "Stop video" : "Start video"}
              >
                {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Callout if Permission Denied */}
          {permissionError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl p-3.5 leading-relaxed text-center">
              {permissionError}
            </div>
          )}

          {/* Main Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl bg-panel-2 border border-border-custom text-text-dim hover:text-white hover:border-text-faint font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={!!permissionError}
              className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-accent to-accent-2 hover:from-[#ff8c4d] hover:to-[#ff7043] text-[#1a0800] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-accent/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              Join meeting
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right column: Pre-flight interactive Diagnostics Check */}
        <div className="h-full">
          <JoinDiagnostics 
            onSelectAvatar={onSelectAvatar}
            selectedAvatar={selectedAvatar}
          />
        </div>

      </div>
    </div>
  );
}
