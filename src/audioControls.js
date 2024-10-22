// audio-controller.js
let audioContext;
let source;
let audioBuffer;
let startTime;
let isInitialized = false;
let isPlaying = false;
let isMuted = false;
let hasInteracted = false;

async function initAudio() {
  if (isInitialized) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  try {
    const response = await fetch('./src/assets/sport-rock-background-250761.mp3');
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    isInitialized = true;
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('src/audioServiceWorker.js').then(() => {
            // Once registered, retrieve audio state and play it accordingly.
            navigator.serviceWorker.ready.then(() => {
              getStateFromServiceWorker().then(state => {
                if (state.isPlaying) {
                  playAudio(state.currentTime % audioBuffer.duration); // Resume from the last known time
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
  source.connect(audioContext.destination);
  source.loop = true;
  
  startTime = audioContext.currentTime - startFrom;
  source.start(0, startFrom);

  updateServiceWorkerState({ isPlaying: true, currentTime: startFrom });
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
    audioContext.suspend();
    isMuted = true;
    updateServiceWorkerState({ isMuted: true });
  }
}

function unmuteAudio() {
  if (audioContext) {
    audioContext.resume();
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
      resolve({ isPlaying: false, isMuted: false, currentTime: 0 });
    }
  });
}

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