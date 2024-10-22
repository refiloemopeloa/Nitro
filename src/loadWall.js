import * as CANNON from 'cannon-es';

export class WallLoader {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.wall = null;
        this.isGameWon = false;
        this.startTime = 120; // Initial game time in seconds
    }

    createWall(position, size) {
        // Create a physics body for the wall
        const wallShape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const wallBody = new CANNON.Body({
            mass: 0, // Static body
            shape: wallShape,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            isTrigger: true // Make it a trigger volume
        });

        // Add collision event listener
        wallBody.addEventListener('collide', (event) => {
            if (!this.isGameWon) {
                this.handleWallCollision();
            }
        });

        this.world.addBody(wallBody);
        this.wall = wallBody;
    }

    handleWallCollision() {
        this.isGameWon = true;
        
        // Get remaining time from timer display
        const timerDisplay = document.getElementById('timer');
        const [minutes, seconds] = timerDisplay.textContent.split(':').map(Number);
        const remainingTime = minutes * 60 + seconds;
        
        // Calculate completion time
        const completionTime = this.startTime - remainingTime;
        const completionMinutes = Math.floor(completionTime / 60);
        const completionSeconds = completionTime % 60;
        
        // Create win popup if it doesn't exist
        let winPopup = document.getElementById('win-popup');
        if (!winPopup) {
            winPopup = document.createElement('div');
            winPopup.id = 'win-popup';
            winPopup.innerHTML = `
                <div class="popup-content">
                    <h2>YOU WIN!</h2>
                    <p>Completion Time: ${completionMinutes}:${completionSeconds.toString().padStart(2, '0')}</p>
                    <button id="win-restart-button">Restart</button>
                    <button id="win-main-menu-button">Main Menu</button>
                </div>
            `;
            document.body.appendChild(winPopup);

            // Add event listeners for the buttons
            document.getElementById('win-restart-button').addEventListener('click', () => {
                location.reload();
            });

            document.getElementById('win-main-menu-button').addEventListener('click', () => {
                // Implement main menu logic here
                console.log('Main menu button clicked');
            });

            // Add styles for the win popup
            const style = document.createElement('style');
            style.textContent = `
                #win-popup {
                    display: none;
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: rgba(255, 255, 255, 0.9);
                    padding: 40px;
                    border-radius: 10px;
                    text-align: center;
                    z-index: 1000;
                }

                #win-popup button {
                    margin: 10px;
                    padding: 10px 20px;
                    font-size: 16px;
                    cursor: pointer;
                }
            `;
            document.head.appendChild(style);
        }

        // Show the win popup
        winPopup.style.display = 'block';
    }

    checkGameStatus() {
        return this.isGameWon;
    }
}