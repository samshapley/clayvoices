import requests
import time
from lumaai import LumaAI
import os

#LUMAAI_API_KEY = "luma-9c6d5d4a-c45e-4e50-bb1f-69bb56e7db6a-33e6ef1e-a5d4-4e66-a730-29aa577f2589"

client = LumaAI()

generation = client.generations.create(
  aspect_ratio="16:9",
  loop=False,
  prompt="The Cyrus Cylinder is an ancient clay cylinder, dating from the 6th century BCE, that contains a declaration in Akkadian cuneiform script by the Persian king Cyrus the Great after his conquest of Babylon. Found in 1879, it's considered one of the first documents on human rights, as it describes Cyrus's peaceful policy of religious and cultural tolerance toward conquered peoples. The artifact, currently housed in the British Museum, marks an important historical moment in the Persian Empire and is a symbol of enlightened leadership in ancient times. ",
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