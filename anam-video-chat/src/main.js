import { VideoChat } from './components/VideoChat/index.js';
import '@/styles/global.css';  // Global styles first
// import { createPersonaSetupUI, listPersonas } from './utils/personaManager';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app');
//   const setupUI = createPersonaSetupUI();
//   document.body.appendChild(setupUI);

//   listPersonas().then(personas => {
//     console.log('Current personas:', personas);
//     });

  if (!container) {
    console.error('Could not find app container');
    return;
  }
  
  try {
    new VideoChat(container);
  } catch (error) {
    console.error('Error initializing VideoChat:', error);
  }
});