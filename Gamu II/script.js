const world = document.getElementById('world');
const playerEl = document.getElementById('player');
const platformsContainer = document.getElementById('platforms-container');
const particleContainer = document.getElementById('particle-container');
const lavaEl = document.getElementById('lava');
const heightScoreEl = document.getElementById('height-score');
const freezeTimerEl = document.getElementById('freeze-timer');
const playerFreezeTimerEl = document.getElementById('player-freeze-timer');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');

const GRAVITY = 0.35;        
const WALK_SPEED = 4.0;     
const FRICTION = 0.85;      

let player = {
    x: 220,
    y: 54, 
    vx: 0,
    vy: 0,
    width: 20, 
    height: 28,
    grounded: false
};

let platforms = [];
let obstacles = []; 
let particles = [];
let lavaY = -1000; 

let lavaSpeed = 0.85;       
let maxLavaSpeed = 2.4;     
let lavaDelay = 120;        
let cameraY = 0; 
let maxClimbedHeight = 0;
let gameActive = false;
let isSinking = false;      
let playerOpacity = 1.0;
let keys = {};
let freezeTimeRemaining = 0; 
let playerFreezeTimeRemaining = 0; 
let gameLoopId = null; 

let lastX = 180; 
let currentGeneratedHeight = 2000; 

document.addEventListener('keydown', (e) => { keys[e.key] = true; });
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

function startGame() {
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    
    resetGameData();
    gameActive = true;
    isSinking = false;
    playerOpacity = 1.0;
    playerEl.style.display = 'block';
    playerEl.style.opacity = '1';
    playerEl.style.transform = 'scaleX(1)';
    playerEl.classList.remove('stunned');
    
    gameLoopId = requestAnimationFrame(gameLoop);
}

function resetGameData() {
    player.x = 220;
    player.y = 54; 
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    
    lavaY = -1000; 
    lavaDelay = 120; 
    cameraY = 0;
    maxClimbedHeight = 0;
    freezeTimeRemaining = 0;
    playerFreezeTimeRemaining = 0;
    isSinking = false;
    playerOpacity = 1.0;
    platforms = [];
    obstacles = []; 
    particles = [];
    lastX = 180;
    currentGeneratedHeight = 2000;
    
    platformsContainer.innerHTML = '';
    particleContainer.innerHTML = '';
    freezeTimerEl.style.display = 'none';
    playerFreezeTimerEl.style.display = 'none';
    lavaEl.classList.remove('frozen');
    playerEl.style.opacity = '1';
    playerEl.classList.remove('stunned');
    
    platforms.push({ id: 'floor', x: 0, y: 30, width: 480, type: 'normal', active: true });
    
    generateWorldObjects(30, currentGeneratedHeight);
    renderWorldObjects();
}

function generateWorldObjects(startY, endY) {
    let currentY = startY + 75;
    let platCounter = platforms.length;
    let obsCounter = obstacles.length;

    while (currentY < endY) {
        let width = Math.floor(Math.random() * 20) + 95; 
        
        let newX;
        let attempts = 0;
        do {
            newX = Math.floor(Math.random() * (480 - width - 40)) + 20;
            attempts++;
        } while (Math.abs(newX - lastX) < 60 && attempts < 15); 
        
        lastX = newX;
        
        // Rarity Balance: Regular (64%), Breakable (30%), Cyan Freeze (6%)
        let typeRand = Math.random();
        let type = 'normal';
        if (typeRand > 0.94) {
            type = 'freeze';     
        } else if (typeRand > 0.64) {
            type = 'breakable';  
        }

        platforms.push({
            id: 'plat_' + platCounter++,
            x: newX,
            y: currentY,
            width: width,
            type: type,
            active: true,
            timerStarted: false
        });

        let platformBelow = null;
        for (let i = platforms.length - 2; i >= 0; i--) {
            if (platforms[i].y < currentY) {
                if (!platformBelow || platforms[i].y > platformBelow.y) {
                    platformBelow = platforms[i];
                }
            }
        }

        if (Math.random() > 0.85 && platformBelow) {
            let previousPlatSurfaceY = platformBelow.y + 24;
            let airGapHeight = currentY - previousPlatSurfaceY;
            let midAirY = previousPlatSurfaceY + (airGapHeight / 2) - 12; 
            
            let spikeX = 0;
            if (platformBelow.x < 140) {
                spikeX = platformBelow.x + platformBelow.width + Math.floor(Math.random() * 40) + 15; 
            } else if (platformBelow.x > 240) {
                spikeX = platformBelow.x - Math.floor(Math.random() * 40) - 40; 
            } else {
                spikeX = (Math.random() > 0.5) ? Math.floor(Math.random() * 60) + 30 : Math.floor(Math.random() * 60) + 340; 
            }
            
            if (spikeX > 15 && spikeX < 440) {
                // FIXED BALANCING: Spikes and Freeze blocks now share a perfect 50/50 split ratio
                let obsType = (Math.random() > 0.5) ? 'spike' : 'playerFreeze';
                obstacles.push({
                    id: 'obs_' + obsCounter++,
                    x: spikeX,
                    y: midAirY, 
                    width: 24,
                    type: obsType,
                    active: true
                });
            }
        }
        
        currentY += Math.floor(Math.random() * 8) + 74; 
    }
}

function renderWorldObjects() {
    platformsContainer.innerHTML = '';
    
    for (const plat of platforms) {
        if (!plat.active) continue;
        const div = document.createElement('div');
        div.id = plat.id;
        div.className = `platform ${plat.type}`;
        div.style.left = plat.x + 'px';
        div.style.bottom = plat.y + 'px';
        div.style.width = plat.width + 'px';
        platformsContainer.appendChild(div);
    }

    for (const obs of obstacles) {
        if (!obs.active) continue;
        const div = document.createElement('div');
        div.id = obs.id;
        div.className = (obs.type === 'spike') ? 'spike-obstacle' : 'freeze-obstacle'; 
        div.style.left = obs.x + 'px';
        div.style.bottom = obs.y + 'px';
        div.style.width = obs.width + 'px';
        platformsContainer.appendChild(div);
    }
}

function gameLoop() {
    updatePlayer();
    updateLava();
    updateCamera();
    checkCollisions();
    updateParticles();
    checkGameOver();

    if (gameActive && player.y + 1000 > currentGeneratedHeight) {
        generateWorldObjects(currentGeneratedHeight, currentGeneratedHeight + 2000);
        currentGeneratedHeight += 2000;
        renderWorldObjects();
    }

    if (gameActive || isSinking) {
        playerEl.style.left = player.x + 'px';
        playerEl.style.bottom = player.y + 'px';
        playerEl.style.opacity = playerOpacity;
    }
    lavaEl.style.bottom = lavaY + 'px';
    world.style.transform = `translateY(${cameraY}px)`;

    gameLoopId = requestAnimationFrame(gameLoop);
}

function updatePlayer() {
    if (!gameActive) {
        if (isSinking) {
            player.vx *= 0.85;
            player.y -= 0.4;        
            playerOpacity -= 0.015; 
            if (playerOpacity < 0) playerOpacity = 0;
        }
        return;
    }

    if (playerFreezeTimeRemaining > 0) {
        playerFreezeTimeRemaining--;
        player.vx = 0; // Lock horizontal movement mechanics completely
        
        // Apply normal physics downward drag forces to process landings properly
        player.vy -= GRAVITY;
        player.y += player.vy;
        
        playerFreezeTimerEl.style.display = 'block';
        playerFreezeTimerEl.innerText = `FROZEN: ${(playerFreezeTimeRemaining / 60).toFixed(1)}s`;
        
        if (playerFreezeTimeRemaining === 0) {
            playerEl.classList.remove('stunned');
            playerFreezeTimerEl.style.display = 'none';
        }
        return;
    }

    if (keys['ArrowLeft']) {
        player.vx -= 0.4;
        if (player.vx < -WALK_SPEED) player.vx = -WALK_SPEED;
        playerEl.style.transform = 'scaleX(-1) translateX(-16px)'; 
    } else if (keys['ArrowRight']) {
        player.vx += 0.4;
        if (player.vx > WALK_SPEED) player.vx = WALK_SPEED;
        playerEl.style.transform = 'scaleX(1)'; 
    } else {
        player.vx *= FRICTION;
    }

    if ((keys[' '] || keys['ArrowUp'] || keys['w']) && player.grounded) {
        player.vy = 9.5; 
        player.grounded = false;
    }

    player.vy -= GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    if (player.x < -player.width) player.x = 480;
    if (player.x > 480) player.x = -player.width;

    let currentHeight = Math.floor(player.y / 10) - 5;
    if (currentHeight > maxClimbedHeight) {
        maxClimbedHeight = currentHeight;
        heightScoreEl.innerText = `Height: ${maxClimbedHeight}m`;
    }
}

function checkCollisions() {
    if (!gameActive) return;
    
    // FIXED PHYSICS ENGAGEMENT: Allows gravity checking to loop forward while frozen
    player.grounded = false;

    // 1. Obstacles Collision Checking
    for (const obs of obstacles) {
        if (!obs.active) continue;
        
        let obsTopY = obs.y + 24;

        if (
            player.x + player.width > obs.x &&
            player.x < obs.x + obs.width &&
            player.y >= obs.y && 
            player.y <= obsTopY + 4
        ) {
            if (obs.type === 'spike') {
                triggerDeathAnimation('spike');
                return; 
            } else if (obs.type === 'playerFreeze' && playerFreezeTimeRemaining <= 0) {
                obs.active = false; 
                playerFreezeTimeRemaining = 90; 
                playerEl.classList.add('stunned');
                renderWorldObjects();
                return;
            }
        }
    }

    if (!gameActive) return; 

    // 2. Platform Landing Layer (Runs normally regardless of player state condition)
    for (const plat of platforms) {
        if (!plat.active) continue;

        let topSurfaceY = plat.y + 24;

        if (
            player.x + player.width > plat.x &&
            player.x < plat.x + plat.width &&
            player.y >= topSurfaceY - 14 && 
            player.y <= topSurfaceY + 4 &&
            player.vy <= 0
        ) {
            player.y = topSurfaceY; 
            player.vy = 0;
            player.grounded = true;

            handlePlatformTriggers(plat);
            break; 
        }
    }
}

function handlePlatformTriggers(plat) {
    if (plat.timerStarted) return;
    plat.timerStarted = true;

    const el = document.getElementById(plat.id);

    if (plat.type === 'breakable') {
        if (el) el.classList.add('cracked');
        let checkLeave = setInterval(() => {
            let topSurfaceY = plat.y + 24;
            let playerLeftPlat = (player.x + player.width < plat.x || player.x > plat.x + plat.width || player.y > topSurfaceY + 2 || player.y < topSurfaceY - 2);
            if (playerLeftPlat) {
                clearInterval(checkLeave);
                plat.active = false;
                if (el) el.remove();
            }
        }, 16);
    } 
    else if (plat.type === 'freeze') {
        if (el) el.classList.add('used');
        freezeTimeRemaining = 120; 
        lavaEl.classList.add('frozen');
    }
}

function updateLava() {
    if (freezeTimeRemaining > 0) {
        freezeTimeRemaining--;
        freezeTimerEl.style.display = 'block';
        freezeTimerEl.innerText = `LAVA FROZEN: ${(freezeTimeRemaining / 60).toFixed(1)}s`;
        if (freezeTimeRemaining === 0) {
            lavaEl.classList.remove('frozen');
            freezeTimerEl.style.display = 'none';
        }
        return; 
    }

    if (lavaDelay > 0) {
        lavaDelay--;
        return; 
    }

    let currentLavaSpeed = lavaSpeed + (maxClimbedHeight * 0.0025);
    if (currentLavaSpeed > maxLavaSpeed) currentLavaSpeed = maxLavaSpeed;
    
    lavaY += currentLavaSpeed;

    if (lavaY < cameraY - 1000) {
        lavaY = cameraY - 1000;
    }
}

function updateCamera() {
    if (!gameActive) return; 
    if (player.y - cameraY > 280) {
        cameraY = player.y - 280;
    }
}

function createExplosion(x, y, colorPalette) {
    for (let i = 0; i < 40; i++) {
        const div = document.createElement('div');
        div.className = 'pixel-particle';
        
        let color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        div.style.backgroundColor = color;
        particleContainer.appendChild(div);

        particles.push({
            el: div,
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.3) * 6 + 2, 
            alpha: 1.0,
            life: Math.random() * 25 + 25
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.12; 
        p.life--;

        p.el.style.left = p.x + 'px';
        p.el.style.bottom = p.y + 'px';
        p.el.style.opacity = p.life / 50;

        if (p.life <= 0) {
            p.el.remove();
            particles.splice(i, 1);
        }
    }
}

function triggerDeathAnimation(cause) {
    if (!gameActive) return;
    gameActive = false;

    if (cause === 'spike') {
        playerEl.style.display = 'none';
        let palette = ['#ff3344', '#721c24', '#ffdbac', '#555555']; 
        createExplosion(player.x + 10, player.y, palette);
        
        setTimeout(() => {
            finalScoreEl.innerText = `You climbed: ${maxClimbedHeight}m`;
            gameOverScreen.style.display = 'flex';
        }, 1500);
    } 
    else if (cause === 'lava') {
        isSinking = true;
        
        setTimeout(() => {
            finalScoreEl.innerText = `You climbed: ${maxClimbedHeight}m`;
            gameOverScreen.style.display = 'flex';
        }, 2000); 
    }
}

function checkGameOver() {
    if (!gameActive) return;
    if (player.y < lavaY + 1000) { 
        triggerDeathAnimation('lava');
    }
}

function resetGame() {
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    resetGameData();
    gameOverScreen.style.display = 'none';
    gameActive = true;
    isSinking = false;
    playerOpacity = 1.0;
    playerEl.style.display = 'block';
    playerEl.style.opacity = '1';
    playerEl.style.transform = 'scaleX(1)';
    playerEl.classList.remove('stunned');
    gameLoopId = requestAnimationFrame(gameLoop);
}

startScreen.style.display = 'flex';
