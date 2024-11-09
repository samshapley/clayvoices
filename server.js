// server.js

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8080;

app.use(express.static('.'));
app.use(express.json());

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

  pythonProcess.stdout.on('data', (data) => {
      res.write(data);
  });

  pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data}`);
      // Only write error to response if it's not the Flask server startup messages
      if (!data.toString().includes('Running on http://')) {
          res.write(`Error: ${data}`);
      }
  });

  pythonProcess.on('close', (code) => {
      if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
      }
      res.end();
  });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});