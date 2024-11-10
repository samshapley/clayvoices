import { unsafe_createClientWithApiKey } from '@anam-ai/js-sdk';

export const createAnamClient = async (apiKey, personaId) => {
  try {
    const client = unsafe_createClientWithApiKey(apiKey, {
      personaId,
    });

    // Add event listeners
    client.addListener('CONNECTION_ESTABLISHED', () => {
      console.log('Connected to Anam AI');
    });

    // Add other event listeners...

    return client;
  } catch (error) {
    console.error('Error creating Anam client:', error);
    throw error;
  }
};
