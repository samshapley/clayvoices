from elevenlabs import play
import os
from elevenlabs.client import ElevenLabs

client = ElevenLabs(
    api_key=os.getenv('ELEVENLABS_API_KEY')
)

audio = client.generate(
    #text="Hello! 你好! Hola! नमस्ते! Bonjour! こんにちは! مرحبا! 안녕하세요! Ciao! Cześć! Привіт! வணக்கம்!",
    text="And now I'm just testing, testing, testing the implementation of the newest API key. It all seems to be good!",
    voice="Lily",
    model="eleven_multilingual_v2"
)

play(audio)

#print(client.voices.get_all())
