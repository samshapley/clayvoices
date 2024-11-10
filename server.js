// server.js

const express = require('express');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8080;
const videoCache = new Set(); // Track generated videos

const { connectWebSocket, disconnect, conversationEmitter } = require('./elevenlabs_websocket');

app.use(express.static('.'));
app.use(express.json());

// Middleware to handle CORS if needed
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// New endpoint to start the agent
app.post('/start-agent', (req, res) => {
  if (!isAgentRunning()) {
    connectWebSocket();
    res.json({ status: 'Agent started' });
  } else {
    res.status(400).json({ error: 'Agent is already running' });
  }
});

// New endpoint to stop the agent
app.post('/stop-agent', (req, res) => {
  if (isAgentRunning()) {
    disconnect();
    res.json({ status: 'Agent stopped' });
  } else {
    res.status(400).json({ error: 'Agent is not running' });
  }
});

// Helper function to check if the agent is running
function isAgentRunning() {
  // You can implement a better check based on your actual implementation
  // For simplicity, we'll use a flag
  return typeof isAgentRunning.flag !== 'undefined' && isAgentRunning.flag;
}

isAgentRunning.flag = false;

// Listen to conversationEmitter events to update the flag
conversationEmitter.on('connected', () => {
  isAgentRunning.flag = true;
});

conversationEmitter.on('disconnected', () => {
  isAgentRunning.flag = false;
});

conversationEmitter.on('error', (error) => {
  console.error('Conversation module error:', error);
  isAgentRunning.flag = false;
});

app.get('/artifacts-data', (req, res) => {
  const csvFilePath = path.join(__dirname, 'limited_artifacts.csv');
  console.log('Attempting to read:', csvFilePath);
  
  fs.readFile(csvFilePath, 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading CSV file:', err);
          console.error('Current directory:', __dirname);
          res.status(500).json({ error: 'Failed to read artifacts data' });
          return;
      }

      const rows = data.split('\n');
      const headers = rows[0].split(',');
      const artifacts = rows.slice(1)
          .filter(row => row.trim()) // Skip empty rows
          .map(row => {
              const values = row.split(',');
              return {
                  id: String(values[0]).trim(), // Ensure ID is a string and trim whitespace
                  name: values[1],
                  language: values[2],
                  material: values[3],
                  period: values[4],
                  provenience: values[5],
                  collection: values[6]
              };
          });

      res.json(artifacts);
  });
});

app.post('/prompt', (req, res) => {
    const prompt = req.body.prompt;
    exec(`python prompt_llm.py "${prompt}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            res.status(500).json({ error: 'An error occurred while processing the prompt' });
            return;
        }
        res.json({ response: stdout.trim() });
    });
});

// Add new endpoint to check if video exists
app.get('/check-video/:artifactId', (req, res) => {
  const videoPath = path.join(__dirname, 'videos', `${req.params.artifactId}.mp4`);
  fs.access(videoPath, fs.constants.F_OK, (err) => {
      res.json({ exists: !err });
  });
});

app.post('/generate-summary', (req, res) => {
  const artifactId = String(req.body.artifactId);
  if (!artifactId) {
      res.status(400).json({ error: 'Invalid artifact ID' });
      return;
  }

  // Set headers for streaming
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  const pythonProcess = spawn('python', ['artifact_augmentation.py', artifactId]);
  let summary = '';

  pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      summary += text;
      res.write(text); // Send the chunk immediately
  });

  pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data}`);
  });

  pythonProcess.on('close', async (code) => {
      if (code === 0) {
          // Only start video generation after summary is complete
          const videoPath = path.join(__dirname, 'videos', `${artifactId}.mp4`);
          
          // Check if video already exists before generating
          try {
              await fs.promises.access(videoPath, fs.constants.F_OK);
              videoCache.add(artifactId);
          } catch {
              // Video doesn't exist, generate it
              const lumaProcess = spawn('python', ['luma-test.py', artifactId, summary]);
              
              lumaProcess.stderr.on('data', (data) => {
                  console.error(`Luma Error: ${data}`);
              });

              lumaProcess.on('close', (lumaCode) => {
                  if (lumaCode === 0) {
                      videoCache.add(artifactId);
                  }
              });
          }
      }
      res.end(); // End the response stream
  });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Add endpoint to serve videos
app.get('/videos/:artifactId', (req, res) => {
  const videoPath = path.join(__dirname, 'videos', `${req.params.artifactId}.mp4`);
  res.sendFile(videoPath);
});