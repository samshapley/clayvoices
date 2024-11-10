from elevenlabs import play
import os
from elevenlabs.client import ElevenLabs
from pydub import AudioSegment
import io

client = ElevenLabs(
    api_key=os.getenv('ELEVENLABS_API_KEY')
)
"""
audio = client.generate(
    #text="Hello! 你好! Hola! नमस्ते! Bonjour! こんにちは! مرحبا! 안녕하세요! Ciao! Cześć! Привіт! வணக்கம்!",
    text="And I shall exercise against you my right of rejection because you have treated me with contempt.",
    voice="Brian",
    model="eleven_multilingual_v2"
)

play(audio)
"""
#print(client.voices.get_all())

# Generate audio and collect all bytes
audio_bytes = b"".join(client.generate(
    text="And I shall exercise against you my right of rejection because you have treated me with contempt.",
    voice="Brian",
    model="eleven_multilingual_v2"
))

# Save to file
output_filename = "output.mp3"
with open(output_filename, "wb") as f:
    f.write(audio_bytes)

print(f"Audio saved to {output_filename}")
