// src/services/anamService.js
import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';

const DUMUZI_PERSONA_ID = '49dd9603-2e9c-4a1a-b1ce-a25f8d31e95d';

export class AnamService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.client = null;
        this.messageHandlers = new Set();
    }

    addMessageHandler(handler) {
        this.messageHandlers.add(handler);
    }

    removeMessageHandler(handler) {
        this.messageHandlers.delete(handler);
    }

    async initialize() {
        try {
            this.client = unsafe_createClientWithApiKey(this.apiKey, {
                personaId: DUMUZI_PERSONA_ID,
            });

            this.client.addListener('CONNECTION_ESTABLISHED', () => {
                console.log('Connected to Anam AI');
            });

            this.client.addListener('MESSAGE_HISTORY_UPDATED', (messages) => {
                this.messageHandlers.forEach(handler => handler(messages));
            });

            this.client.addListener('MESSAGE_STREAM_EVENT_RECEIVED', (message) => {
                this.messageHandlers.forEach(handler => handler(message));
            });

            return true;
        } catch (error) {
            console.error('Error initializing Anam client:', error);
            throw error;
        }
    }

    async startStream(videoElementId, audioElementId, mediaStream) {
        if (!this.client) throw new Error('Client not initialized');
        await this.client.streamToVideoAndAudioElements(
            videoElementId,
            audioElementId,
            mediaStream
        );
    }

    stopStream() {
        if (this.client) {
            this.client.stopStreaming();
        }
    }
}

// src/utils/mediaUtils.js
export async function setupUserMedia() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        return stream;
    } catch (error) {
        console.error('Error accessing user media:', error);
        throw error;
    }
}

// src/components/avatar/Controls.js
export function Controls({ onStart, onStop, isStreaming }) {
    return `
        <div class="controls">
            <button id="startButton" class="button button-start" ${isStreaming ? 'disabled' : ''}>
                Start Conversation
            </button>
            <button id="stopButton" class="button button-stop" ${!isStreaming ? 'disabled' : ''}>
                Stop Conversation
            </button>
        </div>
    `;
}

// src/components/avatar/AvatarVideo.js
export function AvatarVideo() {
    return `
        <div class="video-panel">
            <div class="main-video-container">
                <video id="video-element-id" autoplay playsinline></video>
                <audio id="audio-element-id" autoplay></audio>
                <div class="stream-status" id="streamStatus" style="display: none;">
                    <span class="status-indicator status-live"></span>
                    Live
                </div>
            </div>
            <div class="user-video-container">
                <video id="user-video" autoplay playsinline muted></video>
                <div class="video-controls">
                    <button id="toggleVideo" class="control-button">
                        <span class="control-icon">📷</span>
                    </button>
                    <button id="toggleAudio" class="control-button">
                        <span class="control-icon">🎤</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// src/components/avatar/ChatLog.js
export function ChatLog() {
    return `
        <div class="conversation-log">
            <div class="conversation-header">
                Conversation History
            </div>
            <div class="messages-container" id="messageLog"></div>
        </div>
    `;
}

// src/components/avatar/Avatar.js
import { AnamService } from '../../services/anamService';
import { setupUserMedia } from '../../utils/mediaUtils';
import { Controls } from './Controls';
import { AvatarVideo } from './AvatarVideo';
import { ChatLog } from './ChatLog';

export class Avatar {
    constructor(containerId, apiKey) {
        this.container = document.getElementById(containerId);
        this.anamService = new AnamService(apiKey);
        this.userStream = null;
        this.isStreaming = false;
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="avatar-container">
                ${AvatarVideo()}
                <div class="right-panel">
                    ${Controls({ isStreaming: this.isStreaming })}
                    ${ChatLog()}
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        const startButton = this.container.querySelector('#startButton');
        const stopButton = this.container.querySelector('#stopButton');
        const toggleVideo = this.container.querySelector('#toggleVideo');
        const toggleAudio = this.container.querySelector('#toggleAudio');

        startButton.addEventListener('click', () => this.startConversation());
        stopButton.addEventListener('click', () => this.stopConversation());
        toggleVideo.addEventListener('click', () => this.toggleVideo());
        toggleAudio.addEventListener('click', () => this.toggleAudio());
    }

    async startConversation() {
        try {
            this.userStream = await setupUserMedia();
            const userVideo = this.container.querySelector('#user-video');
            userVideo.srcObject = this.userStream;

            await this.anamService.initialize();
            await this.anamService.startStream(
                'video-element-id',
                'audio-element-id',
                this.userStream
            );

            this.isStreaming = true;
            this.container.querySelector('#streamStatus').style.display = 'flex';
            this.updateControlsState();
        } catch (error) {
            console.error('Error starting conversation:', error);
            this.addMessage('ai', `Error: ${error.message}`);
        }
    }

    stopConversation() {
        this.anamService.stopStream();
        
        if (this.userStream) {
            this.userStream.getTracks().forEach(track => track.stop());
            this.userStream = null;
            this.container.querySelector('#user-video').srcObject = null;
        }

        this.isStreaming = false;
        this.container.querySelector('#streamStatus').style.display = 'none';
        this.updateControlsState();
    }

    toggleVideo() {
        if (this.userStream) {
            const videoTrack = this.userStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.container.querySelector('#toggleVideo')
                    .classList.toggle('muted', !videoTrack.enabled);
            }
        }
    }

    toggleAudio() {
        if (this.userStream) {
            const audioTrack = this.userStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.container.querySelector('#toggleAudio')
                    .classList.toggle('muted', !audioTrack.enabled);
            }
        }
    }

    updateControlsState() {
        const startButton = this.container.querySelector('#startButton');
        const stopButton = this.container.querySelector('#stopButton');
        
        startButton.disabled = this.isStreaming;
        stopButton.disabled = !this.isStreaming;
        
        startButton.classList.toggle('disabled', this.isStreaming);
        stopButton.classList.toggle('disabled', !this.isStreaming);
    }

    addMessage(role, content, isStreaming = false) {
        const messageLog = this.container.querySelector('#messageLog');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role.toLowerCase()}`;
        
        const header = document.createElement('div');
        header.className = 'message-header';
        header.textContent = role === 'ai' ? 'Dumuzi-Abzu' : 'You';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(header);
        messageDiv.appendChild(contentDiv);
        messageLog.appendChild(messageDiv);
        messageLog.scrollTop = messageLog.scrollHeight;
    }
}

// src/components/avatar/index.js
export { Avatar } from './Avatar';