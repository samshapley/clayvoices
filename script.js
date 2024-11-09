document.addEventListener('DOMContentLoaded', function() {
    loadArtifactsData();

    const promptInput = document.getElementById('promptInput');
    const promptButton = document.getElementById('promptButton');
    const promptResponse = document.getElementById('promptResponse');
    const errorMessage = document.getElementById('errorMessage');

    promptButton.addEventListener('click', sendPrompt);

    function loadArtifactsData() {
        fetch('/artifacts-data')
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => Promise.reject(err));
                }
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    throw new Error('No data received from server');
                }
                const tableBody = document.querySelector('#artifacts-data tbody');
                tableBody.innerHTML = '';
                data.forEach(artifact => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${artifact.id}</td>
                        <td>${artifact.name}</td>
                        <td>${artifact.language}</td>
                        <td>${artifact.material}</td>
                        <td>${artifact.period}</td>
                        <td>${artifact.provenience}</td>
                        <td>${artifact.collection}</td>
                    `;
                    tableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error loading artifacts data:', error);
                errorMessage.textContent = `Failed to load artifacts data: ${error.message || error}`;
            });
    }

    function sendPrompt() {
        const prompt = promptInput.value;
        if (!prompt) {
            errorMessage.textContent = 'Please enter a prompt.';
            return;
        }

        errorMessage.textContent = '';
        promptButton.disabled = true;
        promptResponse.textContent = 'Processing...';

        fetch('/prompt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: prompt })
        })
        .then(response => response.json())
        .then(data => {
            promptResponse.textContent = data.response;
        })
        .catch(error => {
            console.error('Error:', error);
            errorMessage.textContent = 'An error occurred. Please try again.';
        })
        .finally(() => {
            promptButton.disabled = false;
        });
    }
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
