const WebSocket = require('ws');
const mic = require('node-microphone');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);
const player = require('node-wav-player');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
  
  // Wait for a few chunks before starting playback
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

  // Take only the current chunks, leaving new incoming chunks for the next play
  const chunksToPlay = [...audioBuffer];
  audioBuffer = [];

  // Create a single concatenated audio file from multiple chunks
  const tempConcatFile = path.join(os.tmpdir(), `concat-${Date.now()}.raw`);
  const tempOutputFile = path.join(os.tmpdir(), `output-${Date.now()}.wav`);

  try {
    // Sort and concatenate chunks to play
    chunksToPlay.sort((a, b) => a.timestamp - b.timestamp);
    const allAudioData = Buffer.concat(
      chunksToPlay.map(item => Buffer.from(item.audio, 'base64'))
    );
    fs.writeFileSync(tempConcatFile, allAudioData);

    // Start converting next batch while current one is playing
    const conversionPromise = new Promise((resolve, reject) => {
      ffmpeg()
        .input(tempConcatFile)
        .inputFormat('s16le')
        .inputOptions(['-ar 16000', '-ac 1'])
        .outputOptions(['-ar 16000', '-ac 1'])
        .toFormat('wav')
        .on('error', reject)
        .on('end', resolve)
        .save(tempOutputFile);
    });

    await conversionPromise;

    // Play the concatenated audio file
    await player.play({
      path: tempOutputFile,
      sync: true
    });

    // Cleanup temp files
    fs.unlinkSync(tempConcatFile);
    fs.unlinkSync(tempOutputFile);

  } catch (error) {
    console.error('Failed to play audio:', error);
  }

  isPlaying = false;
  unmuteMicrophone();

  // If more audio arrived while playing, process it immediately
  if (audioBuffer.length > 0) {
    await processAudioBuffer();
  }
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

// Export the currentContext
module.exports = {
  connectWebSocket,
  disconnect,
  conversationEmitter,
  getCurrentContext: () => currentContext
};