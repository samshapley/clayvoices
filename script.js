document.addEventListener('DOMContentLoaded', function() {
    const promptInput = document.getElementById('promptInput');
    const promptButton = document.getElementById('promptButton');
    const promptResponse = document.getElementById('promptResponse');
    const errorMessage = document.getElementById('errorMessage');
    const filterButton = document.getElementById('filterButton');
    const filterPopup = document.getElementById('filterPopup');
    const closeButton = document.querySelector('.close');
    const applyFiltersButton = document.getElementById('applyFilters');
    let artifactsData = []; // Store the full dataset
    let filterControls = {};

    loadArtifactsData();
    promptButton.addEventListener('click', sendPrompt);
    filterButton.addEventListener('click', () => filterPopup.style.display = 'block');
    closeButton.addEventListener('click', () => filterPopup.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === filterPopup) filterPopup.style.display = 'none';
    });

    function createFilterControls(data) {
        const filterContainer = document.getElementById('filterControls');
        filterContainer.innerHTML = '';
        
        // Get unique values for each column
        const columns = ['id', 'name', 'language', 'material', 'period', 'provenience', 'collection'];
        columns.forEach(column => {
            const uniqueValues = [...new Set(data.map(item => item[column]))].sort();
            
            const filterGroup = document.createElement('div');
            filterGroup.className = 'filter-group';
            
            const label = document.createElement('label');
            label.textContent = column.charAt(0).toUpperCase() + column.slice(1);
            
            const select = document.createElement('select');
            select.id = `filter-${column}`;
            select.multiple = true;
            
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = `Select ${label.textContent}`;
            select.appendChild(defaultOption);
            
            uniqueValues.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });
            
            filterGroup.appendChild(label);
            filterGroup.appendChild(select);
            filterContainer.appendChild(filterGroup);
            filterControls[column] = select;
        });
    }

    function applyFilters() {
        let filteredData = [...artifactsData];
        
        Object.entries(filterControls).forEach(([column, select]) => {
            const selectedValues = Array.from(select.selectedOptions).map(option => option.value);
            if (selectedValues.length && !selectedValues.includes('')) {
                filteredData = filteredData.filter(item => selectedValues.includes(item[column]));
            }
        });
        
        updateTable(filteredData);
        filterPopup.style.display = 'none';
    }

    function updateTable(data) {
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