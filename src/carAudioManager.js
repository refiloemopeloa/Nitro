// carAudioManager.js
export class CarAudioManager {
    constructor() {
        this.audioContext = null;
        this.gainNode = null;
        this.currentRPM = 0;
        this.targetRPM = 0;
        this.isRevving = false;
        this.isInitialized = false;
        this.nodes = {};
        this.volumeMultiplier = 0.4;
        this.cylinderCount = 8; // V8 engine simulation
        this.lastCylinderFire = 0;
        this.baseRPM = 800; // Lower idle RPM for deeper sound
        this.maxRPM = 5000;
    }

    async init() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Master volume
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = 0;

            // Create dynamics processing
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 20;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            this.nodes.compressor = compressor;

            // Master low-pass filter for overall tone
            const masterFilter = this.audioContext.createBiquadFilter();
            masterFilter.type = 'lowpass';
            masterFilter.frequency.value = 1000;
            masterFilter.Q.value = 0.7;

            this.nodes.masterFilter = masterFilter;

            // Initialize cylinders
            this.initializeCylinders();

            // Set up audio routing
            this.gainNode.connect(masterFilter);
            masterFilter.connect(compressor);
            compressor.connect(this.audioContext.destination);

            this.isInitialized = true;
            this.startEngine();
        } catch (error) {
            console.error('Failed to initialize car audio:', error);
        }
    }

    initializeCylinders() {
        this.nodes.cylinders = [];
        
        for (let i = 0; i < this.cylinderCount; i++) {
            // Main oscillator for fundamental frequency
            const mainOsc = this.audioContext.createOscillator();
            mainOsc.type = 'sine';
            
            // Sub oscillator for deeper tone
            const subOsc = this.audioContext.createOscillator();
            subOsc.type = 'sine';

            // Bandpass filter for main tone
            const mainFilter = this.audioContext.createBiquadFilter();
            mainFilter.type = 'bandpass';
            mainFilter.frequency.value = 50;
            mainFilter.Q.value = 1.0;

            // Low-pass filter for sub frequencies
            const subFilter = this.audioContext.createBiquadFilter();
            subFilter.type = 'lowpass';
            subFilter.frequency.value = 80;
            subFilter.Q.value = 0.5;

            // Gain nodes
            const mainGain = this.audioContext.createGain();
            mainGain.gain.value = 0;

            const subGain = this.audioContext.createGain();
            subGain.gain.value = 0;

            // Connect main oscillator chain
            mainOsc.connect(mainFilter);
            mainFilter.connect(mainGain);
            mainGain.connect(this.gainNode);

            // Connect sub oscillator chain
            subOsc.connect(subFilter);
            subFilter.connect(subGain);
            subGain.connect(this.gainNode);

            this.nodes.cylinders.push({
                mainOsc,
                subOsc,
                mainFilter,
                subFilter,
                mainGain,
                subGain
            });
        }
    }

    startEngine() {
        this.nodes.cylinders.forEach(cyl => {
            cyl.mainOsc.start();
            cyl.subOsc.start();
        });

        this.simulateCylinderFiring();
    }

    simulateCylinderFiring() {
        if (!this.isInitialized) return;

        const now = this.audioContext.currentTime;
        const rpm = this.baseRPM + (this.currentRPM * (this.maxRPM - this.baseRPM));
        
        const msPerRevolution = (60 / rpm) * 1000;
        const msPerCylinderFire = msPerRevolution / this.cylinderCount;

        if (now - this.lastCylinderFire >= msPerCylinderFire / 1000) {
            const cylinderIndex = Math.floor(Math.random() * this.cylinderCount);
            const cylinder = this.nodes.cylinders[cylinderIndex];

            // Calculate frequencies
            const mainFreq = 80 + (rpm / 30); // Lower base frequency
            const subFreq = mainFreq / 2;     // Sub-frequency for deeper tone

            // Update oscillator frequencies
            cylinder.mainOsc.frequency.setValueAtTime(mainFreq, now);
            cylinder.subOsc.frequency.setValueAtTime(subFreq, now);

            // Update filter frequencies
            cylinder.mainFilter.frequency.setValueAtTime(mainFreq * 1.5, now); //Change this to 8.5
            cylinder.subFilter.frequency.setValueAtTime(subFreq * 2, now);

            // Create the firing envelope
            cylinder.mainGain.gain.setValueAtTime(0, now);
            cylinder.mainGain.gain.linearRampToValueAtTime(0.2, now + 0.002);
            cylinder.mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            cylinder.subGain.gain.setValueAtTime(0, now);
            cylinder.subGain.gain.linearRampToValueAtTime(0.3, now + 0.004);
            cylinder.subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            this.lastCylinderFire = now;
        }

        requestAnimationFrame(() => this.simulateCylinderFiring());
    }

    setEngineSpeed(rpm) {
        const now = this.audioContext.currentTime;
        
        // Adjust master volume with RPM
        const volume = 0.2 + (rpm * this.volumeMultiplier);
        this.gainNode.gain.setTargetAtTime(volume, now, 0.1);

        // Adjust master filter frequency with RPM
        const filterFreq = 200 + (rpm * 800);
        this.nodes.masterFilter.frequency.setTargetAtTime(filterFreq, now, 0.1);
    }

    updateEngineSound() {
        if (!this.isInitialized) return;

        const rpmDiff = this.targetRPM - this.currentRPM;
        const rpmStep = this.isRevving ? 0.05 : 0.03;
        
        if (Math.abs(rpmDiff) > 0.01) {
            this.currentRPM += rpmDiff * rpmStep;
            this.setEngineSpeed(this.currentRPM);
            requestAnimationFrame(() => this.updateEngineSound());
        } else {
            this.currentRPM = this.targetRPM;
            this.setEngineSpeed(this.currentRPM);
        }
    }

    startRevving() {
        if (!this.isRevving) {
            this.isRevving = true;
            this.targetRPM = 1.0;
            this.updateEngineSound();
        }
    }

    stopRevving() {
        if (this.isRevving) {
            this.isRevving = false;
            this.targetRPM = 0;
            this.updateEngineSound();
        }
    }

    handleKeyDown(key) {
        if ((key === 'w' || key === 's') && this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
        
        if (key === 'w' || key === 's') {
            this.startRevving();
        }
    }

    handleKeyUp(key) {
        if (key === 'w' || key === 's') {
            this.stopRevving();
        }
    }
}
