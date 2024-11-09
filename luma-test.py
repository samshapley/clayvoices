import requests
import time
from lumaai import LumaAI
import os

client = LumaAI()

generation = client.generations.create(
  aspect_ratio="16:9",
  loop=False,
  prompt="Very grainy black and white footage of Sumerian tablet excavation. There are many onlookers.",
)
completed = False
while not completed:
  generation = client.generations.get(id=generation.id)
  if generation.state == "completed":
    completed = True
  elif generation.state == "failed":
    raise RuntimeError(f"Generation failed: {generation.failure_reason}")
  print("Dreaming")
  time.sleep(3)

video_url = generation.assets.video

# download the video
response = requests.get(video_url, stream=True)
with open(f'{generation.id}.mp4', 'wb') as file:
    file.write(response.content)
print(f"File downloaded as {generation.id}.mp4")