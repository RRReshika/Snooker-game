
/*Graphics programming Midterm Project  
Student Name : Rajagopal Raja Reshika
Student Number : 240621557
 
COMMENTARY :
A. OVERVIEW 
This project presents an interactive 3D snooker simulation built using p5.js alongside the Matter.js physics engine.
The primary objective was to recreate the experience of a real snooker table by combining realistic physical behaviour
with intuitive user interaction. Matter.js is utilised to manage key physics elements such as collision handling, friction, 
and energy restitution, allowing the balls to move and respond in a natural and believable manner.
In addition, the application includes user-controlled cue mechanics and supports multiple gameplay modes.The visual 
interface adopts a broadcast-style design to enhance realism while ensuring clarity and ease of use throughout gameplay.

B. DESIGN AND INTERACTION 
The cue interaction was designed using a combination of mouse and keyboard input to provide greater precision and control
compared to a single-input approach. The mouse is used to aim the cue direction, while keyboard input controls shot power, 
ensuring deliberate user input and preventing the cue from behaving like an elastic band.

Matter.js was used to manage the physics system, providing reliable collision detection and allowing independent tuning 
of restitution and friction for balls and cushions. This enabled realistic energy transfer, ball deceleration, 
and rebound behaviour without requiring manual collision calculations, allowing greater focus on interaction
and visual feedback.

To enhance spatial perception and interaction clarity, a 3D model was incorporated into the design of the application. The 
3D representation improves depth awareness and helps users better judge ball positions, movement direction, and shot 
alignment. Camera perspective and lighting were carefully controlled to ensure the model complements the professional 
broadcast-style interface while remaining visually consistent with the physics-based behaviour of the game.

C.GAME MODES AND VISUAL EFFECTS 
Two gameplay difficulty modes were implemented: Regular and Beginner. The Beginner mode is designed to assist 
new players by providing a more forgiving and guided experience, while the Regular mode maintains standard gameplay
behaviour for a more realistic challenge. In all modes, the cue ball respawns at a default central position 
when required, ensuring consistent game flow and preventing unintended placement advantages.

Multiple table configurations were implemented to demonstrate different ball layouts, including standard and 
practice-based arrangements. Visual feedback was enhanced through animated ball trails that indicate speed and 
movement direction, as well as a net-style highlight effect when a ball is successfully potted. These visual cues 
improve gameplay clarity while reinforcing player actions without distracting from the core simulation.

D. EXTENSION AND EXTRA FEATURES 
Several extensions were implemented to enhance gameplay feedback, usability, and presentation beyond the base 
requirements. A dynamic game status system provides contextual information during play, while short commentary 
feedback is generated after each shot to inform the player of outcomes and interaction clarity.

Customisation features include selectable table felt colours and optional slow-motion shot playback, allowing users to 
better observe ball movement and collision behaviour. A replay feature was added to review the most recent successful pot, 
supporting learning and shot analysis. Shot control was further enhanced through a power circle indicator and mouse-based 
3D rotation and tilt of the table view, improving spatial awareness during aiming.

Additional visual extensions include a ball stack displayed along the left side of the interface, where potted balls roll 
to the base of the screen to indicate progress. A scroll-based animated home page with integrated rules and a dedicated extensions
page was also implemented to maintain a clean, professional user experience.



*/

// Main game file - handles physics and rendering
// Using p5.js for graphics and Matter.js for physics

const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Events = Matter.Events;
const Vector = Matter.Vector;
const Composite = Matter.Composite;

let rengine, rworld;

// table dimensions
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const RAIL_WIDTH = 30;
const POCKET_RADIUS = 25;
const BALL_RADIUS = 10;

// game constants
const FOUL_PENALTY = 4;
const SNAP_DELAY = 1000;

// game state

// Arrays storing game objects
let rballs = [];      // All rballs currently on table
let rcushions = [];   // Cushion/rail collision bodies
let rpockets = [];    // Pocket collision sensors
let rcueBall;         // Reference to white rcue ball
let rcue;             // Cue stick object
let rimpacts = [];    // Visual impact effects

// Scoring and player tracking
let rscores = { 1: 0, 2: 0 };  // Score for each player
let rcurrentPlayer = 1;
let rballsPottedThisTurn = 0;
let rcurrentBreak = 0;
let rfoulCommitted = false;
let rframesCompleted = 0;
let rtotalShots = 0;

let rcurrentMode = 1; // 1=Triangle, 2=Random, 3=Practice
let risAiming = false;
let risShooting = false;
let risPlacingCueBall = true;
let rgameRulesMode = 'STANDARD';
let ruiActive = false;

// replay system
let rlastShotRecording = [];
let risRecording = false;
let risReplaying = false;
let rreplayFrameIndex = 0;

let rslowMotionEnabled = false;

// table color options
let rcurrentTableColour = 'green';
let rtableColourTransition = 0;
let rtargetTableColour = 'green';

const TABLE_COLOURS = {
    green: { center: [30, 100, 60], edge: [10, 40, 25], cushion: [20, 70, 40] },
    red: { center: [100, 20, 20], edge: [50, 10, 10], cushion: [80, 15, 15] },
    black: { center: [20, 20, 25], edge: [10, 10, 12], cushion: [15, 15, 18] },
    blue: { center: [20, 50, 90], edge: [10, 25, 50], cushion: [15, 40, 70] },
    pink: { center: [255, 120, 180], edge: [230, 90, 150], cushion: [240, 105, 165] }
};

// camera control
let rtableGraphics;
let rcamAngle = 0;
let rtargetCamAngle = 0;
let rcamPhi = 0.8;
let rtargetCamPhi = 0.8;
let rcamRadius = 900;

const DEFAULT_CAM_ANGLE = 0;
const DEFAULT_CAM_PHI = 0.8;
let risAutoSnapping = false;
let rsnapPending = false;
let rsnapStartTime = 0;

function preload() {
    // using basic Web Audio API for sounds
    // will create simple synth sounds since we don't have audio files
}

function setup() {
    // check if libraries loaded
    if (typeof Matter === 'undefined' || typeof p5 === 'undefined') {
        rshowError('Libraries failed to load');
        return;
    }
    
    try {
        const canvas = createCanvas(windowWidth, windowHeight, WEBGL);
        canvas.parent('game-container');

        rtableGraphics = createGraphics(TABLE_WIDTH, TABLE_HEIGHT);

        // setup physics
        rengine = Engine.create();
        rworld = rengine.rworld;

        // tried different values here - 10 works best for smooth collisions
        rengine.positionIterations = 10;
        rengine.velocityIterations = 10;

        rengine.rworld.gravity.y = 0; // no gravity for top-down view

        rsetupTable();
        rsetupBalls(1);
    } catch (error) {
        console.error('Setup failed:', error);
        rshowError('Game initialization failed');
        return;
    }

    rcue = new Cue();

    // Initialize Rules UI
    rupdateRulesUI();

    // Initialize Board Colour Options
    rinitBoardColourOptions();

    // Click outside to close dropdown
    window.addEventListener('click', (e) => {
        let container = document.getElementById('rules-dropdown-container');
        let content = document.getElementById('rules-content');
        if (container && !container.contains(e.target)) {
            if (content && !content.classList.contains('hidden')) {
                content.classList.add('hidden');
                ruiActive = false; // Restore input when closing
            }
        }
    });

    // Collision Event
    Events.on(rengine, 'collisionStart', function (event) {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let bodyA = pairs[i].bodyA;
            let bodyB = pairs[i].bodyB;

            // Check for pocket collision
            if (bodyA.label === 'pocket' || bodyB.label === 'pocket') {
                let ballBody = bodyA.label === 'pocket' ? bodyB : bodyA;

                // Find ball object
                let ballIndex = rballs.findIndex(b => b.body === ballBody);
                if (ballIndex !== -1) {
                    let pottedBall = rballs[ballIndex];

                    // Remove ball
                    World.remove(rworld, ballBody);
                    rballs.splice(ballIndex, 1);

                    // Handle Scoring
                    if (ballBody === rcueBall.body) {
                        // FOUL: Cue ball potted
                        rfoulCommitted = true;

                        if (rgameRulesMode === 'STANDARD') {
                            // Award 4 points to opponent in Standard Mode
                            let opponent = rcurrentPlayer === 1 ? 2 : 1;
                            rscores[opponent] += 4;
                        }
                        // In Beginner Mode, just switch turn (handled in rcheckTurnState)

                        rcueBall = null;
                        setTimeout(() => {
                            // Auto-place for smoother gameplay
                            risPlacingCueBall = false;
                            rcueBall = new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2, 'white');
                            rballs.push(rcueBall);
                        }, 1000);
                    } else {
                        // Valid Pot
                        rballsPottedThisTurn++;
                        let points = 1; // Default Red
                        if (pottedBall.color === 'yellow') points = 2;
                        else if (pottedBall.color === 'green') points = 3;
                        else if (pottedBall.color === 'brown') points = 4;
                        else if (pottedBall.color === 'blue') points = 5;
                        else if (pottedBall.color === 'pink') points = 6;
                        else if (pottedBall.color === 'black') points = 7;

                        rscores[rcurrentPlayer] += points;
                        rcurrentBreak += points; // Increment break counter

                        // Update Dispenser if object ball potted
                        if (pottedBall.color !== 'white') {
                            rremoveBallFromDispenser(pottedBall.color);
                        }
                    }
                }
            }
        }
    });
}

function draw() {
    background(15, 18, 22); // Brighter charcoal/slate base tone

    if (!risReplaying) {
        Engine.update(rengine);
        rcheckTurnState();

        if (risRecording) {
            rrecordFrame();
        }
    } else {
        // Just increment frame index, drawing happens later in the loop
        rupdatePlaybackIndex();
    }

    // Safety Check: Remove rballs that fly out of bounds (prevents visual artifacts)
    for (let i = rballs.length - 1; i >= 0; i--) {
        let b = rballs[i];
        let pos = b.body.position;
        // If ball is too far from table center (tightened to 700) or fell through floor
        if (dist(pos.x, pos.y, TABLE_WIDTH / 2, TABLE_HEIGHT / 2) > 700 || pos.y > 1000) {
            World.remove(rworld, b.body);
            rballs.splice(i, 1);
        }
    }

    // Update Camera Rotation (Azimuth)
    let sliderVal = parseFloat(document.getElementById('cam-slider').value);
    if (!risAutoSnapping && abs(sliderVal - rtargetCamAngle) > 0.01) {
        rtargetCamAngle = sliderVal;
        rsnapPending = false; // Cancel snap if user moves slider
    }
    rcamAngle = lerp(rcamAngle, rtargetCamAngle, 0.1);

    // Update Camera Tilt (Elevation)
    let tiltVal = parseFloat(document.getElementById('tilt-slider').value);
    if (!risAutoSnapping && abs(tiltVal - rtargetCamPhi) > 0.01) {
        rtargetCamPhi = tiltVal;
        rsnapPending = false; // Cancel snap if user moves slider
    }
    rcamPhi = lerp(rcamPhi, rtargetCamPhi, 0.1);

    // Smart Camera Snap Logic
    if (rsnapPending && millis() - rsnapStartTime > SNAP_DELAY) {
        risAutoSnapping = true;
        rsnapPending = false;
    }

    if (risAutoSnapping) {
        rtargetCamAngle = lerp(rtargetCamAngle, DEFAULT_CAM_ANGLE, 0.05);
        rtargetCamPhi = lerp(rtargetCamPhi, DEFAULT_CAM_PHI, 0.05);

        // Sync Sliders
        document.getElementById('cam-slider').value = rtargetCamAngle;
        document.getElementById('tilt-slider').value = rtargetCamPhi;

        // Stop snapping when close enough
        if (abs(rtargetCamAngle - DEFAULT_CAM_ANGLE) < 0.001 && abs(rtargetCamPhi - DEFAULT_CAM_PHI) < 0.001) {
            rtargetCamAngle = DEFAULT_CAM_ANGLE;
            rtargetCamPhi = DEFAULT_CAM_PHI;
            risAutoSnapping = false;
        }
    }

    // Spherical to Cartesian Conversion
    // X = r * sin(phi) * sin(theta)
    // Y = -r * cos(phi) (Up is -Y in p5 WEBGL usually, but we want 0 to be top-down? No, 0 is horizontal)
    // Let's use standard: Y is Up/Down.
    // Phi 0 = Top Down? Or Phi 0 = Horizontal?
    // Let's say Phi 0 = Top Down (Y axis).
    // Y = -r * cos(phi)
    // Z = r * sin(phi) * cos(theta)

    // took me a while to get this camera math right
    let camX = rcamRadius * sin(rcamPhi) * sin(rcamAngle);
    let camY = -rcamRadius * cos(rcamPhi); // Negative because Y is down in WebGL screen coords, but we want 'up' to be negative Y
    let camZ = rcamRadius * sin(rcamPhi) * cos(rcamAngle);

    camera(camX, camY, camZ, 0, 0, 0, 0, 1, 0);

    // Update Cue logic before rendering table texture to ensure synchronization
    if (rcueBall && !risShooting && !risReplaying) {
        rcue.update();
    }

    // Render 2D Table to Texture
    rdrawTableToTexture();

    // Lighting
    ambientLight(60); // Brighter ambient for arena feel

    // Slow cinematic light movement
    let lightPulse = sin(frameCount * 0.01) * 50;
    pointLight(255, 255, 255, 0, -600 + lightPulse, 0); // Overhead main light

    // Stage Spotlights
    spotLight(255, 255, 240, 0, -800, 0, 0, 1, 0, PI / 3.5, 2); // Main table spot
    spotLight(100, 100, 120, -1000, -500, -500, 1, 0.5, 0.5, PI / 4, 1); // Side fill
    spotLight(100, 100, 120, 1000, -500, -500, -1, 0.5, 0.5, PI / 4, 1); // Side fill

    // Draw Environment (Arena)
    rdrawArena();

    // Draw 3D Table Structure
    push();
    rotateX(HALF_PI); // Rotate to lie flat on XZ plane

    // 1. Felt Surface (Texture)
    push();
    translate(0, 0, 2); // Slightly raised to avoid z-fighting with base, but below rcushions
    texture(rtableGraphics);
    noStroke();
    plane(TABLE_WIDTH, TABLE_HEIGHT);
    pop();

    // 2. Table Frame & Rails
    rdrawTableFrame();

    pop();

    // Draw Balls in 3D
    if (!risReplaying) {
        rdrawBalls3D();
    } else {
        rdrawReplayBalls3D();
    }

    // Draw Impacts
    if (!risReplaying) {
        rdrawImpacts3D();
    }

    // Draw Cue
    if (rcueBall && !risShooting && !risReplaying) {
        rcue.show3D();
    }

    // Debug Cursor (Ghost Ball)
    let mousePos = rgetMouseOnTable();
    if (mousePos) {
        push();
        translate(mousePos.x - TABLE_WIDTH / 2, -BALL_RADIUS, mousePos.y - TABLE_HEIGHT / 2);
        noStroke();
        fill(255, 255, 255, 50);
        sphere(5);
        pop();
    }

    // UI Updates
    let p1Panel = document.getElementById('player1-panel');
    let p2Panel = document.getElementById('player2-panel');

    if (p1Panel && p2Panel) {
        // Update Scores
        p1Panel.querySelector('.player-score').innerText = rscores[1];
        p2Panel.querySelector('.player-score').innerText = rscores[2];

        // Update Active State
        if (rcurrentPlayer === 1) {
            p1Panel.classList.add('active-player');
            p1Panel.classList.remove('inactive-player');
            p2Panel.classList.add('inactive-player');
            p2Panel.classList.remove('active-player');

            // Update Break Counter
            let b1 = p1Panel.querySelector('.player-break');
            let b2 = p2Panel.querySelector('.player-break');
            if (b1 && b2) {
                b1.innerText = `BREAK ${rcurrentBreak}`;
                b1.style.opacity = rcurrentBreak > 0 ? 1 : 0;
                b2.style.opacity = 0;
            }
        } else {
            p2Panel.classList.add('active-player');
            p2Panel.classList.remove('inactive-player');
            p1Panel.classList.add('inactive-player');
            p1Panel.classList.remove('active-player');

            // Update Break Counter
            let b1 = p1Panel.querySelector('.player-break');
            let b2 = p2Panel.querySelector('.player-break');
            if (b1 && b2) {
                b2.innerText = `BREAK ${rcurrentBreak}`;
                b2.style.opacity = rcurrentBreak > 0 ? 1 : 0;
                b1.style.opacity = 0;
            }
        }
    }

    let modeName = rcurrentMode === 1 ? "STANDARD" : rcurrentMode === 2 ? "RANDOM" : "PRACTICE";
    let modeEl = document.getElementById('mode-panel');
    if (modeEl) modeEl.innerText = `MODE: ${modeName}`;

    let statusEl = document.getElementById('status-panel');
    if (statusEl) {
        if (risPlacingCueBall) statusEl.innerText = "STATUS: PLACE BALL (Click D-Zone)";
        else if (risShooting) statusEl.innerText = "STATUS: SHOOTING";
        else statusEl.innerText = "STATUS: AIMING";
    }

    // Match Progress UI Updates
    let frameEl = document.getElementById('frame-count');
    let ballsEl = document.getElementById('rballs-remaining');
    let shotEl = document.getElementById('shot-count');

    if (frameEl) frameEl.innerText = rframesCompleted + 1;
    if (ballsEl) ballsEl.innerText = max(0, rballs.length - (rcueBall ? 1 : 0));
    if (shotEl) shotEl.innerText = rtotalShots;
}

function mouseWheel(event) {
    // Cancel any active or pending snap on user interaction
    risAutoSnapping = false;
    rsnapPending = false;

    // Horizontal scroll -> Rotate
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        rtargetCamAngle += event.deltaX * 0.001;
        rtargetCamAngle = constrain(rtargetCamAngle, -PI, PI);
        document.getElementById('cam-slider').value = rtargetCamAngle;
    }
    // Vertical scroll -> Tilt
    else {
        rtargetCamPhi += event.deltaY * 0.001;
        rtargetCamPhi = constrain(rtargetCamPhi, 0.2, 1.4); // Limit tilt
        document.getElementById('tilt-slider').value = rtargetCamPhi;
    }
    return false;
}

function keyPressed() {
    if (key === '1') {
        rcurrentMode = 1;
        rsetupBalls(1);
    } else if (key === '2') {
        rcurrentMode = 2;
        rsetupBalls(2);
    } else if (key === '3') {
        rcurrentMode = 3;
        rsetupBalls(3);
    } else if (key === 'r' || key === 'R') {
        rsetupBalls(rcurrentMode);
    }
}

function mousePressed(event) {
    if (ruiActive || risUIBlocking(event)) {
        if (risUIBlocking(event)) ruiActive = true;
        return;
    }

    let mousePos = rgetMouseOnTable();
    if (!mousePos) return;

    if (!risMouseOnTable(mousePos)) return;

    // Check if placing rcue ball
    if (risPlacingCueBall) {
        let localX = mousePos.x;
        let localY = mousePos.y;
        // console.log('placing at:', localX, localY);

        // Check if inside D-Zone
        let dZoneX = TABLE_WIDTH * 0.2;
        let dZoneY = TABLE_HEIGHT / 2;
        let distToCenter = dist(localX, localY, dZoneX, dZoneY);

        if (localX < dZoneX && distToCenter < 75 && localX > 0 && localY > 0 && localY < TABLE_HEIGHT) {
            Body.setPosition(rcueBall.body, { x: localX, y: localY });
            Body.setVelocity(rcueBall.body, { x: 0, y: 0 });
            risPlacingCueBall = false;
        }
    } else if (!risShooting && rcueBall) {
        rcue.startAiming();
    }
}

function mouseReleased() {
    if (rcue && rcue.risAiming) {
        // Only trigger shot if UI is not active
        // We don't check risMouseOnTable here because pulling back the rcue
        // often moves the mouse off the table bounds.
        if (!ruiActive) {
            rcue.shoot();
        } else {
            // Cancel shot if UI became active (e.g. clicked a button while aiming)
            rcue.risAiming = false;
            rcue.power = 0;
        }
    }
    // Note: ruiActive is reset by specific UI close actions or click-outside
}

function risUIBlocking(event) {
    // Check if rules dropdown is open
    let rulesContent = document.getElementById('rules-content');
    if (rulesContent && !rulesContent.classList.contains('hidden')) {
        // If clicking inside the dropdown, block game input
        let container = document.getElementById('rules-dropdown-container');
        if (container && container.contains(event.target)) return true;
    }

    // Check if clicking on other UI elements
    const uiIds = ['rules-dropdown-container', 'game-container-ui']; // Add other UI container IDs if needed
    for (let id of uiIds) {
        let el = document.getElementById(id);
        if (el && el.contains(event.target) && event.target.tagName !== 'CANVAS') return true;
    }

    return false;
}

function risMouseOnTable(pos) {
    // Add a buffer (RAIL_WIDTH) to allow clicking on the rim/rail to activate aiming
    // This is crucial when the rcue ball is tucked against the cushion.
    let buffer = RAIL_WIDTH;
    return pos.x >= -buffer && pos.x <= TABLE_WIDTH + buffer &&
        pos.y >= -buffer && pos.y <= TABLE_HEIGHT + buffer;
}

function rdrawTableToTexture() {
    let pg = rtableGraphics;
    
    // Clear the graphics buffer
    pg.clear();
    pg.background(0, 0, 0, 0);

    // Smooth colour transition
    if (rcurrentTableColour !== rtargetTableColour) {
        rtableColourTransition += 0.05;
        if (rtableColourTransition >= 1) {
            rcurrentTableColour = rtargetTableColour;
            rtableColourTransition = 0;
        }
    }

    // Get current and target colours
    let currentColours = TABLE_COLOURS[rcurrentTableColour];
    let targetColours = TABLE_COLOURS[rtargetTableColour];
    
    // Interpolate colours for smooth transition
    let t = rtableColourTransition;
    let centerR = lerp(currentColours.center[0], targetColours.center[0], t);
    let centerG = lerp(currentColours.center[1], targetColours.center[1], t);
    let centerB = lerp(currentColours.center[2], targetColours.center[2], t);
    
    let edgeR = lerp(currentColours.edge[0], targetColours.edge[0], t);
    let edgeG = lerp(currentColours.edge[1], targetColours.edge[1], t);
    let edgeB = lerp(currentColours.edge[2], targetColours.edge[2], t);
    
    let cushionR = lerp(currentColours.cushion[0], targetColours.cushion[0], t);
    let cushionG = lerp(currentColours.cushion[1], targetColours.cushion[1], t);
    let cushionB = lerp(currentColours.cushion[2], targetColours.cushion[2], t);

    // Draw Felt (Gradient)
    let ctx = pg.drawingContext;
    let gradient = ctx.createRadialGradient(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 50, TABLE_WIDTH / 2, TABLE_HEIGHT / 2, TABLE_WIDTH);
    gradient.addColorStop(0, `rgb(${centerR}, ${centerG}, ${centerB})`);
    gradient.addColorStop(1, `rgb(${edgeR}, ${edgeG}, ${edgeB})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Draw Cushions
    pg.fill(cushionR, cushionG, cushionB);
    pg.noStroke();
    // Top
    pg.rect(0, 0, TABLE_WIDTH, RAIL_WIDTH / 2);
    // Bottom
    pg.rect(0, TABLE_HEIGHT - RAIL_WIDTH / 2, TABLE_WIDTH, RAIL_WIDTH / 2);
    // Left
    pg.rect(0, 0, RAIL_WIDTH / 2, TABLE_HEIGHT);
    // Right
    pg.rect(TABLE_WIDTH - RAIL_WIDTH / 2, 0, RAIL_WIDTH / 2, TABLE_HEIGHT);

    // Draw Pockets (Seamless, dark with inner glow and rim)
    for (let p of rpockets) {
        // Outer shadow/Rim
        pg.fill(10, 10, 12);
        pg.circle(p.x, p.y, POCKET_RADIUS * 2.4);

        // Metallic Rim Detail
        pg.stroke(50);
        pg.strokeWeight(2);
        pg.noFill();
        pg.circle(p.x, p.y, POCKET_RADIUS * 2.2);
        pg.noStroke();

        // Inner void
        pg.fill(0);
        pg.circle(p.x, p.y, POCKET_RADIUS * 2);

        // Soft inner glow
        let glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, POCKET_RADIUS);
        glow.addColorStop(0, 'rgba(0, 0, 0, 1)');
        glow.addColorStop(0.8, 'rgba(0, 0, 0, 0.8)');
        glow.addColorStop(1, 'rgba(20, 50, 30, 0.2)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, TWO_PI);
        ctx.fill();

        // Beginner Mode: Pocket Highlighting
        if (rgameRulesMode === 'BEGINNER') {
            pg.stroke(212, 175, 55, 100); // Muted Gold
            pg.strokeWeight(1);
            pg.noFill();
            pg.circle(p.x, p.y, POCKET_RADIUS * 2.1 + sin(frameCount * 0.1) * 2);
            pg.noStroke();
        }

        // Pocket Highlight Assistance (New Feature)
        // Subtly highlight the pocket the player is currently aiming towards
        if (rcue.risAiming && rcueBall) {
            let shotDir = (rcue.angle + PI);
            // Normalize shotDir to [-PI, PI] to match atan2
            shotDir = atan2(sin(shotDir), cos(shotDir));

            let dx = p.x - rcueBall.body.position.x;
            let dy = p.y - rcueBall.body.position.y;
            let angleToPocket = atan2(dy, dx);

            let diff = abs(shotDir - angleToPocket);
            if (diff > PI) diff = TWO_PI - diff;

            // Increased cone to approx 35 degrees (0.6 rad) for easier identification
            if (diff < 0.6) {
                let intensity = map(diff, 0, 0.6, 1, 0);
                let pulse = sin(frameCount * 0.2) * 5;
                // High visibility alpha
                let alpha = intensity * (200 + 55 * sin(frameCount * 0.2));

                ctx.save();

                // Ensure we draw within the table bounds if possible
                // Offset the highlight slightly towards the table center to avoid clipping
                let centerX = TABLE_WIDTH / 2;
                let centerY = TABLE_HEIGHT / 2;
                let offsetX = (centerX - p.x) * 0.1;
                let offsetY = (centerY - p.y) * 0.1;

                // 1. Stronger outer glow
                let glow = ctx.createRadialGradient(p.x + offsetX, p.y + offsetY, POCKET_RADIUS, p.x + offsetX, p.y + offsetY, POCKET_RADIUS * 3);
                glow.addColorStop(0, `rgba(212, 175, 55, ${alpha / 255})`);
                glow.addColorStop(1, 'rgba(212, 175, 55, 0)');

                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p.x + offsetX, p.y + offsetY, POCKET_RADIUS * 6, 0, TWO_PI);
                ctx.fill();

                // 2. Clearer inner ring
                pg.stroke(255, 255, 255, alpha * 0.9);
                pg.strokeWeight(3);
                pg.noFill();
                pg.circle(p.x, p.y, POCKET_RADIUS * 2.2 + pulse);

                // 3. Solid center point for absolute confirmation
                pg.fill(255, 255, 255, alpha);
                pg.noStroke();
                pg.circle(p.x, p.y, 8);

                ctx.restore();
            }
        }
    }

    // Draw D-Zone Line
    pg.stroke(255, 255, 255, 30);
    pg.strokeWeight(1);
    pg.line(TABLE_WIDTH * 0.2, TABLE_HEIGHT - RAIL_WIDTH / 2, TABLE_WIDTH * 0.2, RAIL_WIDTH / 2);

    // Draw D-Zone Semi-circle
    pg.noFill();
    pg.arc(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2, 150, 150, HALF_PI, -HALF_PI);

    // Draw Spot
    pg.noStroke();
    pg.fill(0, 0, 0, 50);
    pg.circle(TABLE_WIDTH * 0.75, TABLE_HEIGHT / 2, 4); // Black spot

    // Draw Rails (Outer Frame) - Rendered as 3D geometry separately or texture border?
    // The prompt asks to preserve design. The original code drew rails OUTSIDE the table rect.
    // In 3D plane, we only see the texture.
    // So we should probably draw the rails as part of the texture if we expand the plane, OR draw them as separate 3D boxes.
    // Let's draw them as a border on the texture for now, but wait, the texture is TABLE_WIDTH x TABLE_HEIGHT.
    // The rails were drawn at -RAIL_WIDTH.
    // To keep it simple and robust, let's render the rails as 3D boxes around the plane in the main draw loop, 
    // and keep the texture just for the playing surface.
}

function rsetupTable() {
    // Define cushion physics bodies (static)
    // Make them extra thick to prevent high-speed tunneling
    const THICKNESS = 500;
    const CUSHION_INSET = RAIL_WIDTH / 2; // Visual rcushions extend 15px into table
    const cushionOptions = { isStatic: true, restitution: 0.8, friction: 0.1 };

    // Top (Inner edge at CUSHION_INSET)
    rcushions.push(Bodies.rectangle(TABLE_WIDTH / 2, CUSHION_INSET - THICKNESS / 2, TABLE_WIDTH, THICKNESS, cushionOptions));
    // Bottom (Inner edge at TABLE_HEIGHT - CUSHION_INSET)
    rcushions.push(Bodies.rectangle(TABLE_WIDTH / 2, (TABLE_HEIGHT - CUSHION_INSET) + THICKNESS / 2, TABLE_WIDTH, THICKNESS, cushionOptions));
    // Left (Inner edge at CUSHION_INSET)
    rcushions.push(Bodies.rectangle(CUSHION_INSET - THICKNESS / 2, TABLE_HEIGHT / 2, THICKNESS, TABLE_HEIGHT, cushionOptions));
    // Right (Inner edge at TABLE_WIDTH - CUSHION_INSET)
    rcushions.push(Bodies.rectangle((TABLE_WIDTH - CUSHION_INSET) + THICKNESS / 2, TABLE_HEIGHT / 2, THICKNESS, TABLE_HEIGHT, cushionOptions));

    World.add(rworld, rcushions);

    // Define Pockets (Visual positions for now, collision logic later)
    rpockets = [
        { x: 0, y: 0 },
        { x: TABLE_WIDTH / 2, y: -5 }, // Middle rpockets slightly offset
        { x: TABLE_WIDTH, y: 0 },
        { x: 0, y: TABLE_HEIGHT },
        { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + 5 },
        { x: TABLE_WIDTH, y: TABLE_HEIGHT }
    ];

    // Add Pocket Sensors
    for (let p of rpockets) {
        let sensor = Bodies.circle(p.x, p.y, POCKET_RADIUS, {
            isStatic: true,
            isSensor: true,
            label: 'pocket'
        });
        World.add(rworld, sensor);
    }
}

function rsetupBalls(mode) {
    // Clear existing rballs
    for (let b of rballs) {
        World.remove(rworld, b.body);
    }
    rballs = [];
    score = 0;
    rscores = { 1: 0, 2: 0 };
    rcurrentPlayer = 1;
    rballsPottedThisTurn = 0;
    rcurrentBreak = 0;
    rfoulCommitted = false;
    risShooting = false;
    rtotalShots = 0; // Reset shots for new frame/mode

    // Create Cue Ball
    rcueBall = new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2, 'white');
    rballs.push(rcueBall);

    // Auto-start in playing mode for convenience
    risPlacingCueBall = false;

    // Mode 1: Triangle

    // Mode 1: Triangle
    if (mode === 1) {
        let startX = TABLE_WIDTH * 0.75;
        let startY = TABLE_HEIGHT / 2;
        let rows = 5;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j <= i; j++) {
                let x = startX + i * (BALL_RADIUS * 2 + 1);
                let y = startY - (i * BALL_RADIUS) + (j * BALL_RADIUS * 2);
                rballs.push(new Ball(x, y, 'red'));
            }
        }
        // Add colored rballs (simplified positions for standard snooker)
        rballs.push(new Ball(TABLE_WIDTH * 0.9, TABLE_HEIGHT / 2, 'black'));
        rballs.push(new Ball(TABLE_WIDTH * 0.75 - BALL_RADIUS * 4, TABLE_HEIGHT / 2, 'pink'));
        rballs.push(new Ball(TABLE_WIDTH * 0.5, TABLE_HEIGHT / 2, 'blue'));
        rballs.push(new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2 - 40, 'green'));
        rballs.push(new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2, 'brown'));
        rballs.push(new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2 + 40, 'yellow'));

    } else if (mode === 2) { // Random Clusters
        for (let i = 0; i < 10; i++) {
            let x = random(TABLE_WIDTH * 0.5, TABLE_WIDTH - RAIL_WIDTH);
            let y = random(RAIL_WIDTH, TABLE_HEIGHT - RAIL_WIDTH);
            rballs.push(new Ball(x, y, 'red'));
        }
        // Add a few colors randomly
        rballs.push(new Ball(random(TABLE_WIDTH / 2, TABLE_WIDTH), random(0, TABLE_HEIGHT), 'blue'));
        rballs.push(new Ball(random(TABLE_WIDTH / 2, TABLE_WIDTH), random(0, TABLE_HEIGHT), 'black'));

    } else if (mode === 3) { // Practice
        // Just a few reds scattered
        for (let i = 0; i < 5; i++) {
            let x = random(TABLE_WIDTH * 0.3, TABLE_WIDTH - RAIL_WIDTH);
            let y = random(RAIL_WIDTH, TABLE_HEIGHT - RAIL_WIDTH);
            rballs.push(new Ball(x, y, 'red'));
        }
    }

    // Initialize Dispenser Tube
    let objectBallColors = rballs
        .filter(b => b.color !== 'white')
        .map(b => b.color);
    rinitDispenser(objectBallColors);
}

function rdrawBalls3D() {
    for (let b of rballs) {
        b.show3D();
    }
}

class Cue {
    constructor() {
        this.angle = 0;
        this.power = 0;
        this.risAiming = false;
        this.maxPower = 30;
    }

    update() {
        if (risPlacingCueBall) return;

        // Raycasting for mouse interaction
        let mousePos = rgetMouseOnTable();
        if (!mousePos) return;

        let dx = mousePos.x - rcueBall.body.position.x;
        let dy = mousePos.y - rcueBall.body.position.y;
        this.angle = atan2(dy, dx);

        if (this.risAiming) {
            let distToBall = dist(mousePos.x, mousePos.y, rcueBall.body.position.x, rcueBall.body.position.y);
            this.power = constrain(map(distToBall, 50, 300, 0, this.maxPower), 0, this.maxPower);
        }
    }

    startAiming() {
        this.risAiming = true;
    }

    shoot() {
        if (!this.risAiming) return;

        // Start Recording
        rlastShotRecording = [];
        risRecording = true;

        let force = Vector.create(cos(this.angle + PI) * this.power * 0.002, sin(this.angle + PI) * this.power * 0.002);
        Body.applyForce(rcueBall.body, rcueBall.body.position, force);

        // Spawn Impact
        rimpacts.push(new Impact(rcueBall.body.position.x, rcueBall.body.position.y));

        this.risAiming = false;
        this.power = 0;
        risShooting = true;
        rtotalShots++;

        // Reset shooting flag after some time or when rballs stop
        // risShooting will be reset in rcheckTurnState() when rballs stop moving
    }

    show3D() {
        if (risPlacingCueBall) {
            // Draw placement hint (2D overlay or 3D text)
            // For simplicity, we skip 3D text or use a simple billboard
            return;
        }

        let pos = rcueBall.body.position;

        // Disable depth test to ensure stick is always visible (on top layer)
        let gl = drawingContext;
        gl.disable(gl.DEPTH_TEST);

        push();
        // Convert physics coordinates to 3D rworld coordinates
        // Physics: (0,0) is top-left of table. 3D: (0,0,0) is center of table.
        translate(pos.x - TABLE_WIDTH / 2, -BALL_RADIUS, pos.y - TABLE_HEIGHT / 2);
        rotateY(-this.angle); // p5 3D rotation is Y-axis for horizontal

        // Aim Line (Only when actively aiming)
        if (this.risAiming) {
            // Radial Power Halo (Minimal Luxury Style)
            push();
            translate(0, BALL_RADIUS - 0.5, 0); // Position on table surface
            rotateX(PI / 2); // Lay flat
            noFill();
            let alpha = map(this.power, 0, this.maxPower, 40, 180);
            stroke(212, 175, 55, alpha); // Muted Gold
            strokeWeight(1.5);
            let haloRadius = (BALL_RADIUS + this.power * 2.5) * 2; // Diameter
            ellipse(0, 0, haloRadius, haloRadius);
            pop();

            // Power aim line
            let aimColor = lerpColor(color(255, 255, 240), color(100, 255, 255), this.power / this.maxPower);
            stroke(aimColor);
            strokeWeight(2);
            line(0, 0, 0, -this.power * 5, 0, 0); // Pull back visual

            // Forward projection
            let guideAlpha = rgameRulesMode === 'BEGINNER' ? 80 : 30;
            let guideLength = rgameRulesMode === 'BEGINNER' ? 800 : 500;
            stroke(255, 255, 255, guideAlpha);
            line(0, 0, 0, guideLength, 0, 0);
        }

        // Cue Stick
        let stickOffset = this.risAiming ? this.power * 5 + 20 : 20;
        // Cylinder is centered, so we need to shift it by half its length (150) + offset
        translate(stickOffset + 150, 0, 0);

        // Stick Model
        noStroke();
        fill(100, 60, 30);
        rotateZ(PI / 2); // Align cylinder along X
        cylinder(3, 300);

        pop();

        // Re-enable depth test
        gl.enable(gl.DEPTH_TEST);
    }
}

class Ball {
    constructor(x, y, color) {
        this.color = color;
        this.r = BALL_RADIUS;
        this.body = Bodies.circle(x, y, this.r, {
            restitution: 0.9,
            friction: 0.005,
            frictionAir: 0.02 // Simulate rolling resistance
        });
        World.add(rworld, this.body);
        this.trail = [];
    }

    show3D() {
        let pos = this.body.position;

        // Update trail
        if (Vector.magnitude(this.body.velocity) > 0.5) {
            this.trail.push({ x: pos.x, y: pos.y });
            if (this.trail.length > 10) this.trail.shift();
        } else if (this.trail.length > 0) {
            this.trail.shift();
        }

        rrenderBall3D(pos.x, pos.y, this.color, this.r);

        // Draw Trail (2D lines in 3D space)
        if (this.trail.length > 1) {
            noFill();
            strokeWeight(2);
            beginShape();
            for (let i = 0; i < this.trail.length; i++) {
                let t = this.trail[i];

                // Skip if segment is too long (teleport artifact)
                if (i > 0) {
                    let prev = this.trail[i - 1];
                    if (dist(t.x, t.y, prev.x, prev.y) > 100) {
                        endShape();
                        beginShape();
                    }
                }

                // Strict Clipping: Do not draw if point is outside table bounds (plus small margin)
                if (t.x < -50 || t.x > TABLE_WIDTH + 50 || t.y < -50 || t.y > TABLE_HEIGHT + 50) {
                    endShape();
                    beginShape();
                    continue;
                }

                let alpha = map(i, 0, this.trail.length, 0, 100);

                if (this.color === 'white') stroke(255, 255, 255, alpha);
                else if (this.color === 'red') stroke(200, 40, 40, alpha);
                else {
                    let c = color(this.color);
                    c.setAlpha(alpha);
                    stroke(c);
                }
                vertex(t.x - TABLE_WIDTH / 2, -BALL_RADIUS, t.y - TABLE_HEIGHT / 2);
            }
            endShape();
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function rdrawImpacts3D() {
    for (let i = rimpacts.length - 1; i >= 0; i--) {
        rimpacts[i].update();
        rimpacts[i].show3D();
        if (rimpacts[i].isDead()) {
            rimpacts.splice(i, 1);
        }
    }
}

class Impact {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 255;
    }

    update() {
        this.life -= 15;
    }

    show3D() {
        push();
        translate(this.x - TABLE_WIDTH / 2, -BALL_RADIUS, this.y - TABLE_HEIGHT / 2);
        noFill();
        stroke(255, 255, 255, this.life);
        strokeWeight(2);
        rotateX(PI / 2);
        circle(0, 0, (255 - this.life) / 2);
        pop();
    }

    isDead() {
        return this.life <= 0;
    }
}

// Raycasting helper to find mouse position on the 3D table plane (y = 0 in 3D rworld, but our table is at y=0 relative to center)
// Actually, our table plane is at y=0 in 3D rworld space (after translate).
// We need to cast a ray from camera to mouse position and find intersection with y=0 plane.
function rgetMouseOnTable() {
    // 1. Normalized Device Coordinates (NDC)
    let ndcX = (mouseX / width) * 2 - 1;
    let ndcY = (mouseY / height) * 2 - 1;

    // 2. Camera Properties
    // Re-calculate camera position exactly as in draw()
    let camX = rcamRadius * sin(rcamPhi) * sin(rcamAngle);
    let camY = -rcamRadius * cos(rcamPhi);
    let camZ = rcamRadius * sin(rcamPhi) * cos(rcamAngle);

    // LookAt position (0,0,0)
    let center = createVector(0, 0, 0);
    let eye = createVector(camX, camY, camZ);

    // View Matrix (LookAt)
    // p5.js doesn't expose the view matrix easily in a way we can just grab, 
    // so we can approximate or use vector math since we know the setup.

    // Forward vector (Eye to Center)
    let f = p5.Vector.sub(center, eye).normalize();
    // Up vector (0,1,0)
    let up = createVector(0, 1, 0);
    // Right vector
    let s = p5.Vector.cross(f, up).normalize();
    // Re-calculate Up (orthonormal)
    let u = p5.Vector.cross(s, f).normalize();

    // 3. Screen to World Ray
    // Field of View (vertical)
    let fov = PI / 3.0; // Default p5 fov is 60 degrees
    let aspect = width / height;

    let tanFov = Math.tan(fov / 2);

    // Ray Direction in View Space
    // We need to account for p5's coordinate system
    let viewDir = createVector(ndcX * aspect * tanFov, ndcY * tanFov, -1).normalize(); // -1 because looking down -Z in view space?
    // Actually, let's construct the ray in World Space directly using basis vectors s, u, f.

    // Ray Dir = f + s * (ndcX * aspect * tanFov) + u * (ndcY * tanFov)
    // Note: p5's Y is down in 2D, but in 3D WEBGL, Y is down? No, Y is down in screen coords, but usually Up in 3D?
    // In p5 WEBGL: X right, Y down, Z towards viewer (initially).
    // But we set camera manually.
    // Let's stick to standard raycasting logic.

    // Vertical FOV scale
    let vScale = tanFov;
    let hScale = tanFov * aspect;

    // Ray direction in camera local space
    // x maps to s, y maps to u (but inverted because screen Y is down, rworld U is up? or p5 Y is down?)
    // In p5, positive Y is down. So ndcY increases downwards.
    // Our 'u' vector calculated above is "Up" in rworld space (0,1,0) roughly.
    // So we should probably subtract u * ndcY.

    let rayDir = p5.Vector.mult(f, 1);
    rayDir.add(p5.Vector.mult(s, ndcX * hScale));
    rayDir.add(p5.Vector.mult(u, ndcY * vScale)); // Revert inversion: u is Screen Down, ndcY is Down
    rayDir.normalize();

    // 4. Intersect with Plane y = 0
    // Ray: P = Eye + t * RayDir
    // We want P.y = 0
    // 0 = Eye.y + t * RayDir.y
    // t = -Eye.y / RayDir.y

    if (abs(rayDir.y) < 0.0001) return null; // Parallel to plane

    let t = -eye.y / rayDir.y;

    if (t < 0) return null; // Behind camera

    let intersect = p5.Vector.add(eye, p5.Vector.mult(rayDir, t));

    // 5. Convert intersection to Table Coordinates
    // World (0,0,0) is center of table.
    // Physics (0,0) is top-left.
    // So Physics X = Intersect.X + TABLE_WIDTH/2
    // Physics Y = Intersect.Z + TABLE_HEIGHT/2  (Since we mapped Z to Y in our 3D setup logic: translate(pos.x, ..., pos.y))

    let tableX = intersect.x + TABLE_WIDTH / 2;
    let tableY = intersect.z + TABLE_HEIGHT / 2;

    return createVector(tableX, tableY);
}

function rcheckTurnState() {
    if (!risShooting) return;

    let isMoving = false;
    // Check if any ball is moving
    for (let b of rballs) {
        if (Vector.magnitude(b.body.velocity) > 0.05) {
            isMoving = true;
            break;
        }
    }

    // Also check if rcue ball is off table (handled in collision but good safety)
    if (!rcueBall) isMoving = true;

    if (!isMoving) {
        // Turn Logic
        if (rballsPottedThisTurn === 0 || rfoulCommitted) {
            if (rfoulCommitted) {
                if (rgameRulesMode === 'BEGINNER') {
                    rshowFeedback("FOUL – TURN SWITCHED");
                } else {
                    rshowFeedback("FOUL");
                }
            } else {
                rshowFeedback("MISS");
            }

            // Switch Turn
            setTimeout(() => {
                rcurrentPlayer = rcurrentPlayer === 1 ? 2 : 1;
                rcurrentBreak = 0; // Reset break on turn switch
                rshowFeedback("TURN SWITCHED");
            }, 1000);
        } else {
            rshowFeedback("GOOD POT");
            if (rcurrentBreak > 0) {
                setTimeout(() => rshowFeedback("BREAK CONTINUES"), 1500);
            }
        }

        // Reset Turn State
        rballsPottedThisTurn = 0;
        rfoulCommitted = false;
        risShooting = false;
        risRecording = false; // Stop recording when rballs stop

        // Trigger Smart Camera Snap
        rsnapPending = true;
        rsnapStartTime = millis();

        // Check for Frame Completion
        if (rballs.length === 1 && rcueBall) {
            rshowFeedback("FRAME COMPLETED");
            rframesCompleted++;
            setTimeout(() => {
                rsetupBalls(rcurrentMode);
            }, 2000);
        }
    }
}

function rdrawTableFrame() {
    let railDepth = 40;
    let railHeight = 30;
    let cushionDepth = 15;

    noStroke();

    // Rails (Wood)
    fill(60, 40, 30); // Dark Walnut

    // Top Rail
    push();
    translate(0, -(TABLE_HEIGHT / 2 + railDepth / 2), 10);
    box(TABLE_WIDTH + railDepth * 2, railDepth, railHeight);
    pop();

    // Bottom Rail
    push();
    translate(0, (TABLE_HEIGHT / 2 + railDepth / 2), 10);
    box(TABLE_WIDTH + railDepth * 2, railDepth, railHeight);
    pop();

    // Left Rail
    push();
    translate(-(TABLE_WIDTH / 2 + railDepth / 2), 0, 10);
    box(railDepth, TABLE_HEIGHT, railHeight);
    pop();

    // Right Rail
    push();
    translate((TABLE_WIDTH / 2 + railDepth / 2), 0, 10);
    box(railDepth, TABLE_HEIGHT, railHeight);
    pop();

    // Cushions (Green)
    fill(20, 80, 40);

    // Top Cushion
    push();
    translate(0, -(TABLE_HEIGHT / 2 - cushionDepth / 2), 5);
    box(TABLE_WIDTH, cushionDepth, railHeight * 0.8);
    pop();

    // Bottom Cushion
    push();
    translate(0, (TABLE_HEIGHT / 2 - cushionDepth / 2), 5);
    box(TABLE_WIDTH, cushionDepth, railHeight * 0.8);
    pop();

    // Left Cushion
    push();
    translate(-(TABLE_WIDTH / 2 - cushionDepth / 2), 0, 5);
    box(cushionDepth, TABLE_HEIGHT - cushionDepth * 2, railHeight * 0.8);
    pop();

    // Right Cushion
    push();
    translate((TABLE_WIDTH / 2 - cushionDepth / 2), 0, 5);
    box(cushionDepth, TABLE_HEIGHT - cushionDepth * 2, railHeight * 0.8);
    pop();

    // Legs / Base
    fill(20, 15, 10); // Very dark wood
    push();
    translate(0, 0, -100); // Below table
    box(TABLE_WIDTH * 0.8, TABLE_HEIGHT * 0.8, 200); // Central pedestal/base
    pop();

    // Pockets (Visual depth)
    fill(0);
    for (let p of rpockets) {
        push();
        translate(p.x - TABLE_WIDTH / 2, p.y - TABLE_HEIGHT / 2, 0);
        cylinder(POCKET_RADIUS, 20);
        pop();
    }
}

function rdrawArena() {
    // 1. Arena Floor (Large, grounded plane)
    push();
    translate(0, 200, 0); // Below table
    rotateX(HALF_PI);
    noStroke();
    fill(20, 22, 26); // Slate grey floor
    plane(5000, 5000);
    pop();

    // 2. Angled Light Blades (Architectural Depth)
    const bladeCount = 6;
    const radius = 1800;
    const intensity = map(sin(frameCount * 0.01), -1, 1, 30, 60); // Breathing intensity

    for (let i = 0; i < bladeCount; i++) {
        // Asymmetric positioning
        let angle = (TWO_PI / bladeCount) * i + (i * 0.2);
        let x = cos(angle) * radius;
        let z = sin(angle) * radius;

        push();
        translate(x, 0, z);
        rotateY(-angle + HALF_PI);

        // Inward Tilt (Asymmetric)
        let tiltX = map(i, 0, bladeCount, 0.1, 0.3);
        let tiltZ = map(i, 0, bladeCount, -0.05, 0.05);
        rotateX(tiltX);
        rotateZ(tiltZ);

        // Blade Geometry (Tapered effect using two boxes)
        noStroke();
        emissiveMaterial(intensity, intensity + 5, intensity + 15);

        // Base (Thicker)
        push();
        translate(0, 200, 0);
        box(80, 600, 20);
        pop();

        // Top (Slimmer)
        push();
        translate(0, -300, 0);
        box(40, 400, 10);
        pop();

        // Subtle Surface Glow
        translate(0, 0, 12);
        fill(120, 130, 150, 30);
        plane(60, 1000);
        pop();
    }

    // 3. Ambient Haze / Background Glow
    push();
    noStroke();
    fill(25, 30, 40, 15); // Soft blue-grey haze
    translate(0, 0, -2000);
    plane(8000, 4000);
    pop();
}

function rshowFeedback(message) {
    let el = document.getElementById('shot-feedback');
    if (!el) return;

    if (message === "TURN SWITCHED") {
        el.innerHTML = `
            <div class="feedback-text" style="animation: punch-in 0.4s ease-out">
                <span class="turn">TURN</span>
                <span class="switched">SWITCHED</span>
            </div>
            <div class="feedback-accent"></div>
        `;
    } else {
        el.innerHTML = `
            <div class="feedback-text standard">${message}</div>
            <div class="feedback-accent"></div>
        `;
    }

    el.style.opacity = 1;

    setTimeout(() => {
        // Only fade out if the message hasn't changed
        if (el.innerText.includes(message.split(' ')[0])) {
            el.style.opacity = 0;
        }
    }, 1500);
}

function rtoggleRules() {
    rgameRulesMode = rgameRulesMode === 'STANDARD' ? 'BEGINNER' : 'STANDARD';
    rupdateRulesUI();

    // Immediate feedback
    rshowFeedback(`MODE: ${rgameRulesMode}`);
}

function rtoggleRulesDropdown() {
    let content = document.getElementById('rules-content');
    if (content) {
        let isOpening = content.classList.contains('hidden');
        content.classList.toggle('hidden');
        ruiActive = isOpening;
    }
}

function rupdateRulesUI() {
    let header = document.getElementById('rules-header');
    let list = document.getElementById('rules-list');
    let btn = document.getElementById('rules-mode-btn');

    if (!header || !list || !btn) return;

    header.innerText = `RULES: ${rgameRulesMode} ▾`;
    btn.innerText = `SWITCH TO ${rgameRulesMode === 'STANDARD' ? 'BEGINNER' : 'STANDARD'}`;

    let rules = [];
    if (rgameRulesMode === 'BEGINNER') {
        rules = [
            "Simplified fouls (no point penalties)",
            "Enhanced aiming guides enabled",
            "Pocket highlighting active",
            "Cue ball auto-respawns in D-Zone"
        ];
    } else {
        rules = [
            "Standard snooker foul penalties (min 4 pts)",
            "Wrong ball first is a foul",
            "Reduced visual assists for authentic feel",
            "Full break counter tracking"
        ];
    }

    list.innerHTML = rules.map(r => `<li>${r}</li>`).join('');
}
function rrecordFrame() {
    let frame = {
        rballs: rballs.map(b => ({
            x: b.body.position.x,
            y: b.body.position.y,
            color: b.color
        }))
    };
    rlastShotRecording.push(frame);
}

function rplayVisualReplay() {
    if (rlastShotRecording.length === 0) {
        rshowFeedback("NO SHOT TO REPLAY");
        return;
    }
    if (risShooting || risReplaying) return;

    risReplaying = true;
    rreplayFrameIndex = 0;
    rshowFeedback("REPLAYING SHOT");
}

function rupdatePlaybackIndex() {
    if (rreplayFrameIndex >= rlastShotRecording.length) {
        risReplaying = false;
        rshowFeedback("REPLAY FINISHED");
        return;
    }
    rreplayFrameIndex++;
}

function rdrawReplayBalls3D() {
    // Safety check for index
    let idx = min(rreplayFrameIndex, rlastShotRecording.length - 1);
    let frame = rlastShotRecording[idx];
    if (!frame) return;

    for (let b of frame.rballs) {
        rrenderBall3D(b.x, b.y, b.color, BALL_RADIUS);
    }
}

function rrenderBall3D(x, y, ballColor, r) {
    push();
    translate(x - TABLE_WIDTH / 2, -BALL_RADIUS, y - TABLE_HEIGHT / 2);

    // Explicitly reset styles to prevent bleeding
    noStroke();

    // Ball Material (Shiny)
    specularMaterial(255); // White highlight
    shininess(50); // Glossy finish

    // Ball Color (Diffuse)
    if (ballColor === 'white') fill(240);
    else if (ballColor === 'red') fill(200, 40, 40);
    else fill(ballColor);

    sphere(r);
    pop();
}

function rinitDispenser(colors) {
    let tube = document.getElementById('ball-dispenser-tube');
    if (!tube) return;
    tube.innerHTML = '';
    for (let color of colors) {
        let ball = document.createElement('div');
        ball.className = `dispenser-ball ball-${color}`;
        tube.appendChild(ball);
    }
}

function rremoveBallFromDispenser(color) {
    let tube = document.getElementById('ball-dispenser-tube');
    if (!tube) return;
    let ballsInTube = tube.getElementsByClassName(`ball-${color}`);

    // Find the first ball of this color
    let targetBall = null;
    for (let i = ballsInTube.length - 1; i >= 0; i--) {
        if (!ballsInTube[i].classList.contains('animating-out')) {
            targetBall = ballsInTube[i];
            break;
        }
    }

    if (!targetBall) return;

    // 1. Capture initial position
    let rect = targetBall.getBoundingClientRect();
    let startX = rect.left + 30; // Offset to the right to fall parallel to the stack
    let startY = rect.top;

    // 2. Create clone for animation
    let clone = targetBall.cloneNode(true);
    clone.classList.add('dispenser-ball-clone');
    clone.style.position = 'fixed';
    clone.style.left = startX + 'px';
    clone.style.top = startY + 'px';
    clone.style.zIndex = '1000';
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    clone.style.display = 'block';
    document.body.appendChild(clone);

    // 3. Smoothly collapse the space in the tube
    targetBall.classList.add('animating-out');
    targetBall.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    targetBall.style.height = '0';
    targetBall.style.margin = '0';
    targetBall.style.opacity = '0';
    targetBall.style.padding = '0';

    // Remove from DOM after the collapse animation
    setTimeout(() => {
        if (targetBall && targetBall.parentNode) {
            targetBall.remove();
        }
    }, 600);

    // 4. Animation Physics
    let x = startX;
    let y = startY;
    let vx = 3.0; // Horizontal speed for the roll
    let vy = -2;
    let gravity = 0.7;
    let restitution = 0.5; // Lower restitution for a quicker transition to roll
    let bounces = 0;
    let maxBounces = 1; // Exactly one bounce
    let currentScale = 1.0;
    let targetScale = 1.25;

    let floor = window.innerHeight;
    let isRolling = false;

    function animate() {
        if (currentScale < targetScale) {
            currentScale += 0.015;
        }

        let ballHeight = 18 * currentScale;

        if (!isRolling) {
            vy += gravity;
            y += vy;
            x += vx;

            // Bounce logic
            if (y + ballHeight > floor) {
                y = floor - ballHeight;
                vy = -vy * restitution;
                bounces++;

                if (bounces > maxBounces) {
                    isRolling = true;
                    vy = 0;
                }
            }
        } else {
            // Roll logic
            x += vx;
            y = floor - ballHeight; // Keep it on the floor
        }

        // Apply translation, scaling, and rotation
        clone.style.transform = `translate(${x - startX}px, ${y - startY}px) scale(${currentScale}) rotate(${x * 8}deg)`;

        // Exit screen check
        if (x < window.innerWidth + 50) {
            requestAnimationFrame(animate);
        } else {
            clone.remove();
        }
    }

    requestAnimationFrame(animate);
}

// Slow-Motion Toggle Function
function rtoggleSlowMotion() {
    rslowMotionEnabled = !rslowMotionEnabled;

    let btn = document.getElementById('slowmo-btn');

    if (rslowMotionEnabled) {
        rengine.timing.timeScale = 0.5; // 50% speed
        btn.textContent = 'SLOW-MO: ON';
        btn.classList.add('active');
    } else {
        rengine.timing.timeScale = 1.0; // Normal speed
        btn.textContent = 'SLOW-MO: OFF';
        btn.classList.remove('active');
    }
}

// Board Colour Options Functions
function rinitBoardColourOptions() {
    // Click outside to close dropdown
    window.addEventListener('click', (e) => {
        let container = document.getElementById('colour-dropdown-container');
        let content = document.getElementById('colour-content');
        if (container && !container.contains(e.target)) {
            if (content && !content.classList.contains('hidden')) {
                content.classList.add('hidden');
            }
        }
    });
}

function rtoggleColourDropdown() {
    let content = document.getElementById('colour-content');
    content.classList.toggle('hidden');
}

function rselectTableColour(colour) {
    if (TABLE_COLOURS[colour]) {
        rtargetTableColour = colour;
        rtableColourTransition = 0;
        
        // Update display name
        let colourName = colour.charAt(0).toUpperCase() + colour.slice(1);
        document.getElementById('current-colour-name').textContent = colourName.toUpperCase();
        
        // Close dropdown
        document.getElementById('colour-content').classList.add('hidden');
    }
}

function rchangeTableColour(colour) {
    if (TABLE_COLOURS[colour]) {
        rtargetTableColour = colour;
        rtableColourTransition = 0;
    }
}

// error handling
function rshowError(message) {
    const loadingScreen = document.getElementById('loading-screen');
    const errorScreen = document.getElementById('error-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (errorScreen) {
        errorScreen.style.display = 'flex';
        console.error(message);
    }
}

// responsive canvas
function windowResized() {
    try {
        resizeCanvas(windowWidth, windowHeight);
    } catch (error) {
        console.error('Resize failed:', error);
    }
}
