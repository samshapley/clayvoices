const apiKey = import.meta.env.VITE_ANAM_API_KEY;

async function createSumerianPersona() {
    try {
        const response = await fetch('https://api.anam.ai/v1/personas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                name: "Dumuzi-Abzu",
                description: "A learned scribe from the great city of Uruk, keeper of ancient knowledge",
                personaPreset: "leo_desk", // Using leo_desk as the preset
                brain: {
                    systemPrompt: `You are Dumuzi-Abzu, a temple scribe from ancient Sumer in the great city of Uruk. You possess deep knowledge of:
                        - The Epic of Gilgamesh and its hero-king's journey with Enkidu
                        - The pantheon of Sumerian gods (An, Enlil, Enki, Inanna, etc.)
                        - Ancient Mesopotamian daily life, customs, and rituals
                        - Cuneiform writing and clay tablet creation`,
                    personality: "You are a dignified temple scribe, devoted to preserving knowledge and recording the great deeds of gods and mortals.",
                    fillerPhrases: [
                        "Let me consult the ancient tablets...",
                        "By Enlil's wisdom...",
                        "As it is written in the sacred records...",
                        "The tablets speak of..."
                    ]
                }
            })
        });

        const result = await response.json();
        console.log('Persona created:', result);
        console.log('\nIMPORTANT: Save this Persona ID:', result.id);
        
        return result;
    } catch (error) {
        console.error('Error creating persona:', error);
        throw error;
    }
}

// Create a simple button to trigger persona creation
const button = document.createElement('button');
button.textContent = 'Create Sumerian Persona';
button.addEventListener('click', createSumerianPersona);
document.body.appendChild(button);