/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Peer } from 'peerjs';
import { Participant, Message, Recording } from './types';
import LandingPage from './components/LandingPage';
import PrecheckPage from './components/PrecheckPage';
import CallScreen from './components/CallScreen';

export default function App() {
  // Navigation states
  const [screen, setScreen] = useState<'landing' | 'precheck' | 'waiting' | 'call'>('landing');
  
  // User Profile
  const [name, setName] = useState('Prem');
  const [selectedAvatar, setSelectedAvatar] = useState('👨‍💼');
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);

  // Streams & States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [blurLevel, setBlurLevel] = useState<'none' | 'soft' | 'strong'>('none');
  const [myId, setMyId] = useState('');

  // Mesh Network states
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingAdmissions, setPendingAdmissions] = useState<{ id: string; name: string; conn: any }[]>([]);
  const [myHandRaised, setMyHandRaised] = useState(false);
  const [wbStrokes, setWbStrokes] = useState<any[]>([]);

  // Refs for PeerJS instances and active data connections
  const peerInstanceRef = useRef<Peer | null>(null);
  const connectionsMapRef = useRef<Map<string, any>>(new Map()); // peerId -> connection
  const callsMapRef = useRef<Map<string, any>>(new Map()); // peerId -> call
  // PeerJS event callbacks outlive individual React renders. Keep live state in refs.
  const localStreamRef = useRef<MediaStream | null>(null);
  const myIdRef = useRef('');
  const participantsRef = useRef<Participant[]>([]);
  const micOnRef = useRef(true);
  const requireApprovalRef = useRef(false);
  const allowedPeersRef = useRef<Set<string>>(new Set());

  useEffect(() => { participantsRef.current = participants; }, [participants]);

  // Parse room code from query URL on startup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomCode(room);
    }
  }, []);

  // Update room code query parameter safely
  const updateUrlRoomCode = (code: string) => {
    const url = new URL(window.location.href);
    if (code) {
      url.searchParams.set('room', code);
    } else {
      url.searchParams.delete('room');
    }
    window.history.replaceState({}, '', url.toString());
  };

  const handleStartMeeting = (userName: string, approvalNeeded: boolean) => {
    setName(userName);
    setIsHost(true);
    setRequireApproval(approvalNeeded);
    requireApprovalRef.current = approvalNeeded;
    
    // Unpredictable 12-character room ID reduces room guessing and collisions.
    const randomBytes = crypto.getRandomValues(new Uint8Array(6));
    const randomCode = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
    setRoomCode(randomCode);
    updateUrlRoomCode(randomCode);
    
    setScreen('precheck');
  };

  const handleJoinMeeting = (userName: string, code: string) => {
    setName(userName);
    setIsHost(false);
    setRoomCode(code);
    updateUrlRoomCode(code);
    
    setScreen('precheck');
  };

  const handleCancelPrecheck = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setScreen('landing');
    updateUrlRoomCode('');
  };

  // Main join room orchestration (starts PeerJS WebRTC connections)
  const handleJoinCall = (stream: MediaStream | null, micActive: boolean, camActive: boolean, level: 'none' | 'soft' | 'strong') => {
    localStreamRef.current = stream;
    micOnRef.current = micActive;
    setLocalStream(stream);
    setMicOn(micActive);
    setCamOn(camActive);
    setBlurLevel(level);

    if (isHost) {
      // Connect as the authoritative meeting room host
      initializeHostPeer();
    } else {
      // Connect as a guest and send admission request to host
      initializeGuestPeer();
    }
  };

  // Initialize Host connection
  const initializeHostPeer = () => {
    const hostPeerId = `meetly-${roomCode}-host`;
    myIdRef.current = hostPeerId;
    setMyId(hostPeerId);

    const p = new Peer(hostPeerId, { debug: 1 });
    peerInstanceRef.current = p;

    p.on('open', () => {
      setScreen('call');
      appendSystemMessage('You opened the meeting room. Waiting for others to join...');
    });

    p.on('connection', (conn) => {
      handleIncomingHostDataConnection(conn);
    });

    p.on('call', (call) => {
      answerIncomingCall(call);
    });

    p.on('error', (err) => {
      console.error('Host peer error:', err);
      if (err.type === 'unavailable-id') {
        alert('This room is already hosted in another window/tab. Please enter a different code or host in a different tab.');
        handleLeaveCall();
      }
    });
  };

  // Initialize Guest connection
  const initializeGuestPeer = () => {
    const p = new Peer(undefined, { debug: 1 });
    peerInstanceRef.current = p;

    p.on('open', (id) => {
      myIdRef.current = id;
      setMyId(id);
      setScreen('waiting');
      
      // Connect to the host peer to request permission to join
      const hostId = `meetly-${roomCode}-host`;
      const conn = p.connect(hostId, { reliable: true });
      connectionsMapRef.current.set(hostId, conn);
      allowedPeersRef.current = new Set([hostId]);

      conn.on('open', () => {
        conn.send({ type: 'join-request', name: name, id: id });
      });

      conn.on('data', (data: any) => {
        if (data && data.type) {
          if (data.type === 'waiting') {
            setScreen('waiting');
          } else if (data.type === 'denied') {
            alert('The host denied your request to join.');
            handleLeaveCall();
          } else if (data.type === 'admitted') {
            if (Array.isArray(data.roster)) {
              allowedPeersRef.current = new Set([hostId, ...data.roster
                .filter((entry: any) => typeof entry?.id === 'string')
                .map((entry: any) => entry.id)]);
            }
            setScreen('call');
            appendSystemMessage('You joined the meeting!');
            
            // Connect to other existing peers in the room
            if (data.roster && data.roster.length > 0) {
              data.roster.forEach((peer: { id: string; name: string }) => {
                if (peer.id !== id) {
                  connectToPeerInMesh(peer.id, peer.name);
                }
              });
            }
          } else {
            routeIncomingMessage(conn.peer, data);
          }
        }
      });

      conn.on('close', () => {
        appendSystemMessage('Host connection was closed.');
      });
    });

    p.on('connection', (conn) => {
      // Only admit mesh connections from members listed by the room host.
      if (!allowedPeersRef.current.has(conn.peer)) {
        conn.on('open', () => conn.close());
        return;
      }
      connectionsMapRef.current.set(conn.peer, conn);
      conn.on('open', () => conn.send({ type: 'hello', name }));
      conn.on('data', (data: any) => routeIncomingMessage(conn.peer, data));
      conn.on('close', () => removeParticipant(conn.peer));
    });

    p.on('call', (call) => {
      answerIncomingCall(call);
    });

    p.on('error', (err) => {
      console.error('Guest peer error:', err);
      if (err.type === 'peer-unavailable') {
        alert('This meeting has not been started by the host yet. Please wait for the host to start it first.');
        handleLeaveCall();
      }
    });
  };

  // Connect to another peer in fanned-out WebRTC mesh
  const connectToPeerInMesh = (peerId: string, peerName: string) => {
    if (peerId === myIdRef.current || connectionsMapRef.current.has(peerId)) return;

    const p = peerInstanceRef.current;
    if (!p) return;

    const conn = p.connect(peerId, { reliable: true });
    connectionsMapRef.current.set(peerId, conn);

    conn.on('open', () => {
      conn.send({ type: 'hello', name: name });
      
      // Ring the call immediately
      initiateVideoCallToPeer(peerId, peerName);
    });

    conn.on('data', (data: any) => {
      routeIncomingMessage(peerId, data);
    });

    conn.on('close', () => {
      removeParticipant(peerId);
    });
  };

  // Ring peer for media streaming
  const initiateVideoCallToPeer = (peerId: string, peerName: string) => {
    const p = peerInstanceRef.current;
    if (!p) return;

    const call = p.call(peerId, localStreamRef.current || new MediaStream());
    callsMapRef.current.set(peerId, call);

    call.on('stream', (remoteStream) => {
      addOrUpdateParticipant(peerId, {
        id: peerId,
        name: peerName,
        micOn: true,
        camOn: true,
        handRaised: false,
        stream: remoteStream
      });
    });

    call.on('close', () => {
      removeParticipant(peerId);
    });
  };

  // Answer incoming video streaming ring
  const answerIncomingCall = (call: any) => {
    // A waiting guest must not be able to bypass the host's admission decision.
    if (!connectionsMapRef.current.has(call.peer) ||
        (!isHost && !allowedPeersRef.current.has(call.peer))) {
      call.close();
      return;
    }
    call.answer(localStreamRef.current || new MediaStream());
    callsMapRef.current.set(call.peer, call);

    call.on('stream', (remoteStream: MediaStream) => {
      addOrUpdateParticipant(call.peer, {
        id: call.peer,
        name: 'Guest',
        micOn: true,
        camOn: true,
        handRaised: false,
        stream: remoteStream
      });
    });

    call.on('close', () => {
      removeParticipant(call.peer);
    });
  };

  // Handle incoming admission triggers on host connection
  const handleIncomingHostDataConnection = (conn: any) => {
    conn.on('data', (data: any) => {
      if (data && data.type === 'join-request') {
        if (requireApprovalRef.current) {
          // Put in waiting list
          setPendingAdmissions(prev => [...prev, { id: conn.peer, name: data.name, conn }]);
          conn.send({ type: 'waiting' });
        } else {
          // Auto admit
          admitPendingGuest(conn.peer, data.name, conn);
        }
      } else if (connectionsMapRef.current.get(conn.peer) === conn) {
        // Ignore all non-admission data from guests still in the waiting room.
        routeIncomingMessage(conn.peer, data);
      }
    });

    conn.on('close', () => {
      setPendingAdmissions(prev => prev.filter(p => p.id !== conn.peer));
      removeParticipant(conn.peer);
    });
  };

  const admitPendingGuest = (peerId: string, guestName: string, conn: any) => {
    connectionsMapRef.current.set(peerId, conn);

    // Broadcast current roster list to let guest connect to mesh
    const roster = [
      { id: myIdRef.current, name },
      ...participantsRef.current.map(p => ({ id: p.id, name: p.name }))
    ];

    conn.send({ type: 'admitted', roster });

    // Host calls the guest back
    addOrUpdateParticipant(peerId, {
      id: peerId,
      name: guestName,
      micOn: true,
      camOn: true,
      handRaised: false
    });

    setTimeout(() => {
      initiateVideoCallToPeer(peerId, guestName);
      broadcastRosterUpdate();
    }, 800);
  };

  const broadcastRosterUpdate = () => {
    const roster = [
      { id: myIdRef.current, name },
      ...participantsRef.current.map(p => ({ id: p.id, name: p.name }))
    ];

    connectionsMapRef.current.forEach(conn => {
      if (conn.open) {
        conn.send({ type: 'roster-update', roster });
      }
    });
  };

  const handleAdmit = (peerId: string) => {
    const entry = pendingAdmissions.find(p => p.id === peerId);
    if (!entry) return;

    setPendingAdmissions(prev => prev.filter(p => p.id !== peerId));
    admitPendingGuest(peerId, entry.name, entry.conn);
  };

  const handleDeny = (peerId: string) => {
    const entry = pendingAdmissions.find(p => p.id === peerId);
    if (!entry) return;

    setPendingAdmissions(prev => prev.filter(p => p.id !== peerId));
    try {
      entry.conn.send({ type: 'denied' });
      entry.conn.close();
    } catch (e) {}
  };

  // Route incoming PeerJS data channels message events
  const routeIncomingMessage = (fromPeerId: string, data: any) => {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'hello':
        updateParticipantField(fromPeerId, 'name', data.name);
        break;
      case 'mic':
        updateParticipantField(fromPeerId, 'micOn', data.on);
        break;
      case 'cam':
        updateParticipantField(fromPeerId, 'camOn', data.on);
        break;
      case 'hand':
        updateParticipantField(fromPeerId, 'handRaised', data.on);
        break;
      case 'chat':
        appendUserMessage(fromPeerId, data.text);
        break;
      case 'reaction':
        // Bubble reaction custom trigger to CallScreen visual overlays
        window.dispatchEvent(new CustomEvent('remote-reaction', { detail: { peerId: fromPeerId, emoji: data.emoji } }));
        break;
      case 'caption':
        window.dispatchEvent(new CustomEvent('remote-caption', { detail: { name: getParticipantName(fromPeerId), text: data.text, final: data.final, peerId: fromPeerId } }));
        break;
      case 'wb-stroke':
        setWbStrokes(prev => [...prev, data.stroke]);
        break;
      case 'wb-clear':
        setWbStrokes([]);
        break;
      case 'code-sync':
        window.dispatchEvent(new CustomEvent('remote-code-sync', { detail: { code: data.code, language: data.language } }));
        break;
      case 'notes-sync':
        window.dispatchEvent(new CustomEvent('remote-notes-sync', { detail: { notes: data.notes } }));
        break;
      case 'poll-sync':
        window.dispatchEvent(new CustomEvent('remote-poll-sync', { detail: { poll: data.poll } }));
        break;
      case 'mute-request':
        if (!isHost && fromPeerId === `meetly-${roomCode}-host` && micOnRef.current) {
          micOnRef.current = false;
          setMicOn(false);
          localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = false; });
          broadcastToAll({ type: 'mic', on: false });
          alert('The meeting host muted your microphone.');
        }
        break;
      case 'remove-request':
        if (!isHost && fromPeerId === `meetly-${roomCode}-host`) {
          alert('You were removed from the meeting by the host.');
          handleLeaveCall();
        }
        break;
      case 'bye':
        removeParticipant(fromPeerId);
        break;
      case 'roster-update':
        // Guest connects to other peers
        if (!isHost && fromPeerId === `meetly-${roomCode}-host` && Array.isArray(data.roster)) {
          data.roster.forEach((p: { id: string; name: string }) => {
            if (typeof p.id !== 'string' || typeof p.name !== 'string') return;
            allowedPeersRef.current.add(p.id);
            if (p.id !== myId && !connectionsMapRef.current.has(p.id)) {
              connectToPeerInMesh(p.id, p.name);
            }
          });
        }
        break;
    }
  };

  const getParticipantName = (id: string) => {
    const found = participants.find(p => p.id === id);
    return found ? found.name : 'Someone';
  };

  const addOrUpdateParticipant = (id: string, initialObj: Participant) => {
    setParticipants(prev => {
      const idx = prev.findIndex(p => p.id === id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...initialObj };
        return updated;
      }
      return [...prev, initialObj];
    });
  };

  const updateParticipantField = (id: string, field: keyof Participant, value: any) => {
    setParticipants(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
    
    // Clear refs
    const conn = connectionsMapRef.current.get(id);
    if (conn) {
      try { conn.close(); } catch (e) {}
      connectionsMapRef.current.delete(id);
    }
    const call = callsMapRef.current.get(id);
    if (call) {
      try { call.close(); } catch (e) {}
      callsMapRef.current.delete(id);
    }
  };

  const handleLeaveCall = () => {
    // Send bye message to connections
    broadcastToAll({ type: 'bye' });

    // Clean connections refs
    connectionsMapRef.current.forEach(conn => {
      try { conn.close(); } catch (e) {}
    });
    connectionsMapRef.current.clear();

    callsMapRef.current.forEach(call => {
      try { call.close(); } catch (e) {}
    });
    callsMapRef.current.clear();

    if (peerInstanceRef.current) {
      try { peerInstanceRef.current.destroy(); } catch (e) {}
      peerInstanceRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Reset state
    setParticipants([]);
    participantsRef.current = [];
    myIdRef.current = '';
    micOnRef.current = true;
    allowedPeersRef.current.clear();
    localStreamRef.current = null;
    setMessages([]);
    setPendingAdmissions([]);
    setWbStrokes([]);
    setMyHandRaised(false);
    
    setScreen('landing');
    updateUrlRoomCode('');
  };

  const broadcastToAll = (msg: any) => {
    connectionsMapRef.current.forEach(conn => {
      if (conn.open) {
        try { conn.send(msg); } catch (e) {}
      }
    });
  };

  const handleSendMessageLocal = (text: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: Math.random().toString(),
      senderId: myId,
      senderName: name,
      text,
      timestamp: timeStr,
      own: true
    };
    setMessages(prev => [...prev, newMsg]);

    // Send to other mesh peers
    broadcastToAll({ type: 'chat', text });
  };

  const appendUserMessage = (senderId: string, text: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderName = getParticipantName(senderId);
    const newMsg: Message = {
      id: Math.random().toString(),
      senderId,
      senderName,
      text,
      timestamp: timeStr,
      own: false
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const appendSystemMessage = (text: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: Math.random().toString(),
      senderId: 'system',
      senderName: 'System',
      text,
      timestamp: timeStr,
      isSystem: true
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleToggleMic = () => {
    const nextVal = !micOnRef.current;
    micOnRef.current = nextVal;
    setMicOn(nextVal);
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = nextVal;
      });
    }
    broadcastToAll({ type: 'mic', on: nextVal });
  };

  const handleToggleCam = () => {
    const nextVal = !camOn;
    setCamOn(nextVal);
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = nextVal;
      });
    }
    broadcastToAll({ type: 'cam', on: nextVal });
  };

  const handleToggleHand = () => {
    const nextVal = !myHandRaised;
    setMyHandRaised(nextVal);
    broadcastToAll({ type: 'hand', on: nextVal });
  };

  const handleMutePeer = (peerId: string) => {
    const conn = connectionsMapRef.current.get(peerId);
    if (conn && conn.open) {
      conn.send({ type: 'mute-request' });
    }
  };

  const handleRemovePeer = (peerId: string) => {
    const conn = connectionsMapRef.current.get(peerId);
    if (conn && conn.open) {
      conn.send({ type: 'remove-request' });
    }
    removeParticipant(peerId);
  };

  const handleSendReaction = (emoji: string) => {
    broadcastToAll({ type: 'reaction', emoji });
  };

  const handleSendWbStroke = (stroke: any) => {
    broadcastToAll({ type: 'wb-stroke', stroke });
  };

  const handleSendWbClear = () => {
    broadcastToAll({ type: 'wb-clear' });
  };

  const handleToggleWaitingRoom = (enabled: boolean) => {
    requireApprovalRef.current = enabled;
    setRequireApproval(enabled);
  };

  return (
    <>
      {screen === 'landing' && (
        <LandingPage 
          onStartMeeting={handleStartMeeting}
          onJoinMeeting={handleJoinMeeting}
          initialRoomCode={roomCode}
        />
      )}

      {screen === 'precheck' && (
        <PrecheckPage 
          name={name}
          roomCode={roomCode}
          isHost={isHost}
          onJoinCall={handleJoinCall}
          onCancel={handleCancelPrecheck}
          onSelectAvatar={setSelectedAvatar}
          selectedAvatar={selectedAvatar}
        />
      )}

      {screen === 'waiting' && (
        <div className="min-h-screen cosmic-bg flex flex-col items-center justify-center text-center p-6 select-none">
          <div className="w-12 h-12 rounded-full border-4 border-accent-dim border-t-accent animate-spin mb-6" />
          <h2 className="text-xl font-bold font-display text-white mb-2">Waiting for the host to let you in...</h2>
          <p className="text-xs text-text-dim max-w-xs leading-relaxed">
            Sit tight — you'll connect automatically once admitted to the room by the host.
          </p>
        </div>
      )}

      {screen === 'call' && (
        <CallScreen 
          name={name}
          roomCode={roomCode}
          isHost={isHost}
          localStream={localStream}
          initialMicOn={micOn}
          initialCamOn={camOn}
          initialBlurLevel={blurLevel}
          participants={participants}
          messages={messages}
          pendingAdmissions={pendingAdmissions}
          myId={myId}
          onAdmit={handleAdmit}
          onDeny={handleDeny}
          onLeave={handleLeaveCall}
          onSendMessage={handleSendMessageLocal}
          onToggleMic={handleToggleMic}
          onToggleCam={handleToggleCam}
          onToggleHand={handleToggleHand}
          onMutePeer={handleMutePeer}
          onRemovePeer={handleRemovePeer}
          onSendReaction={handleSendReaction}
          onSendWbStroke={handleSendWbStroke}
          onSendWbClear={handleSendWbClear}
          onToggleWaitingRoom={handleToggleWaitingRoom}
          onUpdateName={setName}
          wbStrokes={wbStrokes}
          onAddLocalWbStroke={(stroke) => setWbStrokes(prev => [...prev, stroke])}
          onClearLocalWb={() => setWbStrokes([])}
          myHandRaised={myHandRaised}
          onBroadcast={broadcastToAll}
        />
      )}
    </>
  );
}
