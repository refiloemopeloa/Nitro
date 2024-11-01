import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class WallLoader {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.wall = null;
        this.isGameWon = false;
        this.startTime = 120;
        this.wallMesh = null;
        this.wallLight = null;
        this.glowMesh = null;
    }

    createWall(position, size) {
        // Create physics body for the wall
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
            color: 0x0088ff,
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
            color: 0x0088ff,
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

        // Add collision event listener
        wallBody.addEventListener('collide', (event) => {
            if (!this.isGameWon) {
                this.handleWallCollision();
            }
        });

        this.world.addBody(wallBody);
        this.wall = wallBody;
    }

    update(deltaTime) {
        if (this.wallMesh && this.glowMesh && this.wallLight) {
            // Make the light intensity and glow opacity pulsate
            const pulseFactor = (Math.sin(Date.now() * 0.003) + 1) / 2; // Slower pulsation than boost
            
            // Update wall transparency
            this.wallMesh.material.opacity = 0.2 + 0.2 * pulseFactor;
            
            // Update glow effect
            this.glowMesh.material.opacity = 0.1 + 0.1 * pulseFactor;
            
            // Update light intensity
            this.wallLight.intensity = 0.8 + 0.4 * pulseFactor;

            // Update wall material emissive intensity
            this.wallMesh.material.emissiveIntensity = 0.3 + 0.3 * pulseFactor;
        }
    }

    handleWallCollision() {
        this.isGameWon = true;
        
        const timerDisplay = document.getElementById('timer');
        const [minutes, seconds] = timerDisplay.textContent.split(':').map(Number);
        const remainingTime = minutes * 60 + seconds;
        const completionTime = this.startTime - remainingTime;

        // Check if time qualifies for leaderboard
        const leaderboardData = JSON.parse(localStorage.getItem('leaderboardData')) || [];
        const isTopFive = this.checkIfTopFive(completionTime, leaderboardData);

        let winPopup = document.getElementById('win-popup');
        if (!winPopup) {
            winPopup = document.createElement('div');
            winPopup.id = 'win-popup';
            
            const content = isTopFive ? `
                <div class="popup-content">
                    <h2>YOU WIN!</h2>
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
                document.getElementById('submit-score').addEventListener('click', () => {
                    const playerName = document.getElementById('player-name').value.trim();
                    if (playerName) {
                        this.saveScore(playerName, completionTime);
                        window.location.href = 'leaderBoard.html';
                    } else {
                        alert('Please enter your name');
                    }
                });

                // Allow submission with Enter key
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

        winPopup.style.display = 'block';
        isPaused = true;
    controls.disable(); // Disable car controls
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    checkIfTopFive(newTime, leaderboardData) {
        if (leaderboardData.length < 5) return true;
        return leaderboardData.some(entry => newTime < entry.time);
    }

    saveScore(playerName, completionTime) {
        let leaderboardData = JSON.parse(localStorage.getItem('leaderboardData')) || [];
        
        // Add new score
        leaderboardData.push({
            name: playerName,
            time: completionTime
        });

        // Sort by time (ascending)
        leaderboardData.sort((a, b) => a.time - b.time);

        // Keep only top 5
        leaderboardData = leaderboardData.slice(0, 5);

        // Save to localStorage
        localStorage.setItem('leaderboardData', JSON.stringify(leaderboardData));
    }

    checkGameStatus() {
        return this.isGameWon;
    }
}