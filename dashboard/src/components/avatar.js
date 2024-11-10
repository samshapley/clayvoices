// File: /src/components/avatar.js
export class AvatarManager {
    constructor() {
        console.log('Initializing AvatarManager');
        this.apiKey = import.meta.env.VITE_ANAM_API_KEY;
        this.DUMUZI_PERSONA_ID = '49dd9603-2e9c-4a1a-b1ce-a25f8d31e95d';
        this.anamClient = null;
        this.userStream = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.currentStreamingMessage = null;
        this.currentStreamContent = '';
        
        if (!this.apiKey) {
            console.error('VITE_ANAM_API_KEY not found in environment variables');
        }

        if (!this.apiKey) {
            this.debug('ERROR: VITE_ANAM_API_KEY not found in environment variables', true);
        } else {
            this.debug('API Key found');
        }
        
        // Bind methods
        this.addMessageToLog = this.addMessageToLog.bind(this);
        this.setupUserMedia = this.setupUserMedia.bind(this);
        this.initializeAnamClient = this.initializeAnamClient.bind(this);
        this.handleStartConversation = this.handleStartConversation.bind(this);
        this.handleStopConversation = this.handleStopConversation.bind(this);
        this.toggleVideo = this.toggleVideo.bind(this);
        this.toggleAudio = this.toggleAudio.bind(this);
    }

    addMessageToLog(role, content, isStreaming = false) {
        console.log(`Adding message to log - Role: ${role}, Streaming: ${isStreaming}`);
        const messageLog = document.getElementById('messageLog');
        if (!messageLog) {
            console.error('Message log element not found');
            return;
        }
        
        if (isStreaming && this.currentStreamingMessage) {
            const contentDiv = this.currentStreamingMessage.querySelector('.message-content');
            if (contentDiv) {
                contentDiv.textContent = content;
                messageLog.scrollTop = messageLog.scrollHeight;
            } else {
                console.error('Content div not found in streaming message');
            }
            return;
        }

        try {
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
                this.currentStreamingMessage = messageDiv;
            }
        } catch (error) {
            console.error('Error adding message to log:', error);
        }
    }

    async setupUserMedia() {
        console.log('Setting up user media...');
        try {
            this.userStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            console.log('User media stream obtained:', this.userStream.getTracks().map(track => ({
                kind: track.kind,
                enabled: track.enabled,
                muted: track.muted
            })));
            
            const userVideo = document.getElementById('user-video');
            if (!userVideo) {
                throw new Error('User video element not found');
            }
            
            userVideo.srcObject = this.userStream;
            
            const toggleVideo = document.getElementById('toggleVideo');
            const toggleAudio = document.getElementById('toggleAudio');
            
            if (toggleVideo) toggleVideo.classList.remove('muted');
            if (toggleAudio) toggleAudio.classList.remove('muted');
            
            return this.userStream;
        } catch (error) {
            console.error('Error accessing user media:', error);
            this.addMessageToLog('ai', `Error accessing camera/microphone: ${error.message}`);
            throw error;
        }
    }

    async initializeAnamClient() {
        console.log('Initializing Anam client...');
        try {
            const { unsafe_createClientWithApiKey } = await import('@anam-ai/js-sdk');
            if (!unsafe_createClientWithApiKey) {
                throw new Error('Failed to import Anam SDK');
            }

            if (!this.apiKey) {
                throw new Error('API key not found');
            }

            this.anamClient = unsafe_createClientWithApiKey(this.apiKey, {
                personaId: this.DUMUZI_PERSONA_ID,
            });

            console.log('Anam client created, setting up listeners...');
            this.setupClientListeners();
            console.log('Anam client initialized successfully with Dumuzi-Abzu');
            return true;
        } catch (error) {
            console.error('Error initializing Anam client:', error);
            this.addMessageToLog('ai', `Initialization error: ${error.message}`);
            return false;
        }
    }

    setupClientListeners() {
        console.log('Setting up client listeners...');
        if (!this.anamClient) {
            console.error('Cannot setup listeners - anamClient is null');
            return;
        }

        this.anamClient.addListener('CONNECTION_ESTABLISHED', () => {
            console.log('Anam connection established');
            this.addMessageToLog('ai', 'Connection established. How can I help you today?');
        });

        this.anamClient.addListener('CONNECTION_CLOSED', () => {
            console.log('Anam connection closed');
            this.addMessageToLog('ai', 'Connection closed.');
        });

        this.anamClient.addListener('MESSAGE_HISTORY_UPDATED', (messages) => {
            console.log('Message history updated:', messages);
            if (!this.currentStreamingMessage) {
                document.getElementById('messageLog').innerHTML = '';
                messages.forEach(msg => {
                    this.addMessageToLog(
                        msg.role === 'assistant' ? 'ai' : 'human',
                        msg.content
                    );
                });
            }
        });

        this.anamClient.addListener('MESSAGE_STREAM_EVENT_RECEIVED', (message) => {
            console.log('Stream event received:', message);
            if (message.type === 'transcript') {
                if (message.role === 'human') {
                    this.addMessageToLog('human', message.content);
                } else if (message.role === 'assistant') {
                    if (!message.isPartial) {
                        this.currentStreamContent = message.content;
                        this.addMessageToLog('ai', this.currentStreamContent);
                        this.currentStreamContent = '';
                        this.currentStreamingMessage = null;
                    } else {
                        this.currentStreamContent = message.content;
                        this.addMessageToLog('ai', this.currentStreamContent, true);
                    }
                }
            }
        });
    }

    async handleStartConversation() {
        console.log('Starting conversation...');
        try {
            const stream = await this.setupUserMedia();
            console.log('User media setup complete');

            if (!this.anamClient) {
                console.log('No Anam client found, initializing...');
                const initialized = await this.initializeAnamClient();
                if (!initialized) {
                    throw new Error('Failed to initialize Anam client');
                }
            }

            console.log('Starting stream to video and audio elements...');
            const videoElement = document.getElementById('video-element-id');
            const audioElement = document.getElementById('audio-element-id');
            
            if (!videoElement || !audioElement) {
                throw new Error('Video or audio elements not found');
            }

            await this.anamClient.streamToVideoAndAudioElements(
                'video-element-id',
                'audio-element-id',
                stream
            );
            
            console.log('Stream started successfully');
            const streamStatus = document.getElementById('streamStatus');
            if (streamStatus) {
                streamStatus.style.display = 'flex';
            }
        } catch (error) {
            console.error('Error in start conversation:', error);
            this.addMessageToLog('ai', `Error starting conversation: ${error.message}`);
        }
    }

    handleStopConversation() {
        console.log('Stopping conversation...');
        if (this.anamClient) {
            this.anamClient.stopStreaming();
            console.log('Anam client streaming stopped');
        }
        
        if (this.userStream) {
            this.userStream.getTracks().forEach(track => {
                track.stop();
                console.log(`Stopped track: ${track.kind}`);
            });
            this.userStream = null;
            const userVideo = document.getElementById('user-video');
            if (userVideo) userVideo.srcObject = null;
        }
        
        const streamStatus = document.getElementById('streamStatus');
        if (streamStatus) {
            streamStatus.style.display = 'none';
        }
    }

    toggleVideo() {
        console.log('Toggling video...');
        if (this.userStream) {
            const videoTrack = this.userStream.getVideoTracks()[0];
            if (videoTrack) {
                this.isVideoEnabled = !this.isVideoEnabled;
                videoTrack.enabled = this.isVideoEnabled;
                console.log(`Video ${this.isVideoEnabled ? 'enabled' : 'disabled'}`);
                const toggleButton = document.getElementById('toggleVideo');
                if (toggleButton) {
                    toggleButton.classList.toggle('muted', !this.isVideoEnabled);
                }
            }
        }
    }

    toggleAudio() {
        console.log('Toggling audio...');
        if (this.userStream) {
            const audioTrack = this.userStream.getAudioTracks()[0];
            if (audioTrack) {
                this.isAudioEnabled = !this.isAudioEnabled;
                audioTrack.enabled = this.isAudioEnabled;
                console.log(`Audio ${this.isAudioEnabled ? 'enabled' : 'disabled'}`);
                const toggleButton = document.getElementById('toggleAudio');
                if (toggleButton) {
                    toggleButton.classList.toggle('muted', !this.isAudioEnabled);
                }
            }
        }
    }

    init() {
        console.log('Initializing AvatarManager components...');
        try {
            const startButton = document.getElementById('startButton');
            const stopButton = document.getElementById('stopButton');
            const toggleVideoButton = document.getElementById('toggleVideo');
            const toggleAudioButton = document.getElementById('toggleAudio');

            if (startButton) {
                startButton.addEventListener('click', this.handleStartConversation);
                console.log('Start button listener added');
            }
            if (stopButton) {
                stopButton.addEventListener('click', this.handleStopConversation);
                console.log('Stop button listener added');
            }
            if (toggleVideoButton) {
                toggleVideoButton.addEventListener('click', this.toggleVideo);
                console.log('Toggle video button listener added');
            }
            if (toggleAudioButton) {
                toggleAudioButton.addEventListener('click', this.toggleAudio);
                console.log('Toggle audio button listener added');
            }

            window.addEventListener('beforeunload', () => {
                if (this.userStream) {
                    this.userStream.getTracks().forEach(track => track.stop());
                }
            });
            
            console.log('AvatarManager initialization complete');
        } catch (error) {
            console.error('Error during AvatarManager initialization:', error);
        }
    }
}