// audio-controller.js
let audioContext;
let source;
let gainNode;  // Add gain node for volume control
let audioBuffer;
let startTime;
let isInitialized = false;
let isPlaying = false;
let isMuted = false;
let hasInteracted = false;
let currentVolume = 1.0;  // Store current volume level

async function initAudio() {
  if (isInitialized) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioContext.createGain();  // Create gain node
  gainNode.connect(audioContext.destination);  // Connect gain to destination
  
  try {
    const response = await fetch('./src/assets/tense-atmosphere-with-haunting-dark-soundscapes-227740.mp3');
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    isInitialized = true;
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('src/audioServiceWorker.js').then(() => {
            navigator.serviceWorker.ready.then(() => {
              getStateFromServiceWorker().then(state => {
                if (state.volume !== undefined) {
                    setVolume(state.volume);  // Restore volume from service worker
                }
                if (state.isPlaying) {
                  playAudio(state.currentTime % audioBuffer.duration);
                }
              });
            });
          });
    }
  } catch (error) {
    console.error('Error initializing audio:', error);
  }
}

async function startAudioOnInteraction() {
  if (hasInteracted) return;
  hasInteracted = true;

  await initAudio();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  if (!isPlaying) {
    playAudio();
    isPlaying = true;
    updateServiceWorkerState({ isPlaying: true });
  }
}

async function playAudio(startFrom = 0) {
  if (source) {
    source.stop();
  }

  source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(gainNode);  // Connect source to gain node instead of destination
  source.loop = true;
  
  startTime = audioContext.currentTime - startFrom;
  source.start(0, startFrom);

  updateServiceWorkerState({ isPlaying: true, currentTime: startFrom });
}

function setVolume(value) {
    if (!gainNode) return;
    
    // Clamp value between 0 and 1
    currentVolume = Math.max(0, Math.min(1, value));
    gainNode.gain.value = currentVolume;
    
    // Update service worker state with new volume
    updateServiceWorkerState({ volume: currentVolume });
    
    // Update volume display if it exists
    updateVolumeDisplay();
}

function updateVolumeDisplay() {
    const volumeDisplay = document.getElementById('volumeDisplay');
    if (volumeDisplay) {
        volumeDisplay.textContent = `Volume: ${Math.round(currentVolume * 100)}%`;
    }
}

function changeVolume(delta) {
    setVolume(currentVolume + delta);
}

function pauseAudio() {
  if (source) {
    source.stop();
    const currentTime = (audioContext.currentTime - startTime) % audioBuffer.duration;
    updateServiceWorkerState({ isPlaying: false, currentTime: currentTime });
  }
}

function muteAudio() {
  if (audioContext) {
    gainNode.gain.value = 0;  // Use gain node to mute
    isMuted = true;
    updateServiceWorkerState({ isMuted: true });
  }
}

function unmuteAudio() {
  if (audioContext) {
    gainNode.gain.value = currentVolume;  // Restore previous volume
    isMuted = false;
    updateServiceWorkerState({ isMuted: false });
  }
}

function toggleMute() {
  if (isMuted) {
    unmuteAudio();
  } else {
    muteAudio();
  }
  updateMuteButton();
}

function updateMuteButton() {
  const muteButton = document.getElementById('muteButton');
  if (muteButton) {
    muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
  }
}

async function updateServiceWorkerState(newState) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      action: 'updateState',
      state: newState
    });
  }
}

async function getStateFromServiceWorker() {
  return new Promise((resolve) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      navigator.serviceWorker.controller.postMessage(
        { action: 'getState' },
        [messageChannel.port2]
      );
    } else {
      resolve({ isPlaying: false, isMuted: false, currentTime: 0, volume: 1.0 });
    }
  });
}

// Add keyboard controls for volume
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
        changeVolume(0.1);  // Increase volume by 10%
    } else if (event.key === 'ArrowDown') {
        changeVolume(-0.1);  // Decrease volume by 10%
    }
});

window.addEventListener('load', async () => {
  document.addEventListener('mousemove', startAudioOnInteraction, { once: true });
  await initAudio();
  updateMuteButton();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (isPlaying) pauseAudio();
  } else {
    getStateFromServiceWorker().then(state => {
      if (state.isPlaying) {
        playAudio(state.currentTime % audioBuffer.duration);
        isPlaying = true;
      }
    });
  }
});