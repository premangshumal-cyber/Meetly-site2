/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Participant {
  id: string;
  name: string;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  stream?: MediaStream | null;
  isHost?: boolean;
  isSpeaking?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
  own?: boolean;
}

export interface Recording {
  name: string;
  url: string;
  size: number;
  duration: number;
}

export interface Poll {
  id: string;
  question: string;
  options: {
    text: string;
    votes: number;
    voters: string[];
  }[];
  isOpen: boolean;
}
