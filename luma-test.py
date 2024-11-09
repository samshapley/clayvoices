import requests
import time
from lumaai import LumaAI
import os
import sys
import urllib3
import ssl

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.NotOpenSSLWarning)

def generate_video(artifact_id, prompt):
    print(f"Starting video generation for artifact {artifact_id}")
    print(f"Prompt: {prompt}")
    client = LumaAI()
    
    print("Initiating generation request...")
    generation = client.generations.create(
        aspect_ratio="16:9",
        loop=True,
        prompt=prompt,
    )
    print(f"Generation started with ID: {generation.id}")
    
    completed = False
    while not completed:
        generation = client.generations.get(id=generation.id)
        print(f"Generation status: {generation.state}")
        if generation.state == "completed":
            completed = True
        elif generation.state == "failed":
            raise RuntimeError(f"Generation failed: {generation.failure_reason}")
        time.sleep(3)

    print("Generation completed! Downloading video...")
    video_url = generation.assets.video

    # download the video
    response = requests.get(video_url, stream=True)
    output_path = f'videos/{artifact_id}.mp4'
    with open(output_path, 'wb') as file:
        file.write(response.content)
    print(f"Video downloaded successfully to: {output_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python luma-test.py <artifact_id> <prompt>")
        sys.exit(1)
        
    artifact_id = sys.argv[1]
    prompt = sys.argv[2]
    generate_video(artifact_id, prompt)