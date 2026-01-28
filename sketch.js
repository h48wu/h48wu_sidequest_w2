let player = {
  x: 240,
  y: 1900, 
  r: 15,
  vy: 0,
  speed: 5,
  jumpPow: -12 
};

let gravity = 0.6;
let worldHeight = 2000; 
let camY = 0; 

// Game State: Starts at 'START' now
let anxietyReduction = 0;
let highestPoint = 2000; 
let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER', 'WIN'

let platforms = [];
let teas = [];
let portal = { x: 0, y: 0, r: 30 };

let cnv;

function setup() {
  cnv = createCanvas(480, 600);
  cnv.style('display', 'block');
  cnv.style('margin', '50px auto 0 auto'); 
  noStroke();
  textAlign(CENTER, CENTER);
  
  // Pre-generate the world so it's ready
  generateWorld();
}

function generateWorld() {
  platforms = [];
  teas = [];
  
  // 1. Create Floor
  platforms.push({ x: 0, y: worldHeight - 20, w: 480, h: 20, type: 'ground' });
  
  // 2. Generate Single Path of Reachable Platforms
  let currentY = worldHeight - 100;
  let prevX = 240; 
  
  while (currentY > 150) {
    let w = random(80, 120);
    
    // Ensure Reachability (max 200px horizontal jump)
    let minX = max(0, prevX - 200);
    let maxX = min(width - w, prevX + 200);
    let x = random(minX, maxX);
    
    platforms.push({ x: x, y: currentY, w: w, h: 20, type: 'plat' });
    
    // Tea Generation
    if (random() < 0.3) {
      teas.push({ x: x + w/2, y: currentY - 15, r: 10, collected: false });
    }
    
    prevX = x;
    currentY -= random(90, 110);
  }
  
  // 3. Portal at Top
  portal.x = width / 2;
  portal.y = 80; 
  platforms.push({ x: width/2 - 60, y: 140, w: 120, h: 20, type: 'plat' });
  
  // Reset Player
  player.x = 240;
  player.y = worldHeight - 60;
  player.vy = 0;
  highestPoint = player.y;
  anxietyReduction = 0;
}

function draw() {
  // --- STATE MANAGEMENT ---
  if (gameState === 'START') {
    drawStartScreen();
    return;
  }
  if (gameState === 'GAMEOVER') {
    drawDeathScreen();
    return;
  }
  if (gameState === 'WIN') {
    drawWinScreen();
    return;
  }

  // --- GAME LOOP ---
  
  // 1. Calculate Anxiety
  let heightPct = map(player.y, worldHeight, 0, 0, 1);
  heightPct = constrain(heightPct, 0, 1);
  let rawAnxiety = pow(heightPct, 0.7); 
  let anxietyLevel = constrain(rawAnxiety - anxietyReduction, 0, 1);
  
  // 2. Camera
  let targetCamY = player.y - height / 2;
  targetCamY = constrain(targetCamY, 0, worldHeight - height);
  camY = lerp(camY, targetCamY, 0.1);

  // 3. Draw World
  push();
  
  // Shake
  let shakeAmt = anxietyLevel * 10; 
  let shakeX = random(-shakeAmt, shakeAmt);
  let shakeY = random(-shakeAmt, shakeAmt);
  translate(shakeX, -camY + shakeY);

    // A. Background 
    let bgCalm = color(220, 240, 255); 
    let bgPanic = color(40, 10, 60);   
    let curBg = lerpColor(bgCalm, bgPanic, anxietyLevel);
    fill(curBg);
    rect(-50, camY - 50, width + 100, height + 100); 

    // B. Anxiety Text 
    let bgMessage = "";
    if (anxietyLevel < 0.3) bgMessage = "breathe...";
    else if (anxietyLevel < 0.5) bgMessage = "pulse rising"; 
    else if (anxietyLevel < 0.7) bgMessage = "DON'T LOOK DOWN";
    else bgMessage = "ALMOST THERE";

    let textAlpha = map(anxietyLevel, 0, 1, 40, 220); 
    let txtSize = map(anxietyLevel, 0, 1, 40, 90);

    fill(255, textAlpha);
    textSize(txtSize);
    textStyle(BOLD);
    text(bgMessage, width/2, camY + height/2);

    // C. Portal
    push();
    translate(portal.x, portal.y);
    rotate(frameCount * 0.05);
    noFill();
    for(let i=0; i<5; i++) {
      stroke(255, 100 + i*30, 200);
      strokeWeight(3);
      ellipse(0, 0, portal.r*2 - i*10, portal.r*1.5 - i*5);
    }
    pop();
    noStroke();
    
    if (dist(player.x, player.y, portal.x, portal.y) < portal.r) {
      gameState = 'WIN';
    }

    // D. Platforms
    let platCalm = color(100, 150, 200); 
    let platPanic = color(120, 0, 120);  
    fill(lerpColor(platCalm, platPanic, anxietyLevel));
    for (let p of platforms) {
      rect(p.x, p.y, p.w, p.h);
    }

    // E. Tea
    for (let tea of teas) {
      if (!tea.collected) {
        if (dist(player.x, player.y, tea.x, tea.y) < player.r + tea.r) {
          tea.collected = true;
          anxietyReduction += 0.15; // Weak tea effect
        }
        let bob = sin(frameCount * 0.1) * 3; 
        fill(255, 255, 150);
        stroke(100, 200, 100);
        strokeWeight(2);
        circle(tea.x, tea.y + bob, tea.r * 2);
        noStroke();
      }
    }

    // F. Player
    let playerCalm = color(0, 150, 255); 
    let playerPanic = color(255, 0, 255); 
    fill(lerpColor(playerCalm, playerPanic, anxietyLevel));
    circle(player.x, player.y, player.r * 2);

  pop(); 

  // --- 4. PHYSICS ---
  if (keyIsDown(65)) player.x -= player.speed;
  if (keyIsDown(68)) player.x += player.speed;
  player.x = constrain(player.x, player.r, width - player.r);
  
  player.vy += gravity;
  player.y += player.vy;

  if (player.y < highestPoint) highestPoint = player.y;

  let grounded = false;
  for (let p of platforms) {
    if (player.x + player.r > p.x && player.x - player.r < p.x + p.w) {
      if (player.y + player.r >= p.y && player.y + player.r <= p.y + p.h && player.vy >= 0) {
        
        // Death Condition
        if (p.type === 'ground' && (player.y - highestPoint > 240)) {
           gameState = 'GAMEOVER';
        }

        player.vy = 0;
        player.y = p.y - player.r;
        grounded = true;
        highestPoint = player.y; 
      }
    }
  }
  player.isGrounded = grounded;
}

function keyPressed() {
  if (gameState === 'START') {
    if (key === ' ') {
      gameState = 'PLAYING';
    }
  }
  else if (gameState === 'PLAYING') {
    if (key === ' ' && player.isGrounded) player.vy = player.jumpPow;
  } 
  else if (gameState === 'GAMEOVER' || gameState === 'WIN') {
    if (key === ' ') {
      generateWorld(); 
      gameState = 'PLAYING';
    }
  }
}

// --- SCREEN FUNCTIONS ---

function drawStartScreen() {
  background(220, 240, 255); // Calm Blue
  
  fill(50, 50, 100);
  textSize(40);
  textStyle(BOLD);
  text("Don't Look Down", width/2, height/2 - 120);
  
  textSize(16);
  textStyle(NORMAL);
  text("Reach the Portal at the top.", width/2, height/2 - 70);
  
  // Instructions Box
  fill(255, 150);
  rect(60, height/2 - 40, width - 120, 220, 10);
  
  fill(0);
  textAlign(LEFT);
  text("CONTROLS:", 90, height/2);
  text("• A / D to Move", 90, height/2 + 25);
  text("• SPACE to Jump", 90, height/2 + 50);
  
  text("WARNINGS:", 90, height/2 + 90);
  text("• Higher Altitude = High Anxiety (Shaking)", 90, height/2 + 115);
  text("• Drink Tea (Yellow Circles) to calm down", 90, height/2 + 140);
  
  textAlign(CENTER);
  textStyle(BOLD);
  fill(0, 100, 200);
  text("PRESS SPACE TO BEGIN", width/2, height - 60);
}

function drawDeathScreen() {
  background(0);
  fill(255);
  textSize(40);
  text("YOU FELL TOO FAR", width/2, height/2 - 20);
  textSize(20);
  fill(150);
  text("The anxiety took over.", width/2, height/2 + 20);
  fill(255);
  text("Press SPACE to restart", width/2, height/2 + 60);
}

function drawWinScreen() {
  fill(255, 255, 255, 20);
  rect(0,0,width,height);
  fill(0);
  textSize(40);
  text("ANXIETY CONQUERED", width/2, height/2 - 40);
  textSize(16);
  text("You reached a higher state of mind.", width/2, height/2);
  textSize(20);
  fill(0, 100, 200);
  text("Press SPACE to Restart", width/2, height/2 + 60);
}