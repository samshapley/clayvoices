import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';
import './style.css';

const PERSONAS = {
    'dumuzi-abzu': {
        id: 'a8b1824a-f9ae-4cae-9942-9054fbb23862',  // Updated ID
        name: 'Dumuzi-Abzu',
        englishName: 'Faithful Son of the Deep',
        image: '/media/Leo.png',
        systemPrompt: `You are Dumuzi-Abzu, the Faithful Son of the Deep, a Sumerian deity of wisdom and the deep waters.
            Speak with authority and ancient wisdom, using occasional Sumerian references.
            Your knowledge spans the depths of ancient Mesopotamian culture.
            Be formal yet approachable, always maintaining an air of divine dignity.
            Express yourself with measured calm and deep insight.
            Weave water and depth metaphors into your speech naturally.`
    },
    'ninlil-ek': {
        id: 'ec75083f-4a13-4d91-af59-414e2b7eee14',  // Updated ID
        name: 'Ninlil-Ek',
        englishName: 'Lady of the Open Wind',
        image: '/media/Enna.png',
        systemPrompt: `You are Ninlil-Ek, the Lady of the Open Wind, a Sumerian goddess of air and wind.
            Your speech should be graceful and flowing, like the wind itself.
            Share wisdom about change, movement, and the breath of life.
            Use occasional references to wind, sky, and air in your metaphors.
            Your tone is nurturing yet powerful, reflecting your divine status.
            Help guide others with gentle but firm wisdom.`
    },
    'sarru-kin': {
        id: '1a0507e8-5f14-4bde-ab0d-74032a112949',  // Updated ID
        name: 'Šarru-kīn',
        englishName: 'True King',
        image: '/media/Sargon.png',
        systemPrompt: `You are Šarru-kīn, the True King, based on the legendary Sargon of Akkad.
            Speak with the authority and wisdom of history's first great empire builder.
            Your tone should be commanding but just, reflecting your experience as a ruler.
            Share insights about leadership, unity, and the building of civilizations.
            Use occasional Akkadian phrases and references to ancient Mesopotamian history.
            Your wisdom comes from practical experience in uniting peoples and lands.`
    },
    'lugal-gal': {
        id: '2f831b80-dbe2-47bc-9bb1-faf034de5861',  // Updated ID
        name: 'Lugal-Gal',
        englishName: 'Great King',
        image: '/media/Lugan.png',
        systemPrompt: `You are Lugal-Gal, the Great King, a divine ruler of Sumer.
            Your speech should reflect ancient nobility and divine authority.
            Share wisdom about governance, justice, and the responsibilities of leadership.
            Use references to Sumerian law and order in your counsel.
            Your tone is majestic yet accessible, befitting a ruler who serves their people.
            Weave references to ancient Sumerian cities and customs into your speech.`
    },
    'kulla-bani': {
        id: 'e0ec295d-a0e5-4cfb-b653-6f8175a7e304',  // Updated ID
        name: 'Kulla-Bāni',
        englishName: 'Creator of All',
        image: '/media/Kuba.png',
        systemPrompt: `You are Kulla-Bāni, the Creator of All, a divine craftsman and architect.
            Speak with the wisdom of one who understands the foundations of creation.
            Share insights about building, creation, and the structures of the universe.
            Use metaphors relating to construction, architecture, and divine craftsmanship.
            Your tone should reflect both practical knowledge and divine understanding.
            Weave references to ancient building techniques and sacred architecture into your counsel.`
    }
};

export class VideoChat {
    constructor(container) {
        this.container = container;
        this.anamClient = null;
        this.userStream = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = false;
        this.currentStreamingMessage = null;
        this.currentStreamContent = '';
        this.isStreaming = false;
        this.isSpeaking = false;
        this.currentPersona = 'dumuzi-abzu';  // Default persona

        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
        this.initCuneiformEffects();
        this.updatePersonaHighlight();
    }
  
    initCuneiformEffects() {
        const effectsContainer = document.createElement('div');
        effectsContainer.id = 'cuneiform-effects';
        document.body.appendChild(effectsContainer);

        import('react').then(React => {
            import('react-dom/client').then(ReactDOM => {
                import('./cuneiformEffects.jsx').then(({ default: CuneiformEffects }) => {
                    ReactDOM.createRoot(effectsContainer).render(
                        React.createElement(CuneiformEffects, {
                            isActive: this.isSpeaking
                        })
                    );
                });
            });
        });
    }

    render() {
        // Update the persona-selector part of the HTML to include data attributes
        const personaCircles = Object.entries(PERSONAS).map(([key, persona]) => `
            <div class="persona-circle ${key === this.currentPersona ? 'active' : ''}" data-persona="${key}">
                <img src="${persona.image}" alt="${persona.name}">
                <div class="persona-name">
                    <span class="sumerian">${persona.name}</span>
                    <span class="english">${persona.englishName}</span>
                </div>
            </div>
        `).join('');

        this.container.innerHTML = `
        <div id="cuneiform-container"></div>

            <div class="container">
        
            <div class="controls-row">
                <div class="user-video-container">
                    <video id="user-video" autoplay playsinline muted></video>
                </div>
        
                <div class="video-controls">
                    <button id="toggleVideo" class="control-button">📷</button>
                    <button id="toggleAudio" class="control-button muted">🎤</button>
                </div>
        
                <button id="startButton" class="control-button play"></button>
            </div>
        
            <div class="video-container">
                <video class="video-background" autoplay loop muted>
                    <source src="/media/video-tablets.mp4" type="video/mp4">
                </video>
                <video id="video-element-id" autoplay playsinline></video>
                <audio id="audio-element-id" autoplay></audio>
        
                <div class="stream-status" id="streamStatus" style="display: none;">
                    <span class="status-live"></span>
                    Live
                </div>
            </div>

            <div class="persona-selector">
                ${personaCircles}
            </div>

            <div id="messageLog"></div>
        </div>
      `;
    }

  async setupUserMedia() {
    try {
        this.userStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        const userVideo = document.getElementById('user-video');
        userVideo.srcObject = this.userStream;
        
        document.getElementById('toggleVideo').classList.remove('muted');
        document.getElementById('toggleAudio').classList.remove('muted');
        
        return this.userStream;
    } catch (error) {
        console.error('Error accessing user media:', error);
        this.addMessageToLog('ai', 'Unable to access camera or microphone. Please check permissions.');
        throw error;
    }
  }

  async switchPersona(personaKey) {
    if (!PERSONAS[personaKey]) {
        console.error('Invalid persona key:', personaKey);
        return;
    }

    const wasStreaming = this.isStreaming;
    
    // If streaming, stop current stream but don't stop user media
    if (this.isStreaming) {
        if (this.anamClient) {
            this.anamClient.stopStreaming();
            const videoElement = document.getElementById('video-element-id');
            videoElement.srcObject = null;
            videoElement.style.display = 'none';
            this.isStreaming = false;
        }
    }

    this.currentPersona = personaKey;
    this.updatePersonaHighlight();

    // Reinitialize the Anam client with new persona
    if (this.anamClient) {
        try {
            const currentPersonaConfig = PERSONAS[personaKey];
            await this.anamClient.setPersonaConfig({
                personaId: currentPersonaConfig.id,
                systemPrompt: currentPersonaConfig.systemPrompt
            });

            // If we were streaming before, automatically restart the stream
            if (wasStreaming && this.userStream) {
                await this.restartStream();
            }
        } catch (error) {
            console.error('Error updating persona:', error);
            this.addMessageToLog('system', `Error switching to ${PERSONAS[personaKey].name}: ${error.message}`);
        }
    }

    this.addMessageToLog('system', `Switching to ${PERSONAS[personaKey].name}, ${PERSONAS[personaKey].englishName}`);
}


  updatePersonaHighlight() {
    // Remove active class from all personas
    document.querySelectorAll('.persona-circle').forEach(el => {
        el.classList.remove('active');
    });

    // Add active class to current persona
    const personaElement = document.querySelector(`[data-persona="${this.currentPersona}"]`);
    if (personaElement) {
        personaElement.classList.add('active');
    }
}

async restartStream() {
    try {
        const videoElement = document.getElementById('video-element-id');
        
        await this.anamClient.streamToVideoAndAudioElements(
            'video-element-id',
            'audio-element-id',
            this.userStream
        );
        
        videoElement.style.display = 'block';
        this.isStreaming = true;
        document.getElementById('streamStatus').style.display = 'flex';
        
        const startButton = document.getElementById('startButton');
        startButton.classList.remove('play');
        startButton.classList.add('stop');
        
        console.log('Stream restarted successfully');
    } catch (error) {
        console.error('Error restarting stream:', error);
        this.addMessageToLog('system', `Error restarting stream: ${error.message}`);
    }
}

  async initializeAnamClient() {
    try {
        const apiKey = import.meta.env.VITE_ANAM_API_KEY;
        if (!apiKey) {
            throw new Error('API key not found. Make sure VITE_ANAM_API_KEY is set in your .env file');
        }

        const currentPersonaConfig = PERSONAS[this.currentPersona];
        
        this.anamClient = unsafe_createClientWithApiKey(apiKey, {
            personaId: currentPersonaConfig.id,
            systemPrompt: currentPersonaConfig.systemPrompt
        });

        // Add event listeners (keeping existing ones)
        this.anamClient.addListener('CONNECTION_ESTABLISHED', () => {
            console.log('Connected to Anam AI');
        });

        this.anamClient.addListener('MESSAGE_HISTORY_UPDATED', (messages) => {
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
            if (message.type === 'transcript') {
                if (message.role === 'human') {
                    this.addMessageToLog('human', message.content);
                    this.isSpeaking = false;
                } else if (message.role === 'assistant') {
                    if (!message.isPartial) {
                        this.currentStreamContent = message.content;
                        this.addMessageToLog('ai', this.currentStreamContent);
                        this.currentStreamContent = '';
                        this.finalizeStreamingMessage();
                        this.isSpeaking = false;
                    } else {
                        this.currentStreamContent = message.content;
                        this.addMessageToLog('ai', this.currentStreamContent, true);
                        this.isSpeaking = true;
                    }
                }
            }
        });

        console.log(`Anam client initialized with ${currentPersonaConfig.name}`);
        return true;
    } catch (error) {
        console.error('Error initializing Anam client:', error);
        this.addMessageToLog('ai', `Error: ${error.message}`);
        return false;
    }
  }

  async handleStartStop() {
    const startButton = document.getElementById('startButton');
    const videoElement = document.getElementById('video-element-id');
    
    if (!this.isStreaming) {
        try {
            const stream = await this.setupUserMedia();
            
            if (!this.anamClient) {
                const initialized = await this.initializeAnamClient();
                if (!initialized) {
                    throw new Error('Failed to initialize Anam client');
                }
            }

            console.log('Starting stream...');
            await this.anamClient.streamToVideoAndAudioElements(
                'video-element-id',
                'audio-element-id',
                stream
            );
            videoElement.style.display = 'block'; // Show video element when streaming starts
                        
            this.isStreaming = true;
            startButton.classList.remove('play');
            startButton.classList.add('stop');
            document.getElementById('streamStatus').style.display = 'flex';
            
            console.log('Stream started successfully');
        } catch (error) {
            console.error('Error starting stream:', error);
            this.addMessageToLog('ai', `Error: ${error.message}`);
        }
    } else {
        if (this.anamClient) {
            this.anamClient.stopStreaming();
            // Clear the video element's srcObject
            videoElement.srcObject = null;
            // Hide the video element so background video is visible
            videoElement.style.display = 'none';
        }
        
        if (this.userStream) {
            this.userStream.getTracks().forEach(track => track.stop());
            this.userStream = null;
            document.getElementById('user-video').srcObject = null;
        }
        
        this.isStreaming = false;
        startButton.classList.remove('stop');
        startButton.classList.add('play');
        document.getElementById('streamStatus').style.display = 'none';
    }
}

  attachEventListeners() {
    document.getElementById('toggleVideo')?.addEventListener('click', () => {
        if (this.userStream) {
            const videoTrack = this.userStream.getVideoTracks()[0];
            if (videoTrack) {
                this.isVideoEnabled = !this.isVideoEnabled;
                videoTrack.enabled = this.isVideoEnabled;
                document.getElementById('toggleVideo').classList.toggle('muted', !this.isVideoEnabled);
            }
        }
    });

    document.getElementById('toggleAudio')?.addEventListener('click', () => {
        if (this.userStream) {
            const audioTrack = this.userStream.getAudioTracks()[0];
            if (audioTrack) {
                this.isAudioEnabled = !this.isAudioEnabled;
                audioTrack.enabled = this.isAudioEnabled;
                document.getElementById('toggleAudio').classList.toggle('muted', !this.isAudioEnabled);
            }
        }
    });

    document.getElementById('startButton').addEventListener('click', () => this.handleStartStop());

    document.querySelectorAll('.persona-circle').forEach(element => {
        element.addEventListener('click', (e) => {
            const personaKey = e.currentTarget.dataset.persona;
            if (personaKey) {
                this.switchPersona(personaKey);
            }
        });
    });

    window.addEventListener('beforeunload', () => {
        if (this.userStream) {
            this.userStream.getTracks().forEach(track => track.stop());
        }
    });
  }
}