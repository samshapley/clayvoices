document.addEventListener('DOMContentLoaded', function() {
    const errorMessage = document.getElementById('errorMessage');
    const filterButton = document.getElementById('filterButton');
    const filterPopup = document.getElementById('filterPopup');
    const closeButton = document.querySelector('.close');
    const applyFiltersButton = document.getElementById('applyFilters');

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

    // Check if summary exists in cache
    if (summaryCache.has(idString)) {
        artifactSummary.textContent = summaryCache.get(idString);
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
        }

        function readStream() {
            return reader.read().then(({done, value}) => {
                if (done) {
                    if (buffer) {
                        processText(buffer);
                    }
                    // Store complete summary in cache
                    summaryCache.set(idString, fullText);
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

    function updateTable(data) {
        const tableBody = document.querySelector('#artifacts-data tbody');
        tableBody.innerHTML = '';
        
        data.forEach(artifact => {
            const row = document.createElement('tr');
            row.dataset.artifactId = artifact.id;
            row.innerHTML = `
                <td>${artifact.id}</td>
                <td>${artifact.name}</td>
                <td>${artifact.language}</td>
                <td>${artifact.material}</td>
                <td>${artifact.period}</td>
                <td>${artifact.provenience}</td>
                <td>${artifact.collection}</td>
            `;
            
            // Click handler to add 'selected' class
            row.addEventListener('click', function() {
                // Remove selected class from all rows
                document.querySelectorAll('#artifacts-data tbody tr').forEach(r => {
                    r.classList.remove('selected');
                });
                
                // Add selected class to clicked row
                row.classList.add('selected');
                
                console.log('Row clicked for artifact:', artifact.id);
                generateSummary(artifact.id);
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
        if (artifactsData.length === 0) {
            errorMessage.textContent = 'No artifacts available to select.';
            return;
        }

        // Generate a random index
        const randomIndex = Math.floor(Math.random() * artifactsData.length);
        const randomArtifact = artifactsData[randomIndex];

        // Find the corresponding table row
        const tableRow = document.querySelector(`#artifacts-data tbody tr[data-artifact-id="${randomArtifact.id}"]`);

        if (tableRow) {
            // Scroll the table to the selected row
            tableRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Remove 'selected' class from all rows
            document.querySelectorAll('#artifacts-data tbody tr').forEach(row => {
                row.classList.remove('selected');
            });

            // Add 'selected' class to the random row
            tableRow.classList.add('selected');

            // Trigger the click event to generate summary
            tableRow.click();
        } else {
            console.error('Random artifact row not found in the table.');
            errorMessage.textContent = 'Selected artifact not found in the table.';
        }
    }


    applyFiltersButton.addEventListener('click', applyFilters);
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
