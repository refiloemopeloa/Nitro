
// audioManager.js
let audioContext;
let source;
let audioBuffer;
let startTime;
let isPaused = false;
let pauseTime = 0;

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    loadAudio('./src/assets/sport-rock-background-250761.mp3');
}

function loadAudio(url) {
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(buffer => {
            audioBuffer = buffer;
            playAudio();
        })
        .catch(e => console.error('Error loading audio:', e));
}

function playAudio() {
    if (isPaused) {
        startTime = audioContext.currentTime - pauseTime;
    } else {
        startTime = audioContext.currentTime;
    }

    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.loop = true;
    source.start(0, pauseTime);

    isPaused = false;
    localStorage.setItem('audioPlaying', 'true');
    localStorage.setItem('audioStartTime', startTime.toString());
    updateMuteButton();
}

function pauseAudio() {
    if (source) {
        source.stop();
        pauseTime = (audioContext.currentTime - startTime) % audioBuffer.duration;
        isPaused = true;
        localStorage.setItem('audioPlaying', 'false');
        localStorage.setItem('audioPauseTime', pauseTime.toString());
    }
}

function toggleMute() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    } else if (audioContext.state === 'running') {
        audioContext.suspend();
    }
    updateMuteButton();
}

function updateMuteButton() {
    const muteButton = document.getElementById('muteButton');
    if (muteButton) {
        muteButton.textContent = audioContext && audioContext.state === 'running' ? 'Mute' : 'Unmute';
    }
}

function navigateToPage(url) {
    pauseAudio();
    window.location.href = url;
}

window.addEventListener('load', () => {
    if (!audioContext) {
        initAudio();
    } else {
        const wasPlaying = localStorage.getItem('audioPlaying') === 'true';
        if (wasPlaying) {
            const storedStartTime = parseFloat(localStorage.getItem('audioStartTime') || '0');
            const storedPauseTime = parseFloat(localStorage.getItem('audioPauseTime') || '0');
            startTime = storedStartTime;
            pauseTime = storedPauseTime;
            playAudio();
        }
    }
    updateMuteButton();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        pauseAudio();
    } else {
        playAudio();
    }
});