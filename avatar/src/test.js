import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if .env file exists
const envPath = join(__dirname, '..', '.env');
if (!existsSync(envPath)) {
    console.error('\x1b[31mError: .env file not found!\x1b[0m');
    console.log('\nPlease create a .env file in the project root with the following content:');
    console.log('\nVITE_ANAM_API_KEY=your_api_key_here');
    console.log('\nMake sure it\'s located at:', envPath);
    process.exit(1);
}

// Load environment variables
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('\x1b[31mError loading .env file:\x1b[0m', result.error);
    process.exit(1);
}

// Get API key
const apiKey = process.env.VITE_ANAM_API_KEY;

if (!apiKey) {
    console.error('\x1b[31mAPI Key not found in environment variables!\x1b[0m');
    console.log('\nPlease check that your .env file contains:');
    console.log('VITE_ANAM_API_KEY=your_api_key_here');
    process.exit(1);
}

// Utility function to log responses
const logResponse = (stage, data) => {
    console.log('\n=================================');
    console.log(`${stage}:`);
    console.log('=================================');
    console.log(JSON.stringify(data, null, 2));
};


// Test each stage of persona creation
async function testPersonaCreation() {
    try {
        // 1. Test getting available presets
        console.log('Testing getAvailablePresets...');
        const presets = await fetch('https://api.anam.ai/v1/personas/presets', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        const presetsData = await presets.json();
        logResponse('Available Presets', presetsData);
        
        if (!presets.ok) {
            throw new Error(`Presets Error: ${presets.statusText}`);
        }

        // 2. Test creating the Sumerian scribe persona
        console.log('\nTesting persona creation...');
        const createResponse = await fetch('https://api.anam.ai/v1/personas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                name: "Dumuzi-Abzu",
                description: "A learned scribe from the great city of Uruk",
                personaPreset: presetsData[0]?.name, // Use first available preset
                brain: {
                    systemPrompt: "You are Dumuzi-Abzu, a temple scribe from ancient Sumer in Uruk.",
                    personality: "You are a dignified temple scribe, devoted to preserving knowledge.",
                    fillerPhrases: [
                        "Let me consult the ancient tablets...",
                        "By Enlil's wisdom..."
                    ]
                }
            })
        });
        
        const createData = await createResponse.json();
        logResponse('Persona Creation Response', createData);
        
        if (!createResponse.ok) {
            throw new Error(`Creation Error: ${createResponse.statusText}`);
        }

        // 3. Test getting existing personas
        console.log('\nTesting getExistingPersona...');
        const existingResponse = await fetch('https://api.anam.ai/v1/personas', {
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });
        
        const existingData = await existingResponse.json();
        logResponse('Existing Personas', existingData);
        
        if (!existingResponse.ok) {
            throw new Error(`Existing Personas Error: ${existingResponse.statusText}`);
        }

        // 4. Test initializing client with created persona
        if (createData.id) {
            console.log('\nTesting client initialization...');
            const client = unsafe_createClientWithApiKey(apiKey, {
                personaId: createData.id,
            });
            
            logResponse('Client Creation', {
                status: 'Success',
                personaId: createData.id
            });
        }

        return true;
    } catch (error) {
        console.error('Test failed:', error);
        throw error;
    }
}

// Run the tests
console.log('Starting persona creation tests...');
testPersonaCreation()
    .then(() => console.log('\nAll tests completed successfully'))
    .catch((error) => console.error('\nTest suite failed:', error));