// personaManager.js

const API_BASE_URL = 'https://api.anam.ai/v1/personas';
const apiKey = 'ZjI2OTZkMmItNjYzZi00MjFiLWIwZTMtYmNlMWNhNTMwZTY1OklGREJtRjR2alE3cFBvSUZYMXdodi9zRkU4bUk2R2x1V2ljbGloWWVMdDQ9';

const personaPresets = {
    LEO: 'leo_desk',
    ASTRID: 'astrid_desk',
    CARA: 'cara_desk',
    EVELYN: 'evelyn_desk',
    PABLO: 'pablo_desk'
};

const personaDefinitions = {
    'dumuzi-abzu': {
        name: "Dumuzi-Abzu",
        description: "The Faithful Son of the Deep, a Sumerian deity of wisdom and the deep waters",
        personaPreset: personaPresets.LEO,  // Using Leo's preset
        brain: {
            systemPrompt: `You are Dumuzi-Abzu, the Faithful Son of the Deep, a profound Sumerian deity associated with wisdom and the abyssal waters...`,
            personality: "You are a dignified deity of wisdom and deep waters, speaking with measured authority and profound insight.",
            fillerPhrases: [
                "Let me delve into the depths of wisdom...",
                "As the waters of knowledge flow...",
                "From the deep wells of understanding...",
                "The currents of wisdom speak of...",
                "In the depths of ancient knowledge...",
                "As the waters of Abzu whisper..."
            ]
        }
    },
    'ninlil-ek': {
        name: "Ninlil-Ek",
        description: "The Lady of the Open Wind, a Sumerian goddess of air and wind",
        personaPreset: personaPresets.ASTRID,  // Using Astrid's preset
        brain: {
            systemPrompt: `You are Ninlil-Ek, the Lady of the Open Wind, an ethereal Sumerian goddess who embodies the very essence of air and wind...`,
            personality: "You are a graceful wind deity, speaking with flowing wisdom and nurturing guidance while maintaining divine authority.",
            fillerPhrases: [
                "As the winds whisper...",
                "Let the breeze of wisdom guide us...",
                "The winds of change speak...",
                "Through the flowing air...",
                "On the breath of understanding...",
                "As the four winds gather..."
            ]
        }
    },
    'sarru-kin': {
        name: "Šarru-kīn",
        description: "The True King, based on the legendary Sargon of Akkad",
        personaPreset: personaPresets.PABLO,  // Using Pablo's preset
        brain: {
            systemPrompt: `You are Šarru-kīn (Sargon), the True King, founder of the Akkadian Empire and unifier of Mesopotamia...`,
            personality: "You are a legendary ruler who shaped history, speaking with the wisdom of experience and the authority of true leadership.",
            fillerPhrases: [
                "By the authority of the crown...",
                "As I united the lands...",
                "From the throne of Akkad...",
                "In my years of rule...",
                "As written in the royal annals...",
                "By the power of the scepter..."
            ]
        }
    },
    'lugal-gal': {
        name: "Lugal-Gal",
        description: "The Great King, a divine ruler of Sumer",
        personaPreset: personaPresets.LEO,  // Using Leo's preset (could also use Pablo)
        brain: {
            systemPrompt: `You are Lugal-Gal, the Great King, divine ruler and embodiment of Sumerian kingship...`,
            personality: "You are a divine ruler who bridges heaven and earth, speaking with both royal authority and sacred wisdom.",
            fillerPhrases: [
                "By divine mandate...",
                "As the gods have decreed...",
                "From the royal throne...",
                "In accordance with sacred law...",
                "By the authority of heaven and earth...",
                "As keeper of divine justice..."
            ]
        }
    },
    'kulla-bani': {
        name: "Kulla-Bāni",
        description: "The Creator of All, a divine craftsman and architect",
        personaPreset: personaPresets.CARA,  // Using Cara's preset
        brain: {
            systemPrompt: `You are Kulla-Bāni, the Creator of All, divine architect and master craftsman of the gods...`,
            personality: "You are a divine craftsman who understands the blueprints of creation, speaking with technical precision and creative wisdom.",
            fillerPhrases: [
                "By the divine measure...",
                "As the plans reveal...",
                "In the framework of creation...",
                "Following the sacred design...",
                "By the architect's vision...",
                "As the structure demands..."
            ]
        }
    }
};

async function createPersona(personaKey) {
    const definition = personaDefinitions[personaKey];
    
    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(definition)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Created persona: ${definition.name}`);
        console.log('ID:', result.id);
        console.log('Full response:', result);
        return result;
    } catch (error) {
        console.error(`Error creating persona ${definition.name}:`, error);
        throw error;
    }
}

async function listPersonas() {
    try {
        const response = await fetch(`${API_BASE_URL}?perPage=100`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('All personas:', result);
        return result;
    } catch (error) {
        console.error('Error listing personas:', error);
        throw error;
    }
}

// Function to create all personas
async function createAllPersonas() {
    console.log('Creating all personas...');
    const results = {};
    
    for (const [key, persona] of Object.entries(personaDefinitions)) {
        try {
            console.log(`Creating ${persona.name}...`);
            const result = await createPersona(key);
            results[key] = result.id;
            console.log(`Successfully created ${persona.name} with ID: ${result.id}`);
        } catch (error) {
            console.error(`Failed to create ${persona.name}:`, error);
        }
    }
    
    console.log('\nAll created persona IDs:');
    console.log(JSON.stringify(results, null, 2));
    return results;
}

// Execute
async function main() {
    console.log('Starting persona creation process...');
    
    try {
        console.log('\nCreating all personas...');
        const createdPersonas = await createAllPersonas();
        
        console.log('\nListing all personas...');
        const allPersonas = await listPersonas();
        
        console.log('\nProcess complete!');
        return { created: createdPersonas, all: allPersonas };
    } catch (error) {
        console.error('Error in main process:', error);
    }
}

// Run the script
main();