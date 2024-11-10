import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';

// Global variables
const apiKey = import.meta.env.VITE_ANAM_API_KEY;
const DUMUZI_PERSONA_ID = '49dd9603-2e9c-4a1a-b1ce-a25f8d31e95d';
let anamClient = null;
let userStream = null;
let isVideoEnabled = true;
let isAudioEnabled = true;
let currentStreamingMessage = null;
let currentStreamContent = '';

function addMessageToLog(role, content, isStreaming = false) {
    const messageLog = document.getElementById('messageLog');
    
    if (isStreaming && currentStreamingMessage) {
        // Update existing streaming message
        const contentDiv = currentStreamingMessage.querySelector('.message-content');
        contentDiv.textContent = content;
        messageLog.scrollTop = messageLog.scrollHeight;
        return;
    }

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

    if (isStreaming) {
        currentStreamingMessage = messageDiv;
    }
}

function finalizeStreamingMessage() {
    currentStreamingMessage = null;
}

async function setupUserMedia() {
    try {
        userStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        const userVideo = document.getElementById('user-video');
        userVideo.srcObject = userStream;
        
        document.getElementById('toggleVideo').classList.remove('muted');
        document.getElementById('toggleAudio').classList.remove('muted');
        
        return userStream;
    } catch (error) {
        console.error('Error accessing user media:', error);
        addMessageToLog('ai', 'Unable to access camera or microphone. Please check permissions.');
        throw error;
    }
}

async function initializeAnamClient() {
    try {
        anamClient = unsafe_createClientWithApiKey(apiKey, {
            personaId: DUMUZI_PERSONA_ID,
        });

        // Add all listeners after client creation
        anamClient.addListener('CONNECTION_ESTABLISHED', () => {
            console.log('Connected to Anam AI');
        });

        anamClient.addListener('MESSAGE_HISTORY_UPDATED', (messages) => {
            if (!currentStreamingMessage) {
                document.getElementById('messageLog').innerHTML = '';
                messages.forEach(msg => {
                    addMessageToLog(
                        msg.role === 'assistant' ? 'ai' : 'human',
                        msg.content
                    );
                });
            }
        });

        anamClient.addListener('MESSAGE_STREAM_EVENT_RECEIVED', (message) => {
            if (message.type === 'transcript') {
                if (message.role === 'human') {
                    addMessageToLog('human', message.content);
                } else if (message.role === 'assistant') {
                    if (!message.isPartial) {
                        // Complete message
                        currentStreamContent = message.content;
                        addMessageToLog('ai', currentStreamContent);
                        currentStreamContent = '';
                        finalizeStreamingMessage();
                    } else {
                        // Partial message - append and update
                        currentStreamContent = message.content;
                        addMessageToLog('ai', currentStreamContent, true);
                    }
                }
            }
        });

        console.log('Anam client initialized with Dumuzi-Abzu');
        return true;

    } catch (error) {
        console.error('Error initializing Anam client:', error);
        addMessageToLog('ai', `Error: ${error.message}`);
        return false;
    }
}

// Event Listeners
document.getElementById('toggleVideo')?.addEventListener('click', () => {
    if (userStream) {
        const videoTrack = userStream.getVideoTracks()[0];
        if (videoTrack) {
            isVideoEnabled = !isVideoEnabled;
            videoTrack.enabled = isVideoEnabled;
            document.getElementById('toggleVideo').classList.toggle('muted', !isVideoEnabled);
        }
    }
});

document.getElementById('toggleAudio')?.addEventListener('click', () => {
    if (userStream) {
        const audioTrack = userStream.getAudioTracks()[0];
        if (audioTrack) {
            isAudioEnabled = !isAudioEnabled;
            audioTrack.enabled = isAudioEnabled;
            document.getElementById('toggleAudio').classList.toggle('muted', !isAudioEnabled);
        }
    }
});

document.getElementById('startButton').addEventListener('click', async () => {
    try {
        const stream = await setupUserMedia();
        
        if (!anamClient) {
            const initialized = await initializeAnamClient();
            if (!initialized) {
                throw new Error('Failed to initialize Anam client');
            }
        }

        console.log('Starting stream...');
        await anamClient.streamToVideoAndAudioElements(
            'video-element-id',
            'audio-element-id',
            stream
        );
        console.log('Stream started successfully');
        
        // Show stream status
        const streamStatus = document.getElementById('streamStatus');
        streamStatus.style.display = 'flex';
    } catch (error) {
        console.error('Error in start button handler:', error);
        addMessageToLog('ai', `Error: ${error.message}`);
    }
});

document.getElementById('stopButton').addEventListener('click', () => {
    if (anamClient) {
        anamClient.stopStreaming();
    }
    
    if (userStream) {
        userStream.getTracks().forEach(track => track.stop());
        userStream = null;
        document.getElementById('user-video').srcObject = null;
    }
    
    // Hide stream status
    const streamStatus = document.getElementById('streamStatus');
    streamStatus.style.display = 'none';
});

window.addEventListener('beforeunload', () => {
    if (userStream) {
        userStream.getTracks().forEach(track => track.stop());
    }
});