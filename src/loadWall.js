import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class WallLoader {
    constructor(scene, world, level, loadingManager, startTime = 80, onGameStateChange) {
        this.loader = new GLTFLoader(loadingManager);
        this.scene = scene;
        this.world = world;
        this.wall = null;
        this.isGameWon = false;
        this.startTime = startTime;
        this.initialTime = null;
        this.wallMesh = null;
        this.wallLight = null;
        this.glowMesh = null;
        this.level = level;
        this.onGameStateChange = onGameStateChange || (() => {}); // Callback for game state changes
    }

    setPauseState(isPaused) {
        this.onGameStateChange(isPaused);
    }

    // Method to initialize timing when game starts
    initializeTimer(customStartTime) {
        // Allow overriding the start time when initializing the timer
        if (typeof customStartTime === 'number') {
            this.startTime = customStartTime;
        }
        this.initialTime = this.startTime;
    }

    createWall(position, size) {
        // Previous wall creation code remains the same...
        const wallShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const wallBody = new CANNON.Body({
            mass: 0,
            shape: wallShape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            isTrigger: true
        });

        // Create visual representation of the wall
        const wallGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const wallMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFC000,
            transparent: true,
            opacity: 0.3,
            emissive: 0x0044aa,
            shininess: 100
        });
        this.wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        this.wallMesh.position.copy(position);
        this.scene.add(this.wallMesh);

        // Add glow effect
        const glowGeometry = new THREE.BoxGeometry(
            size.x + 0.4, 
            size.y + 0.4, 
            size.z + 0.4
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFC000,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glowMesh.position.copy(position);
        this.scene.add(this.glowMesh);

        // Add point light
        this.wallLight = new THREE.PointLight(0x0088ff, 1, 20);
        this.wallLight.position.copy(position);
        this.scene.add(this.wallLight);

        wallBody.addEventListener('collide', (event) => {
            if (!this.isGameWon) {
                this.handleWallCollision();
            }
        });

        this.world.addBody(wallBody);
        this.wall = wallBody;
    }

    async handleWallCollision() {
        if (this.initialTime === null) {
            console.error('Timer was not properly initialized');
            return;
        }

        this.isGameWon = true;
        
        const timerDisplay = document.getElementById('timer');
        const [minutes, seconds] = timerDisplay.textContent.split(':').map(Number);
        const remainingTime = minutes * 60 + seconds;
        const completionTime = this.initialTime - remainingTime;

        try {
            // Check if time qualifies for leaderboard via API
            const response = await fetch('https://app-rjelmm56pa-uc.a.run.app/leaderboards', {
                method: 'GET'
            });
            const data = await response.json();
            const levelData = data.leaderboards[this.level];
            const isTopFive = this.checkIfTopFive(completionTime, levelData?.scores || []);

            let winPopup = document.getElementById('win-popup');
            if (!winPopup) {
                winPopup = document.createElement('div');
                winPopup.id = 'win-popup';
                
                const content = isTopFive ? `
                    <div class="popup-content">
                        <h2>YOU WIN!</h2>
                        <p>Level ${this.level.slice(3)} Complete!</p>
                        <p>Completion Time: ${this.formatTime(completionTime)}</p>
                        <p class="highlight">Congratulations! You made it to the Top 5!</p>
                        <div class="name-input">
                            <input type="text" id="player-name" maxlength="15" placeholder="Enter your name">
                            <button id="submit-score">Submit Score</button>
                        </div>
                        <div class="button-container">
                            <button id="win-restart-button">Restart</button>
                            <button id="win-main-menu-button">Main Menu</button>
                        </div>
                    </div>
                ` : `
                    <div class="popup-content">
                        <h2>YOU WIN!</h2>
                        <p>Level ${this.level.slice(3)} Complete!</p>
                        <p>Completion Time: ${this.formatTime(completionTime)}</p>
                        <div class="button-container">
                            <button id="win-restart-button">Restart</button>
                            <button id="win-main-menu-button">Main Menu</button>
                        </div>
                    </div>
                `;
                
                winPopup.innerHTML = content;
                document.body.appendChild(winPopup);

                // Add event listeners
                if (isTopFive) {
                    document.getElementById('submit-score').addEventListener('click', async () => {
                        const playerName = document.getElementById('player-name').value.trim();
                        if (playerName) {
                            await this.saveScore(playerName, completionTime);
                            window.location.href = 'leaderBoard.html';
                        } else {
                            alert('Please enter your name');
                        }
                    });

                    document.getElementById('player-name').addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            document.getElementById('submit-score').click();
                        }
                    });
                }

                document.getElementById('win-restart-button').addEventListener('click', () => {
                    location.reload();
                });

                document.getElementById('win-main-menu-button').addEventListener('click', () => {
                    window.location.href = 'startPage.html';
                });

                // Add styles...
                this.addPopupStyles();
            }

            winPopup.style.display = 'block';
            this.setPauseState(true);

        } catch (error) {
            console.error('Error handling wall collision:', error);
            // Show a basic win popup if the leaderboard check fails
            this.showBasicWinPopup(completionTime);
        }
    }

    addPopupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #win-popup {
                display: none;
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(0, 0, 0, 0.9);
                padding: 40px;
                border-radius: 10px;
                text-align: center;
                z-index: 1000;
                color: white;
            }

            .popup-content {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }

            .highlight {
                color: #ffd700;
                font-weight: bold;
            }

            .name-input {
                display: flex;
                gap: 10px;
                justify-content: center;
                align-items: center;
            }

            #player-name {
                padding: 8px;
                border-radius: 4px;
                border: 1px solid #666;
                background: rgba(255, 255, 255, 0.9);
                color: black;
            }

            .button-container {
                display: flex;
                gap: 10px;
                justify-content: center;
            }

            button {
                padding: 10px 20px;
                font-size: 16px;
                cursor: pointer;
                background-color: #444;
                color: white;
                border: none;
                border-radius: 4px;
                transition: background-color 0.3s;
            }

            button:hover {
                background-color: #666;
            }

            #submit-score {
                background-color: #4CAF50;
            }

            #submit-score:hover {
                background-color: #45a049;
            }
        `;
        document.head.appendChild(style);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    checkIfTopFive(newTime, scores) {
        if (!scores || scores.length < 5) return true;
        return scores.some(entry => newTime < entry.time);
    }

    async saveScore(playerName, completionTime) {
        try {
            const response = await fetch(`https://app-rjelmm56pa-uc.a.run.app/leaderboards/${this.level}/scores`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    playerName,
                    completionTime
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save score');
            }

            const data = await response.json();
            return data.isTopFive;
        } catch (error) {
            console.error('Error saving score:', error);
            throw error;
        }
    }

    showBasicWinPopup(completionTime) {
        let winPopup = document.getElementById('win-popup');
        if (!winPopup) {
            winPopup = document.createElement('div');
            winPopup.id = 'win-popup';
            winPopup.innerHTML = `
                <div class="popup-content">
                    <h2>YOU WIN!</h2>
                    <p>Level ${this.level.slice(3)} Complete!</p>
                    <p>Completion Time: ${this.formatTime(completionTime)}</p>
                    <div class="button-container">
                        <button id="win-restart-button">Restart</button>
                        <button id="win-main-menu-button">Main Menu</button>
                    </div>
                </div>
            `;
            document.body.appendChild(winPopup);
            this.addPopupStyles();
        }
        winPopup.style.display = 'block';
        isPaused = true;
    }

    update(deltaTime) {
        if (this.wallMesh && this.glowMesh && this.wallLight) {
            const pulseFactor = (Math.sin(Date.now() * 0.003) + 1) / 2;
            this.wallMesh.material.opacity = 0.2 + 0.2 * pulseFactor;
            this.glowMesh.material.opacity = 0.1 + 0.1 * pulseFactor;
            this.wallLight.intensity = 0.8 + 0.4 * pulseFactor;
            this.wallMesh.material.emissiveIntensity = 0.3 + 0.3 * pulseFactor;
        }
    }

    checkGameStatus() {
        return this.isGameWon;
    }
}