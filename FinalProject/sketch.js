let screen = "home";
let musicPlaying = true;
let osc;
let melody = [329.63, 246.94, 220.00, 174.61, 220.00, 246.94, 329.63];
let noteDuration = 600;
let playButton, settingsButton, musicSlider, backButton, resumeButton;
let groundX = 0;
let obstacles = [];
let groundSpeed = 1;
let obstacleSpeed = 3;
let player;
let isGamePaused = false;
let inGameSettings = false;
let port;
let latestData = "0,0,0";
let joystickX = 0;
let joystickY = 0;
let joystickButton = 0;
let joystickbaseLineX = null;
let hasCalibrated = false;
let score = 0;
let redLightActive = false;
let redLightStartTime = 0;
let moveDuringRed = false;

function setup() {
  createCanvas(800, 600);

  port = createSerial();

  playButton = createButton("Play");
  
  playButton.position(width/2-50, height/2 - 50);
  playButton.mousePressed(async () => {
    osc.start();
    if (!port.opened()) {
      try {
        await port.open("Arduino", 9600);
        console.log("Connected to serial port");
        goToGame();
      } catch (err) {
        console.error("Failed to open serial port:", err);
      }
    } else {
      goToGame();
    }
  });
  mainMenuButton = createButton("Main Menu");
  mainMenuButton.position(width / 2 - 50, height / 2 + 50);
  mainMenuButton.mousePressed(() => {
    screen = "home";
    score = 0;
    groundX = 0;
    obstacles = [];
    player.y = height - 100;
    player.isJumping = false;
    hideUi();
    playButton.show();
    settingsButton.show();
    mainMenuButton.hide();
});
  mainMenuButton.hide();
  settingsButton = createButton("Settings");
  settingsButton.position(width/2-50, height/2);
  settingsButton.mousePressed(() =>{
  if(screen === "home"){
    mainMenuSettings();
  } else if(screen === "game" && isGamePaused){
    gameSettings();
  }
  });
  musicSlider = createSlider(0, 1, 0.1, 0.01);
  musicSlider.position(width/2 - 100, height/2);
  musicSlider.hide();

  backButton = createButton("Back");
  backButton.position(width/2 - 50, height/2 + 50);
  backButton.mousePressed(() => {
    if(screen === "settings" && inGameSettings){
      inGameSettings = false;
      musicSlider.hide();
      resumeButton.hide();
      screen = "game";
    } else{
      screen = "home";
      isGamePaused = false;
      inGameSettings = false;
      hideUi();
      playButton.show();
      settingsButton.show();
      osc.amp(0, 0.1);
      osc.stop();
    }
  });
  backButton.hide();

  resumeButton = createButton("Resume Game");
  resumeButton.position(width/2 - 50, height/2 + 100);
  resumeButton.mousePressed(() => {
    isGamePaused = false;
    inGameSettings = false;
    screen = "game";
    hideUi();
  });
  resumeButton.hide();

  osc = new p5.Oscillator();
  osc.setType('sine');
  osc.amp(0);
  osc.stop();

  player = new Character(width/2, height - 100, loadImage('media/boy.png'));

}

function serialEvent() {
  if (port.opened()) {
    let data = port.readUntil('\n');
    if (data.length > 0) {
      latestData = data.trim();
      let parts = latestData.split(",");

      if (parts.length >= 4 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        let rawX = int(parts[0]);
        joystickY = int(parts[1]);
        joystickButton = int(parts[2]);
        let lightState = parts[3]; 

        if (!hasCalibrated && !isNaN(rawX)) {
          joystickbaseLineX = rawX;
          hasCalibrated = true;
          console.log("Joystick baseline set to", joystickbaseLineX);
        }

        joystickX = rawX - joystickbaseLineX;

        if (lightState === "RED") {
          if (!redLightActive) {
            redLightActive = true;
            redLightStartTime = millis();
            moveDuringRed = false;
          }
        } else {
          if (redLightActive) {
            redLightActive = false;
            if (!moveDuringRed) {
              score += 2; 
            }
          }
        }
      } else {
        console.warn("Serial data malformed or non-numeric:", latestData);
      }
    }
  }
}



function draw() {
  background(220);
  serialEvent();
  osc.amp(musicSlider.value());

  const deadZone = 50;
  const isMoving = Math.abs(joystickX) > deadZone;

  //Deduct two points if player moves during red light
  if (redLightActive) {
    if (!moveDuringRed && Math.abs(joystickX) > deadZone) {
      score -= 2;
      moveDuringRed = true;
    }
  }
  if(player.jumpDuringRed){
    score -= 2;
    moveDuringRed = true;
    player.jumpDuringRed = false;
  }

  if (screen === "home") {
    displayHomeScreen();
  } else if (screen === "settings") {
    displaySettingsScreen();
  } else if (screen === "game") {
    if (isGamePaused) {
      if (inGameSettings) {
        displaySettingsScreen();
      } else {
        displayPauseMenu();
      }
    } else {
      displayGameScreen();
      moveWorld();
      checkCollision();

      //Win/Lose logic 
      if (score >= 10) {
        screen = "win";
      } else if (score <= -10) {
        screen = "lose";
      }
    }
  } else if (screen === "win") {
    textSize(40);
    textAlign(CENTER, CENTER);
    text("You Win!", width / 2, height / 2);
    mainMenuButton.show();
  } else if (screen === "lose") {
    textSize(40);
    textAlign(CENTER, CENTER);
    text("Game Over!", width / 2, height / 2);
    mainMenuButton.show();
  }
}

function displayHomeScreen(){
  textSize(32);
  textAlign(CENTER, CENTER);
  text('Stop & Go', width/2, height/4);
}
function displaySettingsScreen(){
  textSize(32);
  textAlign(CENTER, CENTER);
  text('Settings', width/2, height/3);
}
function displayGameScreen() {
  textSize(32);
  textAlign(CENTER, CENTER);
  text("Score: " + score, width / 2, height / 4);

  fill(0);
  rect(groundX, height - 50, width, 50);
  rect(groundX + width, height - 50, width, 50);

  for (let obs of [...obstacles]) {
    if(obs){
    fill(255, 0, 0);
    rect(obs.x, obs.y, obs.width, obs.height);  
    }
  }

  player.update();
  player.draw();
}
function displayPauseMenu(){
  textAlign(CENTER, CENTER);
  textSize(32);
  text('Game Pasued', width/2, height/4);
  settingsButton.show();
  backButton.html("Back");
  backButton.show();
  resumeButton.show();
}
function moveFloor(){
  if(player.x >= width - 180 && joystickX > 100){
  groundX -= groundSpeed;
  if(groundX <= -width){
    groundX = 0;
  }
  }
}
function moveObstacles(){
  if(frameCount % 60 === 0){
    let h = random(30, 50);
    let w = random(40, 80);
    let y = height - 50 - h;
    obstacles.push({
      x: width,
      y: y,
      width: w,
      height: h
    });
  }
  if(player.x >= width - 150 && joystickX > 100){
  for(let i = 0;i < obstacles.length;i++){
    obstacles[i].x -= obstacleSpeed;
    if(obstacles[i].x < -obstacles[i].width){
      obstacles.splice(i,1);
      i--;
    }
  }
}
}
//Checks if player collides with an obstacle, deducts one point if so
function checkCollision(){
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    if (!obs) continue;  

    if (collidesWithObstacles(obs)) {
      console.log("Collision, -1 point");
      score -= 1;
      obstacles.splice(i, 1);
    }
  }
}

function collidesWithObstacles(o){
  let px = 150;
  let py = player.y;
  let pw = 50;
  let ph = 50;
  return(
    px < o.x + o.width && 
    px + pw > o.x &&
    py < o.y + o.height &&
    py + ph > o.y
  );
}
function playMelody(){
  let time = 0;
  for(let i = 0; i < melody.length; i++){
    let note = melody[i];
    setTimeout(() => {
      osc.freq(note);
      osc.amp(0.1, 0.2); 
    }, time);
    setTimeout(() => {
      osc.amp(0, 0.5); 
    }, time + noteDuration);
    time += noteDuration;
  }
  setTimeout(playMelody, time + 1000);
}
//Handles game screen UI
function  goToGame(){
  screen = "game";
  playButton.hide();
  settingsButton.hide();
  backButton.show();
  musicSlider.hide();
  hideUi();
  osc.start();
  playMelody();
  mainMenuButton.hide();
}
function mainMenuSettings(){
  screen = "settings";
  playButton.hide();
  settingsButton.hide();
  backButton.show();
  musicSlider.show();
  resumeButton.hide();
}
function gameSettings(){
  inGameSettings = true;
  screen = "settings";
  musicSlider.show();
  backButton.show();
  settingsButton.hide();
  resumeButton.hide();
}
function hideUi(){
  playButton.hide();
  settingsButton.hide();
  resumeButton.hide();
  backButton.hide();
  musicSlider.hide();
  mainMenuButton.hide();
}

function keyPressed(){
  if(keyCode == ESCAPE && screen === "game"){
    isGamePaused = !isGamePaused;
    inGameSettings = false;

    if(!isGamePaused){
      hideUi();
    }
  }
}
function moveWorld(){
  const deadZone = 50;
  
  if (!hasCalibrated) return;

  const isMoving = Math.abs(joystickX) > deadZone;

  if (isMoving && joystickX > deadZone) {
    groundX -= groundSpeed;

    for (let i = 0; i < obstacles.length; i++) {
      obstacles[i].x -= obstacleSpeed;
    }

    if (groundX <= -width) {
      groundX = 0;
    }
  }

  if (frameCount % 60 === 0 && isMoving){ 
    const minGap = 150;
    const maxGap = 300;
    let lastX = obstacles.length > 0 ? obstacles[obstacles.length -1].x + obstacles[obstacles.length - 1].width : 0;
    let spawnX = max(width,lastX + minGap + random(0, maxGap - minGap));

    let h = random(30, 100);
    let w = random(40, 80);
    let y = height - 50 - h;

    obstacles.push({
      x:spawnX,
      y: y,
      width: w,
      height: h
    });
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].x + obstacles[i].width < 0) {
      obstacles.splice(i, 1);
    }
  }
}

class Character{
  constructor(x, y, sprite){
    this.x = x; 
    this.y = y;
    this.sprite = sprite;
    this.frame = 0;
    this.speed = 3;
    this.direction = 1;
    this.isJumping = false;
    this.jumpSpeed = 15;
    this.gravity = 0.4;
    this.velocityY = 0;
    this.jumpDuringRed = false;
  }
  draw(){
    push();
    translate(150, this.y);
    scale(this.direction, 1);

    let frameW = 32;
    let frameH = 32;
    let sx = (this.frame % 3) * frameW;
    let sy = this.direction === 1 ? 0 : 32;
    
    image(this.sprite, 0, 0, frameW * 2, frameH * 2, sx, sy, frameW, frameH);
    pop();
  }
  update(){
    const deadZone = 50;
    this.velocityX = 0;
    if(joystickX < -deadZone){
      this.direction = -1;
      this.velocityX = -this.speed;
      this.frame = floor(frameCount/6) % 3;
    } else if(joystickX > deadZone){
        this.direction = 1;
        this.velocityX = this.speed;
        this.frame = floor(frameCount/6) % 3;
    } else{
      this.frame = 0;
    } 
    //jump logic
    if((keyIsDown(32) || joystickButton === 1) && !this.isJumping){
      this.velocityY = -this.jumpSpeed;
      this.isJumping = true;

      if(redLightActive){
        this.jumpDuringRed = true;
      }
    }
    
    this.y += this.velocityY;
    if(this.isJumping){
      this.velocityY += this.gravity;
    }
    if(this.y > height - 100){
       this.y = height - 100;
       this.isJumping = false;
       this.velocityY = 0;  
    }
    this.x += this.velocityX;
    this.x = constrain(this.x, 0, width);
  }
}