const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8080;

app.use(express.static('.'));
app.use(express.json());

app.get('/artifacts-data', (req, res) => {
  const csvFilePath = path.join(__dirname, 'limited_artifacts.csv');
  console.log('Attempting to read:', csvFilePath); // Add this debug line
  
  fs.readFile(csvFilePath, 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading CSV file:', err);
          console.error('Current directory:', __dirname); // Add this debug line
          res.status(500).json({ error: 'Failed to read artifacts data' });
          return;
      }

        const rows = data.split('\n');
        const headers = rows[0].split(',');
        const artifacts = rows.slice(1).map(row => {
            const values = row.split(',');
            return {
                id: values[0],
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
