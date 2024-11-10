// server.js

const express = require('express');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const videoCache = new Set(); // Track generated videos

const { WebSocketServer } = require('ws');

const { createServer } = require('http');
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/agent-socket' }); // Specify the WebSocket path

// Add this line to explicitly set the listening address
const host = '0.0.0.0';
const port = process.env.PORT || 8080;

const { connectWebSocket, disconnect, conversationEmitter } = require('./elevenlabs_websocket');

isAgentRunning.flag = false;

app.use(express.static('.'));
app.use(express.json());

// Middleware to handle CORS if needed
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Endpoint to start the agent
app.post('/start-agent', (req, res) => {
  if (!isAgentRunning()) {
    try {
      connectWebSocket();
      isAgentRunning.flag = true;  // Set flag immediately
      res.json({ status: 'Agent started' });
    } catch (error) {
      isAgentRunning.flag = false;  // Reset flag on error
      res.status(500).json({ error: `Failed to start agent: ${error.message}` });
    }
  } else {
    res.status(400).json({ error: 'Agent is already running' });
  }
});

// Endpoint to stop the agent
app.post('/stop-agent', (req, res) => {
  if (isAgentRunning()) {
    try {
      disconnect();
      isAgentRunning.flag = false;  // Set flag immediately
      res.json({ status: 'Agent stopped' });
    } catch (error) {
      res.status(500).json({ error: `Failed to stop agent: ${error.message}` });
    }
  } else {
    res.status(400).json({ error: 'Agent is not running' });
  }
});

// Helper function to check if the agent is running
function isAgentRunning() {
  return Boolean(isAgentRunning.flag);
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

      // Parse CSV with respect to quoted fields
      const parseCSVLine = (line) => {
          const entries = [];
          let entry = '';
          let withinQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                  withinQuotes = !withinQuotes;
              } else if (char === ',' && !withinQuotes) {
                  entries.push(entry.trim());
                  entry = '';
              } else {
                  entry += char;
              }
          }
          entries.push(entry.trim()); // Push the last entry
          return entries;
      };

      const rows = data.split('\n');
      const headers = parseCSVLine(rows[0]);
      const artifacts = rows.slice(1)
          .filter(row => row.trim()) // Skip empty rows
          .map(row => {
            const values = parseCSVLine(row);
            const artifact = {};
            
            // Map all values using headers as keys
            headers.forEach((header, index) => {
                artifact[header] = values[index]?.trim() || '';
            });
            
            return artifact;
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

// Endpoint to check if a video exists
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

// WebSocket Connection Handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
      console.log('Received:', message);
  });

  ws.on('close', () => {
      console.log('Client disconnected');
  });
});

// Update the listen call
server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});

// Add endpoint to serve videos
app.get('/videos/:artifactId', (req, res) => {
  const videoPath = path.join(__dirname, 'videos', `${req.params.artifactId}.mp4`);
  res.sendFile(videoPath);
});

// Add this near your other routes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Add this near your other routes
app.get('/audio-context', (req, res) => {
  res.json({ 
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16
  });
});