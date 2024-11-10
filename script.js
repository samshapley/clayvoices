document.addEventListener('DOMContentLoaded', function() {
    const errorMessage = document.getElementById('errorMessage');
    const filterButton = document.getElementById('filterButton');
    const filterPopup = document.getElementById('filterPopup');
    const closeButton = document.querySelector('.close');
    const applyFiltersButton = document.getElementById('applyFilters');
    const agentToggleButton = document.getElementById('agentToggleButton');
    const summaryPanel = document.getElementById('summaryPanel');
    const animationCanvas = document.getElementById('animationCanvas');

    let isAgentActive = false;

    agentToggleButton.addEventListener('click', () => {
        if (isAgentActive) {
            stopAgent();
            stopAnimation();
        } else {
            startAgent();
            startAnimation();
        }
    }); // Added missing closing parenthesis

    function startAgent() {
        // Get current tablet info if any is selected
        const selectedRow = document.querySelector('#artifacts-data tbody tr.selected');
        let contextData = {};
        
        if (selectedRow) {
            const columns = ['artifact_id', 'period', 'location', 'excavation_no', 'materials', 'genres', 'collections', 'museum_no'];
            const tabletInfo = columns.reduce((acc, col, index) => {
                acc[col] = selectedRow.children[index].textContent;
                return acc;
            }, {});
            
            contextData = {
                summary: document.getElementById('artifact-summary').textContent,
                tablet: tabletInfo
            };
        }
    
        fetch('/start-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ context: contextData })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'Agent started') {
                isAgentActive = true;
                updateAgentButton();
            } else {
                console.error('Failed to start agent:', data.error);
                displayError(`Failed to start agent, ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error starting agent:', error);
            displayError(`Error starting agent: ${error.message || error}`);
        });
    }

    function stopAgent() {
        fetch('/stop-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'Agent stopped') {
                isAgentActive = false;
                updateAgentButton();
            } else {
                console.error('Failed to stop agent:', data.error);
                displayError(`Failed to stop agent, ${data.error}`);
            }
        })
        .catch(error => {
            console.error('Error stopping agent:', error);
            displayError(`Error stopping agent: ${error.message || error}`);
        });
    }

    function updateAgentButton() {
        if (isAgentActive) {
            agentToggleButton.classList.add('active');
            agentToggleButton.innerHTML = `<span>Chatting...</span>`;
        } else {
            agentToggleButton.classList.remove('active');
            agentToggleButton.innerHTML = `<span>Chat to Scribe</span>`;
        }
    }

    function displayError(message) {
        console.error('Error:', message);
    }

    const agentSocket = new WebSocket(`ws://${window.location.host}/agent-socket`);

    agentSocket.onopen = () => {
        console.log('WebSocket connected');
    }

    agentSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
    }

    agentSocket.onclose = () => {
        console.log('WebSocket closed');
    }

    window.addEventListener('beforeunload', () => {
        agentSocket.close();
    });

    // Add Event Listener for Random Dice Button
    const randomDiceButton = document.getElementById('randomDiceButton');
    randomDiceButton.addEventListener('click', selectRandomArtifact);

    let artifactsData = []; // Store the full dataset
    let filterControls = {};

    loadArtifactsData();
    filterButton.addEventListener('click', () => filterPopup.style.display = 'block');
    closeButton.addEventListener('click', () => filterPopup.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === filterPopup) filterPopup.style.display = 'none';
    });

    // Update the createFilterControls function
    function createFilterControls(data) {
        const filterContainer = document.getElementById('filterControls');
        filterContainer.innerHTML = '';
        
        // Get all columns from the data
        const columns = Object.keys(data[0]);
        
        columns.forEach(column => {
            const uniqueValues = [...new Set(data.map(item => item[column]))].filter(Boolean).sort();
            
            const filterGroup = document.createElement('div');
            filterGroup.className = 'filter-group';
            
            const label = document.createElement('label');
            label.textContent = column.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            const select = document.createElement('select');
            select.id = `filter-${column}`;
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = `All ${label.textContent}`;
            select.appendChild(defaultOption);
            
            // Add options for unique values
            uniqueValues.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });
            
            // Add change event listener
            select.addEventListener('change', () => {
                applyFilters();
            });
            
            filterGroup.appendChild(label);
            filterGroup.appendChild(select);
            filterContainer.appendChild(filterGroup);
            filterControls[column] = select;
        });
        
        // Add clear filters button
        const filterActions = document.createElement('div');
        filterActions.className = 'filter-actions';
        
        const clearButton = document.createElement('button');
        clearButton.id = 'clearFilters';
        clearButton.textContent = 'Clear Filters';
        clearButton.addEventListener('click', clearFilters);
        
        filterActions.appendChild(clearButton);
        filterContainer.appendChild(filterActions);
    }

    // Add the clearFilters function
    function clearFilters() {
        Object.values(filterControls).forEach(select => {
            select.selectedIndex = 0;
        });
        applyFilters();
        // Remove this line since we want Clear Filters to only reset filters
        // filterPopup.style.display = 'none';
    }

    // Update the HTML structure of the popup
    document.querySelector('.popup-content').innerHTML = `
        <div class="popup-header">
            <h2>Filter Artifacts</h2>
            <span class="close">&times;</span>
        </div>
        <div id="filterControls"></div>
    `;

    // Add the event listener for the new close button
    document.querySelector('.popup-content .close').addEventListener('click', () => {
        filterPopup.style.display = 'none';
    });

    let currentStream = null; // Add this at the top level to track the current fetch request
    // Add this at the top level with other variables
    let summaryCache = new Map();

    function generateSummary(artifactId) {
        // Ensure artifactId is a string
        const idString = String(artifactId);
        
        // Clear previous content and hide initial message
        const artifactSummary = document.getElementById('artifact-summary');
        const initialMessage = document.getElementById('initial-message');
        artifactSummary.textContent = '';
        initialMessage.style.display = 'none';
    
        // Hide the summary divider initially
        const summaryDivider = document.getElementById('summary-divider');
        summaryDivider.style.display = 'none';
    
        // Check if summary exists in cache
        if (summaryCache.has(idString)) {
            artifactSummary.textContent = summaryCache.get(idString);
            checkAndLoadVideo(idString);  // Add this line
            return;
        }
    
        // Cancel existing stream if any
        if (currentStream && currentStream.abort) {
            currentStream.abort();
        }
    
        // Create new AbortController for this request
        currentStream = new AbortController();
    
        fetch('/generate-summary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ artifactId: idString }),
            signal: currentStream.signal
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullText = ''; // Store complete summary
    
            function processText(text) {
                artifactSummary.textContent += text;
                fullText += text; // Add to complete summary
                artifactSummary.scrollTop = artifactSummary.scrollHeight;
    
                // Send the summary to the WebSocket when complete
                if (isAgentActive) {
                    const selectedRow = document.querySelector('#artifacts-data tbody tr.selected');
                    if (selectedRow) {
                        const columns = ['artifact_id', 'period', 'location', 'excavation_no', 'materials', 'genres', 'collections', 'museum_no'];
                        const tabletInfo = columns.reduce((acc, col, index) => {
                            acc[col] = selectedRow.children[index].textContent;
                            return acc;
                        }, {});
    
                        agentSocket.send(JSON.stringify({
                            type: 'context_update',
                            data: {
                                summary: fullText,
                                tablet: tabletInfo
                            }
                        }));
                    }
                }
            }
    
            function readStream() {
                return reader.read().then(({done, value}) => {
                    if (done) {
                        if (buffer) {
                            processText(buffer);
                        }
                        // Store complete summary in cache
                        summaryCache.set(idString, fullText);
                        // Show the summary divider when stream is complete
                        summaryDivider.style.display = 'block';

                        // **Display the "See on CDLI" Button**
                        const seeOnCDLIButton = document.getElementById('seeOnCDLIButton');
                        if (seeOnCDLIButton) {
                            seeOnCDLIButton.href = `https://cdli.mpiwg-berlin.mpg.de/artifacts/${artifactId}`;
                            seeOnCDLIButton.style.display = 'inline-block';
                        }

                        // Check and load video after summary is complete
                        checkAndLoadVideo(idString);
                        return;
                    }
    
                    buffer += decoder.decode(value, {stream: true});
                    processText(buffer);
                    buffer = '';
                    
                    return readStream();
                });
            }
    
            return readStream();
        })
        .catch(error => {
            if (error.name === 'AbortError') {
                console.log('Fetch aborted');
                return;
            }
            console.error('Error in generateSummary:', error);
            artifactSummary.textContent = 'An error occurred while generating the summary.';
        });
    }
    
    // Add this new function to handle video checking and loading
    function checkAndLoadVideo(artifactId) {
        fetch(`/check-video/${artifactId}`)
            .then(response => response.json())
            .then(data => {
                const dreamView = document.getElementById('dream-view');
                if (data.exists) {
                    // Show video if it exists
                    dreamView.innerHTML = `
                        <video controls>
                            <source src="/videos/${artifactId}.mp4" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>`;
                } else {
                    // Show loading message
                    dreamView.innerHTML = `
                        <div class="dreaming-message">
                            <h3>Dreaming of the Ancient Past...</h3>
                            <div class="loading-spinner"></div>
                        </div>`;
                    
                    // Poll for video availability
                    const checkVideo = setInterval(() => {
                        fetch(`/check-video/${artifactId}`)
                            .then(response => response.json())
                            .then(data => {
                                if (data.exists) {
                                    clearInterval(checkVideo);
                                    dreamView.innerHTML = `
                                        <video controls>
                                            <source src="/videos/${artifactId}.mp4" type="video/mp4">
                                            Your browser does not support the video tag.
                                        </video>`;
                                }
                            });
                    }, 5000); // Check every 5 seconds
                }
            });
    }

    function updateTable(data) {
        const tableBody = document.querySelector('#artifacts-data tbody');
        tableBody.innerHTML = '';
        
        data.forEach(artifact => {
            const row = document.createElement('tr');
            // Add the artifact ID to the row's dataset
            row.innerHTML = `
                <td>${artifact.artifact_id}</td>
                <td>${artifact.period || 'Unknown'}</td>
                <td>${artifact.excavation_no || 'Unknown'}</td>
                <td>${artifact.materials || 'Unknown'}</td>
                <td>${artifact.genres || 'Unknown'}</td>
                <td>${artifact.collections || 'Unknown'}</td>
                <td>${artifact.museum_no || 'Unknown'}</td>
            `;
            
            row.addEventListener('click', function() {
                document.querySelectorAll('#artifacts-data tbody tr').forEach(r => {
                    r.classList.remove('selected');
                });
                
                row.classList.add('selected');
                // Make sure we're using the correct artifact ID
                const artifactId = artifact.artifact_id;
                console.log('Row clicked for artifact:', artifactId);
                if (artifactId) {
                    generateSummary(artifactId);
                } else {
                    console.error('No artifact ID found for clicked row');
                }
            });
            
            tableBody.appendChild(row);
        });
    }

    function applyFilters() {
        // Get selected values from all filter controls
        let filteredData = artifactsData.filter(artifact => {
            // Check each filter
            for (let [column, select] of Object.entries(filterControls)) {
                const selectedValues = Array.from(select.selectedOptions).map(option => option.value);
                // If there are selected values and the artifact's value isn't in them, exclude it
                if (selectedValues.length > 0 && !selectedValues.includes('') && !selectedValues.includes(artifact[column])) {
                    return false;
                }
            }
            return true;
        });
    
        // Update the table with filtered data
        updateTable(filteredData);
        
        // Close the popup
        filterPopup.style.display = 'none';
    }

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
                artifactsData = data; // Store the full dataset
                updateTable(data);
                createFilterControls(data);
            })
            .catch(error => {
                console.error('Error loading artifacts data:', error);
                errorMessage.textContent = `Failed to load artifacts data: ${error.message || error}`;
            });
    }

    // Function to select a random row from the table
    function selectRandomArtifact() {
        const visibleRows = document.querySelectorAll('#artifacts-data tbody tr');
        if (visibleRows.length === 0) {
            console.error('No artifacts available to select.');
            return;
        }
    
        // Generate a random index from visible rows
        const randomIndex = Math.floor(Math.random() * visibleRows.length);
        const randomRow = visibleRows[randomIndex];
    
        if (randomRow) {
            // Scroll the table to the selected row
            randomRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
            // Remove 'selected' class from all rows
            visibleRows.forEach(row => {
                row.classList.remove('selected');
            });
    
            // Add 'selected' class to the random row
            randomRow.classList.add('selected');
    
            // Get the artifact ID from the first cell
            const artifactId = randomRow.cells[0].textContent;
            
            // Generate summary for the selected artifact
            generateSummary(artifactId);
        } else {
            console.error('Failed to select random artifact.');
        }
    }

    // New Particle Animation Logic
    const animationCtx = animationCanvas.getContext('2d');
    let animationWidth = animationCanvas.width = summaryPanel.clientWidth;
    let animationHeight = animationCanvas.height = summaryPanel.clientHeight;
    let tick = 0;
    let particles = [];
    let maxRadius = Math.sqrt((animationWidth/2)**2 + (animationHeight/2)**2);

    // Cuneiform symbols (Unicode range: 0x12000 to 0x123FF)
    const cuneiformSymbols = [];
    for (let i = 0x12000; i <= 0x123FF; i++) {
        cuneiformSymbols.push(String.fromCodePoint(i));
    }

    animationCtx.font = '24px "Segoe UI Historic", "Noto Sans Cuneiform", sans-serif';

    function Particle() {
        this.reset();
    }

    Particle.prototype.reset = function() {
        this.radian = Math.random() * Math.PI * 2;
        this.radius = 0;
        this.angSpeed = 0.025;
        this.incSpeed = 5.0;
        this.x = this.y = 0;
    }

    Particle.prototype.step = function() {
        const prevX = this.x;
        const prevY = this.y;

        this.radian += this.angSpeed;
        this.radius += this.incSpeed;

        this.x = this.radius * Math.cos(this.radian);
        this.y = this.radius * Math.sin(this.radian);

        const dx = this.x - prevX;
        const dy = this.y - prevY;
        const len = Math.sqrt(dx*dx + dy*dy);

        for (let i = 0; i <= len; i += 30) {
            const y = prevY + dy * i / len;
            const x = prevX + dx * i / len;
            
            const posX = (x / 30 | 0) * 30;
            const posY = (y / 30 | 0) * 30;

            // Make background more opaque
            animationCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            // Increase rectangle size to match new font size
            animationCtx.fillRect(animationWidth/2 + posX, animationHeight/2 + posY - 24, 30, 30);
            // Make text more opaque
            animationCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            animationCtx.fillText(cuneiformSymbols[Math.floor(Math.random() * cuneiformSymbols.length)], animationWidth/2 + posX, animationHeight/2 + posY);
        }

        if (this.radius >= maxRadius)
            this.reset();
    }

    function animParticle() {
        // Clear with more opacity for better contrast
        animationCtx.fillStyle = 'rgba(255,255,255,0.3)';
        animationCtx.fillRect(0, 0, animationWidth, animationHeight);

        tick++;

        // Reduce particle count for clearer visuals (from 100 to 50)
        if (particles.length < 50 && Math.random() < 0.3)
            particles.push(new Particle());

        particles.forEach(particle => particle.step());

        animationId = requestAnimationFrame(animParticle);
    }


    let animationId = null;

    function startAnimation() {
        // Show the animation canvas
        animationCanvas.classList.add('active');
        // Hide the toggle button text
        const buttonText = agentToggleButton.querySelector('span');
        if (buttonText) buttonText.classList.add('hidden');
        // Start the animation
        animParticle();
    }

    function stopAnimation() {
        // Hide the animation canvas
        animationCanvas.classList.remove('active');
        // Show the toggle button text
        const buttonText = agentToggleButton.querySelector('span');
        if (buttonText) buttonText.classList.remove('hidden');
        // Stop the animation
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        // Clear the canvas
        animationCtx.clearRect(0, 0, animationWidth, animationHeight);
    }

    // Update the resize handler to use new font size
    window.addEventListener('resize', () => {
        animationWidth = animationCanvas.width = summaryPanel.clientWidth;
        animationHeight = animationCanvas.height = summaryPanel.clientHeight;
        maxRadius = Math.sqrt((animationWidth/2)**2 + (animationHeight/2)**2);
        animationCtx.font = '24px "Segoe UI Historic", "Noto Sans Cuneiform", sans-serif';
        animationCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        animationCtx.fillRect(0, 0, animationWidth, animationHeight);
    });


    applyFiltersButton.addEventListener('click', applyFilters);
});
