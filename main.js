// src/main.js
import { Avatar } from './components/avatar';

// Initialize the avatar component when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const apiKey = import.meta.env.VITE_ANAM_API_KEY;
    const avatar = new Avatar('avatar', apiKey);
});

