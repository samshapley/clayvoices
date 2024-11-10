const WebSocket = require('ws');
const mic = require('node-microphone');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');  // Add this with other imports
const Speaker = require('speaker');  // Add this import

require('dotenv').config();

// Replace the hardcoded API keys with environment variables
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.AGENT_ID;

const websocket_url = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;

let isPlaying = false;
let audioQueue = [];
let isMicrophoneMuted = false;
let micStream = null;

const config = {
  bufferThreshold: 2,      // Number of audio chunks to buffer before starting playback
  maxJitterBuffer: 6000,  // Maximum time to wait for more audio chunks before starting playback
  pingInterval: 2000,    // Interval to send ping messages to the server
  rttThreshold: 500     // Maximum acceptable round-trip time (RTT) in milliseconds
};

let audioBuffer = [];
let lastPingTime = 0;
let averageRTT = 0;

let ws = null;
let microphone = null;
let isConnected = false;
let currentContext = {};

// Initialize Web Audio API if in browser environment
let audioContext;
if (typeof window !== 'undefined') {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.error('Web Audio API is not supported in this environment');
    }
}

// Event Emitter to communicate with server.js
const EventEmitter = require('events');
class ConversationEmitter extends EventEmitter {}
const conversationEmitter = new ConversationEmitter();

function connectWebSocket(initialContext = {}) {
  currentContext = initialContext;

  ws = new WebSocket(websocket_url, {
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY
    }
  });

  ws.on('open', () => {
    console.log('Connected to ElevenLabs WebSocket');
    isConnected = true;
    startMicrophone();
    startPingInterval();

    // Send initial context if available
    if (Object.keys(currentContext).length > 0) {
      ws.send(JSON.stringify({
        type: 'context_update',
        data: currentContext
      }));
    }

    conversationEmitter.emit('connected');
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'context_update':
        currentContext = message.data;
        console.log('Context updated:', currentContext);
        break;
      case 'conversation_initiation_metadata':
        console.log('Conversation initiated:', message.conversation_initiation_metadata_event.conversation_id);
        break;
      case 'user_transcript':
        console.log('User transcript:', message.user_transcription_event.user_transcript);
        break;
      case 'agent_response':
        console.log('Agent response:', message.agent_response_event.agent_response);
        break;
      case 'audio':
        console.log(`Received audio chunk at ${Date.now()}`);
        muteMicrophone();
        playAudio(message.audio_event.audio_base_64);
        break;
      case 'interruption':
        console.log('Interruption received');
        break;
      case 'ping':
        handlePing(message.ping_event.event_id);
        break;
      case 'pong':
        handlePong(message.event_id);
        break;
      case 'internal_vad_score':
      case 'internal_turn_probability':
      case 'internal_tentative_agent_response':
      case 'agent_response_correction':
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  });

  ws.on('close', () => {
    console.log('Disconnected from ElevenLabs WebSocket');
    isConnected = false;
    if (microphone) {
      microphone.stopRecording();
    }
    conversationEmitter.emit('disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    isConnected = false;
    conversationEmitter.emit('error', error);
  });
}

function startMicrophone() {
  if (process.env.DISABLE_AUDIO) {
    console.log('Audio disabled - microphone not started');
    return;
  }
  try {
    microphone = new mic();

    micStream = microphone.startRecording({
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16
    });

    micStream.on('data', (data) => {
      if (!isMicrophoneMuted && !isPlaying && ws && ws.readyState === WebSocket.OPEN) {
        const base64Audio = data.toString('base64');
        ws.send(JSON.stringify({
          user_audio_chunk: base64Audio
        }));
      }
    });

    micStream.on('error', (error) => {
      console.error('Microphone stream error:', error);
      setTimeout(startMicrophone, 5000);
    });
  } catch (error) {
    console.error('Failed to start microphone:', error);
    console.log('Please ensure sox is installed on your system.');
    conversationEmitter.emit('error', error);
  }
}

async function playAudio(base64Audio) {
  audioBuffer.push({
    audio: base64Audio,
    timestamp: Date.now()
  });
  
  if (!isPlaying && audioBuffer.length >= config.bufferThreshold) {
    await processAudioBuffer();
  }
}

async function processAudioBuffer() {
  if (audioBuffer.length === 0) {
    console.log('Audio buffer empty. Exiting processAudioBuffer.');
    return;
  }

  isPlaying = true;

  const chunksToPlay = [...audioBuffer];
  audioBuffer = [];

  try {
    // Concatenate all audio chunks
    const allAudioData = Buffer.concat(
      chunksToPlay.map(item => Buffer.from(item.audio, 'base64'))
    );

    // If in browser environment, use Web Audio API
    if (typeof window !== 'undefined' && audioContext) {
      // Create an AudioBuffer from the raw PCM data
      const audioBuffer = audioContext.createBuffer(1, allAudioData.length / 2, 16000);
      const channelData = audioBuffer.getChannelData(0);
      
      // Convert the 16-bit PCM data to float32
      for (let i = 0; i < allAudioData.length / 2; i++) {
        channelData[i] = allAudioData.readInt16LE(i * 2) / 32768.0;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        isPlaying = false;
        unmuteMicrophone();
        
        if (audioBuffer.length > 0) {
          processAudioBuffer();
        }
      };

      source.start(0);
    } else {
      // Node.js environment - use Speaker
      const speaker = new Speaker({
        channels: 1,
        bitDepth: 16,
        sampleRate: 16000
      });

      speaker.on('close', () => {
        isPlaying = false;
        unmuteMicrophone();
        
        if (audioBuffer.length > 0) {
          processAudioBuffer();
        }
      });

      speaker.write(allAudioData);
      speaker.end();
    }
  } catch (error) {
    console.error('Failed to play audio:', error);
    isPlaying = false;
    unmuteMicrophone();
  }
}

function convertToWav(rawData) {
  // Create WAV header
  const wavHeader = Buffer.alloc(44);
  
  // RIFF chunk descriptor
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + rawData.length, 4);
  wavHeader.write('WAVE', 8);
  
  // fmt sub-chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (PCM)
  wavHeader.writeUInt16LE(1, 22); // NumChannels
  wavHeader.writeUInt32LE(16000, 24); // SampleRate
  wavHeader.writeUInt32LE(32000, 28); // ByteRate
  wavHeader.writeUInt16LE(2, 32); // BlockAlign
  wavHeader.writeUInt16LE(16, 34); // BitsPerSample
  
  // data sub-chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(rawData.length, 40);
  
  return Buffer.concat([wavHeader, rawData]);
}

function muteMicrophone() {
  isMicrophoneMuted = true;
}

function unmuteMicrophone() {
  isMicrophoneMuted = false;
}

function handlePing(eventId) {
  lastPingTime = Date.now();
  sendPong(eventId);
}

function handlePong(eventId) {
  const rtt = Date.now() - lastPingTime;
  averageRTT = averageRTT === 0 ? rtt : (averageRTT * 0.8 + rtt * 0.2);
  console.log(`Current RTT: ${rtt}ms, Average RTT: ${averageRTT}ms`);
}

function sendPong(eventId) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'pong',
      event_id: eventId
    }));
  }
}

function startPingInterval() {
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        event_id: Date.now().toString()
      }));
    }
  }, config.pingInterval);
}

function disconnect() {
  if (ws) {
    ws.close();
  }
}

module.exports = {
  connectWebSocket,
  disconnect,
  conversationEmitter,
  getCurrentContext: () => currentContext
};