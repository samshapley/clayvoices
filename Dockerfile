FROM node:18

# Install Python, pip, venv, and audio dependencies with proper ALSA configuration
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    alsa-utils \
    libasound2-dev \
    libasound2 \
    libasound2-plugins \
    sox \
    libsox-fmt-all \
    ffmpeg \
    pulseaudio \
    && ln -s /usr/bin/python3 /usr/bin/python

# Create ALSA configuration directory and add config
RUN mkdir -p /etc/alsa && \
    echo "pcm.!default { type plug slave.pcm null }" > /etc/asound.conf

# Configure PulseAudio to run in system mode
RUN echo "default-server = unix:/tmp/pulseaudio.socket" > /etc/pulse/client.conf && \
    echo "autospawn = no" >> /etc/pulse/client.conf && \
    echo "daemon-binary = /bin/true" >> /etc/pulse/client.conf

WORKDIR /app

# Copy package files and install Node dependencies
COPY package*.json ./
RUN npm install

# Set up Python virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install Python requirements
COPY requirements.txt ./
RUN . /opt/venv/bin/activate && pip install -r requirements.txt

COPY . .

ENV PORT=8080
EXPOSE 8080

# Start PulseAudio before the Node app
CMD pulseaudio --start && node server.js