from elevenlabs import play
from elevenlabs.client import ElevenLabs

client = ElevenLabs(
  api_key="sk_1d1f29e561acbcac674267a7eee28510fde7c869311531c7", # Defaults to ELEVEN_API_KEY
)

audio = client.generate(
    #text="Hello! 你好! Hola! नमस्ते! Bonjour! こんにちは! مرحبا! 안녕하세요! Ciao! Cześć! Привіт! வணக்கம்!",
    text="Just testing to see if the key even works.",
    voice="Brian",
    model="eleven_multilingual_v2"
)

play(audio)
