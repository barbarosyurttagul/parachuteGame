import 'phaser';

export default class Game extends Phaser.Game {
    constructor() {
        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: 'game',
            width: 800,
            height: 600,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 200 },
                    debug: false  // Changed from true to false to hide collision boxes
                }
            },
            input: {
                keyboard: true
            },
            scene: MainScene
        };
        super(config);
    }
}

class MainScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private playerBody!: Phaser.Physics.Arcade.Body;
    private platforms!: Phaser.GameObjects.Group;
    private gameOver: boolean = false;
    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private restartKey!: Phaser.Input.Keyboard.Key;
    private parachuteDeployed: boolean = false;

    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Load game assets
        this.load.image('playerWithBag', 'assets/manWithABackBag.png');
        this.load.image('playerWithParachute', 'assets/manWithParachute.png');
        this.load.image('obstacle', 'assets/obstacle.png');
    }

    create() {
        // Reset game state
        this.gameOver = false;
        this.score = 0;
        this.parachuteDeployed = false;

        // Ensure physics system is active
        this.physics.resume();

        // Create score text
        this.scoreText = this.add.text(16, 16, 'Score: 0', { 
            fontSize: '32px', 
            color: '#fff' 
        });
        
        // Create player sprite with larger scale
        this.player = this.add.sprite(400, 100, 'playerWithBag');
        this.player.setScale(2); // Increased from 0.5 to 2
        
        // Enable physics on the player
        this.physics.add.existing(this.player);
        this.playerBody = this.player.body as Phaser.Physics.Arcade.Body;
        
        if (this.playerBody) {
            // Add some horizontal drag to make movement feel better
            this.playerBody.setDrag(300, 0);
            this.playerBody.setCollideWorldBounds(true);
            this.playerBody.setBounce(0.2);
            // Adjust collision body size to match the new scale
            this.playerBody.setSize(this.player.width * 0.8, this.player.height * 0.8);
        }
        
        // Setup keyboard controls - always reinitialize
        if (this.input.keyboard) {
            // Remove any existing keyboard listeners first
            this.input.keyboard.removeAllListeners();
            
            // Reinitialize keyboard controls
            this.cursors = this.input.keyboard.createCursorKeys();
            this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
            
            // Add keyboard event listeners
            this.input.keyboard.on('keydown-SPACE', () => {
                this.toggleParachute();
            });
        }

        // Create platforms group with physics
        this.platforms = this.add.group({
            runChildUpdate: true
        });
        
        // Add initial platforms
        this.createPlatform();

        // Add platform creation timer with shorter delay
        this.time.addEvent({
            delay: 1500, // Reduced from 2000 to make game more challenging
            callback: this.createPlatform,
            callbackScope: this,
            loop: true
        });

        // Add collision detection
        this.physics.add.collider(
            this.player,
            this.platforms,
            this.handleCollision,
            undefined,
            this
        );

        // Add score increment timer
        this.time.addEvent({
            delay: 100,
            callback: this.incrementScore,
            callbackScope: this,
            loop: true
        });

        // Add ground level detection
        this.player.on('gameobjectdown', () => {
            if (!this.gameOver && this.player.y >= 550) {  // Near bottom of game height (600)
                this.handleLanding();
            }
        });
    }

    incrementScore() {
        if (!this.gameOver && this.player.y < 550) {  // Only increment score if not on ground
            this.score += 1;
            this.scoreText.setText('Score: ' + this.score);
        }
    }

    createPlatform() {
        const y = Phaser.Math.Between(200, 550);
        
        // Create platform using the obstacle sprite with larger scale
        const platform = this.add.sprite(800, y, 'obstacle');
        platform.setScale(2); // Increased from 0.5 to 2
        
        this.physics.add.existing(platform, false);
        const platformBody = (platform.body as Phaser.Physics.Arcade.Body);
        
        // Adjust collision body size to match the new scale
        platformBody.setSize(platform.width * 0.8, platform.height * 0.8);
        platformBody.setImmovable(true);
        platformBody.setAllowGravity(false);
        
        this.platforms.add(platform);
        platformBody.setVelocityX(-150);
        
        // Check when platform is off screen and destroy it
        this.time.addEvent({
            delay: 100,
            callback: () => {
                if (platform.x < -200) {
                    platform.destroy();
                }
            },
            loop: true
        });
    }

    handleCollision() {
        if (!this.gameOver) {
            this.gameOver = true;
            this.physics.pause();
            
            // Just change the alpha instead of color since we're using sprites
            this.player.setAlpha(0.5);
            
            const gameOverText = this.add.text(400, 300, 'Game Over!\nFinal Score: ' + this.score + '\nPress R to restart', {
                fontSize: '32px',
                color: '#fff',
                align: 'center'
            }).setOrigin(0.5);
        }
    }

    handleLanding() {
        this.gameOver = true;
        
        if (this.parachuteDeployed) {
            // Safe landing with parachute
            const landingText = this.add.text(400, 300, 'Landed Safely!\nFinal Score: ' + this.score + '\nPress R to restart', {
                fontSize: '32px',
                color: '#fff',
                align: 'center'
            }).setOrigin(0.5);
        } else {
            // Crash landing without parachute
            this.player.setAlpha(0.5);
            this.physics.pause();
            const crashText = this.add.text(400, 300, 'Crash Landing!\nYou must deploy the parachute to land safely!\nPress R to restart', {
                fontSize: '32px',
                color: '#fff',
                align: 'center'
            }).setOrigin(0.5);
        }
    }

    toggleParachute() {
        if (!this.gameOver) {
            this.parachuteDeployed = !this.parachuteDeployed;
            // Switch sprites based on parachute state
            this.player.setTexture(this.parachuteDeployed ? 'playerWithParachute' : 'playerWithBag');
        }
    }

    update() {
        // Check for restart even when game is over
        if (this.restartKey?.isDown) {
            this.scene.restart();
            return;
        }

        if (this.gameOver) return;

        // Horizontal movement with null checks
        if (this.cursors?.left.isDown) {
            this.playerBody.setVelocityX(-200);
        } else if (this.cursors?.right.isDown) {
            this.playerBody.setVelocityX(200);
        } else {
            this.playerBody.setVelocityX(0);
        }
        
        // Vertical movement based on parachute state with null checks
        if (this.parachuteDeployed) {
            this.playerBody.setVelocityY(50); // Slow descent with parachute
        } else if (this.cursors?.up.isDown) {
            this.playerBody.setVelocityY(100); // Medium descent with up arrow
        } else {
            this.playerBody.setVelocityY(200); // Fast descent without parachute
        }

        // Display keyboard state for debugging with null check
        const keyboard = this.input.keyboard;
        if (keyboard && this.spaceKey && keyboard.checkDown(this.spaceKey, 250)) {
            console.log('Space held down');
        }

        // Debug info
        if (this.player && this.playerBody) {
            const debugText = this.children.list.find(child => 
                child instanceof Phaser.GameObjects.Text && 
                child.text.startsWith('Debug:')
            ) as Phaser.GameObjects.Text;

            if (!debugText) {
                this.add.text(16, 50, '', { fontSize: '16px', color: '#fff' })
                    .setText(`Debug: Player y=${Math.round(this.player.y)} vy=${Math.round(this.playerBody.velocity.y)}`);
            } else {
                debugText.setText(`Debug: Player y=${Math.round(this.player.y)} vy=${Math.round(this.playerBody.velocity.y)}`);
            }
        }

        // Check for ground contact
        if (!this.gameOver && this.player.y >= 550) {
            this.handleLanding();
        }
    }
}

// Start the game
window.onload = () => {
    new Game();
};