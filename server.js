const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, '.')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/scrape', (req, res) => {
  const python = spawn('python', ['cdli_api_scraper.py']);
  let dataString = '';

  python.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Python script output:', output);
    dataString += output;
  });

  python.stderr.on('data', (data) => {
    const error = data.toString();
    console.error(`Python script error: ${error}`);
    dataString += error;
  });

  python.on('close', (code) => {
    console.log(`Python script exited with code ${code}`);
    res.send(dataString || `Scraping completed with exit code ${code}`);
  });
});

app.post('/prompt', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).send('No prompt provided');
  }
  
  const python = spawn('python', ['prompt_llm.py', prompt]);
  let dataString = '';

  python.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Python script output:', output);
    dataString += output;
  });

  python.stderr.on('data', (data) => {
    const error = data.toString();
    console.error(`Python script error: ${error}`);
    dataString += error;
  });

  python.on('close', (code) => {
    console.log(`Python script exited with code ${code}`);
    res.send(dataString || `Prompt processing completed with exit code ${code}`);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});