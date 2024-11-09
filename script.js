document.addEventListener('DOMContentLoaded', () => {
    const panels = document.querySelectorAll('.panel');
    const scrapeButton = document.getElementById('scrapeButton');
    const scrapedData = document.getElementById('scrapedData');
    const promptInput = document.getElementById('promptInput');
    const promptButton = document.getElementById('promptButton');
    const promptResponse = document.getElementById('promptResponse');

    panels.forEach(panel => {
        panel.addEventListener('click', () => {
            panel.style.backgroundColor = getRandomColor();
        });
    });

    scrapeButton.addEventListener('click', async () => {
        scrapedData.textContent = 'Scraping...';
        try {
            const response = await fetch('/scrape', { method: 'POST' });
            const data = await response.text();
            scrapedData.textContent = data;
        } catch (error) {
            scrapedData.textContent = 'Error occurred while scraping.';
            console.error('Error:', error);
        }
    });

    promptButton.addEventListener('click', async () => {
        const prompt = promptInput.value;
        promptResponse.textContent = 'Processing prompt...';
        try {
            const response = await fetch('/prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });
            const data = await response.text();
            promptResponse.textContent = data;
        } catch (error) {
            promptResponse.textContent = 'Error occurred while processing prompt.';
            console.error('Error:', error);
        }
    });
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}