// Matter.js module aliases
const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Events = Matter.Events;
const Vector = Matter.Vector;
const Composite = Matter.Composite;

let engine;
let world;

// Game constants
const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const RAIL_WIDTH = 30;
const POCKET_RADIUS = 18;
const BALL_RADIUS = 10;

// Game state
let balls = [];
let cushions = [];
let pockets = [];
let cueBall;
let cue;
let impacts = [];
let score = 0;
let currentMode = 1; // 1: Triangle, 2: Random, 3: Practice
let isAiming = false;
let isShooting = false;
let isPlacingCueBall = true;

let tableGraphics;
let camAngle = 0;
let targetCamAngle = 0;
let camPhi = 0.8; // Elevation angle (radians)
let targetCamPhi = 0.8;
let camRadius = 900;

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight, WEBGL);
    canvas.parent('game-container');

    // Create 2D texture buffer for the table
    tableGraphics = createGraphics(TABLE_WIDTH, TABLE_HEIGHT);

    // Initialize Matter.js
    engine = Engine.create();
    world = engine.world;

    // Increase iterations for better collision stability
    engine.positionIterations = 10;
    engine.velocityIterations = 10;

    // Disable gravity (top-down view)
    engine.world.gravity.y = 0;

    setupTable();
    setupBalls(1);

    cue = new Cue();

    // Collision Event
    Events.on(engine, 'collisionStart', function (event) {
        let pairs = event.pairs;
        for (let i = 0; i < pairs.length; i++) {
            let bodyA = pairs[i].bodyA;
            let bodyB = pairs[i].bodyB;

            // Check for pocket collision
            if (bodyA.label === 'pocket' || bodyB.label === 'pocket') {
                let ballBody = bodyA.label === 'pocket' ? bodyB : bodyA;

                // Find ball object
                let ballIndex = balls.findIndex(b => b.body === ballBody);
                if (ballIndex !== -1) {
                    // Remove ball
                    World.remove(world, ballBody);
                    balls.splice(ballIndex, 1);
                    score++;

                    // If cue ball potted, respawn
                    if (ballBody === cueBall.body) {
                        score--; // Penalty
                        cueBall = null;
                        setTimeout(() => {
                            // Auto-place for smoother gameplay
                            isPlacingCueBall = false;
                            cueBall = new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2, 'white');
                            balls.push(cueBall);
                        }, 1000);
                    }
                }
            }
        }
    });
}

function draw() {
    background(10, 12, 16); // Dark cinematic background fallback

    Engine.update(engine);
    checkTurnState();

    // Update Camera Rotation (Azimuth)
    let sliderVal = parseFloat(document.getElementById('cam-slider').value);
    if (abs(sliderVal - targetCamAngle) > 0.01) {
        targetCamAngle = sliderVal;
    }
    camAngle = lerp(camAngle, targetCamAngle, 0.1);

    // Update Camera Tilt (Elevation)
    let tiltVal = parseFloat(document.getElementById('tilt-slider').value);
    if (abs(tiltVal - targetCamPhi) > 0.01) {
        targetCamPhi = tiltVal;
    }
    camPhi = lerp(camPhi, targetCamPhi, 0.1);

    // Spherical to Cartesian Conversion
    // X = r * sin(phi) * sin(theta)
    // Y = -r * cos(phi) (Up is -Y in p5 WEBGL usually, but we want 0 to be top-down? No, 0 is horizontal)
    // Let's use standard: Y is Up/Down.
    // Phi 0 = Top Down? Or Phi 0 = Horizontal?
    // Let's say Phi 0 = Top Down (Y axis).
    // Y = -r * cos(phi)
    // Z = r * sin(phi) * cos(theta)

    let camX = camRadius * sin(camPhi) * sin(camAngle);
    let camY = -camRadius * cos(camPhi); // Negative because Y is down in WebGL screen coords, but we want 'up' to be negative Y
    let camZ = camRadius * sin(camPhi) * cos(camAngle);

    camera(camX, camY, camZ, 0, 0, 0, 0, 1, 0);

    // Render 2D Table to Texture
    drawTableToTexture();

    // Lighting
    ambientLight(40);
    pointLight(255, 255, 255, 0, -500, 0); // Overhead main light
    spotLight(200, 200, 200, 0, -800, 0, 0, 1, 0, PI / 3, 2); // Focused spot

    // Draw Environment (Arena)
    drawArena();

    // Draw 3D Table Structure
    push();
    rotateX(HALF_PI); // Rotate to lie flat on XZ plane

    // 1. Felt Surface (Texture)
    push();
    translate(0, 0, 2); // Slightly raised to avoid z-fighting with base, but below cushions
    texture(tableGraphics);
    noStroke();
    plane(TABLE_WIDTH, TABLE_HEIGHT);
    pop();

    // 2. Table Frame & Rails
    drawTableFrame();

    pop();

    // Draw Balls in 3D
    drawBalls3D();

    // Draw Impacts
    drawImpacts3D();

    // Draw Cue
    if (cueBall && !isShooting) {
        cue.update();
        cue.show3D();
    }

    // Debug Cursor (Ghost Ball)
    let mousePos = getMouseOnTable();
    if (mousePos) {
        push();
        translate(mousePos.x - TABLE_WIDTH / 2, -BALL_RADIUS, mousePos.y - TABLE_HEIGHT / 2);
        noStroke();
        fill(255, 255, 255, 50);
        sphere(5);
        pop();
    }

    // UI Updates
    let scoreEl = document.getElementById('score-panel');
    if (scoreEl) scoreEl.innerText = `SCORE: ${score}`;

    let modeName = currentMode === 1 ? "STANDARD" : currentMode === 2 ? "RANDOM" : "PRACTICE";
    let modeEl = document.getElementById('mode-panel');
    if (modeEl) modeEl.innerText = `MODE: ${modeName}`;

    let statusEl = document.getElementById('status-panel');
    if (statusEl) {
        if (isPlacingCueBall) statusEl.innerText = "STATUS: PLACE BALL (Click D-Zone)";
        else if (isShooting) statusEl.innerText = "STATUS: SHOOTING";
        else statusEl.innerText = "STATUS: AIMING";
    }
}

function mouseWheel(event) {
    // Horizontal scroll -> Rotate
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        targetCamAngle += event.deltaX * 0.001;
        targetCamAngle = constrain(targetCamAngle, -1.5, 1.5);
        document.getElementById('cam-slider').value = targetCamAngle;
    }
    // Vertical scroll -> Tilt
    else {
        targetCamPhi += event.deltaY * 0.001;
        targetCamPhi = constrain(targetCamPhi, 0.2, 1.4); // Limit tilt
        document.getElementById('tilt-slider').value = targetCamPhi;
    }
    return false;
}

function keyPressed() {
    if (key === '1') {
        currentMode = 1;
        setupBalls(1);
    } else if (key === '2') {
        currentMode = 2;
        setupBalls(2);
    } else if (key === '3') {
        currentMode = 3;
        setupBalls(3);
    } else if (key === 'r' || key === 'R') {
        setupBalls(currentMode);
    }
}

function mousePressed() {
    // Check if mouse is within canvas bounds (simple check)
    if (mouseY > height - 50) return; // Assume bottom area is UI/Slider

    let mousePos = getMouseOnTable();
    if (!mousePos) return;

    // Check if placing cue ball
    if (isPlacingCueBall) {
        let localX = mousePos.x;
        let localY = mousePos.y;

        // Check if inside D-Zone
        let dZoneX = TABLE_WIDTH * 0.2;
        let dZoneY = TABLE_HEIGHT / 2;
        let distToCenter = dist(localX, localY, dZoneX, dZoneY);

        if (localX < dZoneX && distToCenter < 75 && localX > 0 && localY > 0 && localY < TABLE_HEIGHT) {
            Body.setPosition(cueBall.body, { x: localX, y: localY });
            Body.setVelocity(cueBall.body, { x: 0, y: 0 });
            isPlacingCueBall = false;
        }
    } else if (!isShooting && cueBall) {
        cue.startAiming();
    }
}

function mouseReleased() {
    if (cue && cue.isAiming) {
        cue.shoot();
    }
}

function drawTableToTexture() {
    let pg = tableGraphics;

    // Draw Felt (Gradient)
    let ctx = pg.drawingContext;
    let gradient = ctx.createRadialGradient(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 50, TABLE_WIDTH / 2, TABLE_HEIGHT / 2, TABLE_WIDTH);
    gradient.addColorStop(0, 'rgb(30, 100, 60)'); // Deep Emerald Center
    gradient.addColorStop(1, 'rgb(10, 40, 25)');  // Darker Forest Edges

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Draw Cushions (Slightly lighter than edges to pop)
    pg.fill(20, 70, 40);
    pg.noStroke();
    // Top
    pg.rect(0, 0, TABLE_WIDTH, RAIL_WIDTH / 2);
    // Bottom
    pg.rect(0, TABLE_HEIGHT - RAIL_WIDTH / 2, TABLE_WIDTH, RAIL_WIDTH / 2);
    // Left
    pg.rect(0, 0, RAIL_WIDTH / 2, TABLE_HEIGHT);
    // Right
    pg.rect(TABLE_WIDTH - RAIL_WIDTH / 2, 0, RAIL_WIDTH / 2, TABLE_HEIGHT);

    // Draw Pockets (Seamless, dark with inner glow)
    for (let p of pockets) {
        // Outer shadow
        pg.fill(5, 5, 5);
        pg.circle(p.x, p.y, POCKET_RADIUS * 2.2);

        // Inner void
        pg.fill(0);
        pg.circle(p.x, p.y, POCKET_RADIUS * 2);

        // Soft inner glow
        let glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, POCKET_RADIUS);
        glow.addColorStop(0, 'rgba(0, 0, 0, 1)');
        glow.addColorStop(1, 'rgba(20, 50, 30, 0.2)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, TWO_PI);
        ctx.fill();
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

function setupTable() {
    // Define cushion physics bodies (static)
    // Make them extra thick to prevent high-speed tunneling
    const THICKNESS = 500;
    const CUSHION_INSET = RAIL_WIDTH / 2; // Visual cushions extend 15px into table
    const cushionOptions = { isStatic: true, restitution: 0.8, friction: 0.1 };

    // Top (Inner edge at CUSHION_INSET)
    cushions.push(Bodies.rectangle(TABLE_WIDTH / 2, CUSHION_INSET - THICKNESS / 2, TABLE_WIDTH, THICKNESS, cushionOptions));
    // Bottom (Inner edge at TABLE_HEIGHT - CUSHION_INSET)
    cushions.push(Bodies.rectangle(TABLE_WIDTH / 2, (TABLE_HEIGHT - CUSHION_INSET) + THICKNESS / 2, TABLE_WIDTH, THICKNESS, cushionOptions));
    // Left (Inner edge at CUSHION_INSET)
    cushions.push(Bodies.rectangle(CUSHION_INSET - THICKNESS / 2, TABLE_HEIGHT / 2, THICKNESS, TABLE_HEIGHT, cushionOptions));
    // Right (Inner edge at TABLE_WIDTH - CUSHION_INSET)
    cushions.push(Bodies.rectangle((TABLE_WIDTH - CUSHION_INSET) + THICKNESS / 2, TABLE_HEIGHT / 2, THICKNESS, TABLE_HEIGHT, cushionOptions));

    World.add(world, cushions);

    // Define Pockets (Visual positions for now, collision logic later)
    pockets = [
        { x: 0, y: 0 },
        { x: TABLE_WIDTH / 2, y: -5 }, // Middle pockets slightly offset
        { x: TABLE_WIDTH, y: 0 },
        { x: 0, y: TABLE_HEIGHT },
        { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT + 5 },
        { x: TABLE_WIDTH, y: TABLE_HEIGHT }
    ];

    // Add Pocket Sensors
    for (let p of pockets) {
        let sensor = Bodies.circle(p.x, p.y, POCKET_RADIUS, {
            isStatic: true,
            isSensor: true,
            label: 'pocket'
        });
        World.add(world, sensor);
    }
}

function setupBalls(mode) {
    // Clear existing balls
    for (let b of balls) {
        World.remove(world, b.body);
    }
    balls = [];
    score = 0;
    isShooting = false;

    // Create Cue Ball
    cueBall = new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2, 'white');
    balls.push(cueBall);

    // Auto-start in playing mode for convenience
    isPlacingCueBall = false;

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
                balls.push(new Ball(x, y, 'red'));
            }
        }
        // Add colored balls (simplified positions for standard snooker)
        balls.push(new Ball(TABLE_WIDTH * 0.9, TABLE_HEIGHT / 2, 'black'));
        balls.push(new Ball(TABLE_WIDTH * 0.75 - BALL_RADIUS * 4, TABLE_HEIGHT / 2, 'pink'));
        balls.push(new Ball(TABLE_WIDTH * 0.5, TABLE_HEIGHT / 2, 'blue'));
        balls.push(new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2 - 40, 'green'));
        balls.push(new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2, 'brown'));
        balls.push(new Ball(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2 + 40, 'yellow'));

    } else if (mode === 2) { // Random Clusters
        for (let i = 0; i < 10; i++) {
            let x = random(TABLE_WIDTH * 0.5, TABLE_WIDTH - RAIL_WIDTH);
            let y = random(RAIL_WIDTH, TABLE_HEIGHT - RAIL_WIDTH);
            balls.push(new Ball(x, y, 'red'));
        }
        // Add a few colors randomly
        balls.push(new Ball(random(TABLE_WIDTH / 2, TABLE_WIDTH), random(0, TABLE_HEIGHT), 'blue'));
        balls.push(new Ball(random(TABLE_WIDTH / 2, TABLE_WIDTH), random(0, TABLE_HEIGHT), 'black'));

    } else if (mode === 3) { // Practice
        // Just a few reds scattered
        for (let i = 0; i < 5; i++) {
            let x = random(TABLE_WIDTH * 0.3, TABLE_WIDTH - RAIL_WIDTH);
            let y = random(RAIL_WIDTH, TABLE_HEIGHT - RAIL_WIDTH);
            balls.push(new Ball(x, y, 'red'));
        }
    }
}

function drawBalls3D() {
    for (let b of balls) {
        b.show3D();
    }
}

class Cue {
    constructor() {
        this.angle = 0;
        this.power = 0;
        this.isAiming = false;
        this.maxPower = 30;
    }

    update() {
        if (isPlacingCueBall) return;

        // Raycasting for mouse interaction
        let mousePos = getMouseOnTable();
        if (!mousePos) return;

        let dx = mousePos.x - cueBall.body.position.x;
        let dy = mousePos.y - cueBall.body.position.y;
        this.angle = atan2(dy, dx);

        if (this.isAiming) {
            let distToBall = dist(mousePos.x, mousePos.y, cueBall.body.position.x, cueBall.body.position.y);
            this.power = constrain(map(distToBall, 50, 300, 0, this.maxPower), 0, this.maxPower);
        }
    }

    startAiming() {
        this.isAiming = true;
    }

    shoot() {
        if (!this.isAiming) return;

        let force = Vector.create(cos(this.angle + PI) * this.power * 0.002, sin(this.angle + PI) * this.power * 0.002);
        Body.applyForce(cueBall.body, cueBall.body.position, force);

        // Spawn Impact
        impacts.push(new Impact(cueBall.body.position.x, cueBall.body.position.y));

        this.isAiming = false;
        this.power = 0;
        isShooting = true;

        // Reset shooting flag after some time or when balls stop
        // isShooting will be reset in checkTurnState() when balls stop moving
    }

    show3D() {
        if (isPlacingCueBall) {
            // Draw placement hint (2D overlay or 3D text)
            // For simplicity, we skip 3D text or use a simple billboard
            return;
        }

        let pos = cueBall.body.position;

        // Disable depth test to ensure stick is always visible (on top layer)
        let gl = drawingContext;
        gl.disable(gl.DEPTH_TEST);

        push();
        // Convert physics coordinates to 3D world coordinates
        // Physics: (0,0) is top-left of table. 3D: (0,0,0) is center of table.
        translate(pos.x - TABLE_WIDTH / 2, -BALL_RADIUS, pos.y - TABLE_HEIGHT / 2);
        rotateY(-this.angle); // p5 3D rotation is Y-axis for horizontal

        // Aim Line
        if (!this.isAiming) {
            stroke(255, 255, 255, 50);
            strokeWeight(1);
            line(0, 0, 0, 100, 0, 0); // Simple guide
        } else {
            // Power aim line
            let aimColor = lerpColor(color(255, 255, 240), color(100, 255, 255), this.power / this.maxPower);
            stroke(aimColor);
            strokeWeight(2);
            line(0, 0, 0, -this.power * 5, 0, 0); // Pull back visual

            // Forward projection
            stroke(255, 255, 255, 30);
            line(0, 0, 0, 500, 0, 0);
        }

        // Cue Stick
        let stickOffset = this.isAiming ? this.power * 5 + 20 : 20;
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
        World.add(world, this.body);
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

        push();
        translate(pos.x - TABLE_WIDTH / 2, -BALL_RADIUS, pos.y - TABLE_HEIGHT / 2);
        noStroke();

        // Ball Color
        if (this.color === 'white') fill(240);
        else if (this.color === 'red') fill(200, 40, 40);
        else fill(this.color);

        sphere(this.r);
        pop();

        // Draw Trail (2D lines in 3D space)
        if (this.trail.length > 1) {
            noFill();
            strokeWeight(2);
            beginShape();
            for (let i = 0; i < this.trail.length; i++) {
                let t = this.trail[i];
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

function drawImpacts3D() {
    for (let i = impacts.length - 1; i >= 0; i--) {
        impacts[i].update();
        impacts[i].show3D();
        if (impacts[i].isDead()) {
            impacts.splice(i, 1);
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

// Raycasting helper to find mouse position on the 3D table plane (y = 0 in 3D world, but our table is at y=0 relative to center)
// Actually, our table plane is at y=0 in 3D world space (after translate).
// We need to cast a ray from camera to mouse position and find intersection with y=0 plane.
function getMouseOnTable() {
    // 1. Normalized Device Coordinates (NDC)
    let ndcX = (mouseX / width) * 2 - 1;
    let ndcY = (mouseY / height) * 2 - 1;

    // 2. Camera Properties
    // Re-calculate camera position exactly as in draw()
    let camX = camRadius * sin(camPhi) * sin(camAngle);
    let camY = -camRadius * cos(camPhi);
    let camZ = camRadius * sin(camPhi) * cos(camAngle);

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
    // x maps to s, y maps to u (but inverted because screen Y is down, world U is up? or p5 Y is down?)
    // In p5, positive Y is down. So ndcY increases downwards.
    // Our 'u' vector calculated above is "Up" in world space (0,1,0) roughly.
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

function checkTurnState() {
    if (!isShooting) return;

    let isMoving = false;
    // Check if any ball is moving
    for (let b of balls) {
        if (Vector.magnitude(b.body.velocity) > 0.05) {
            isMoving = true;
            break;
        }
    }

    // Also check if cue ball is off table (handled in collision but good safety)
    if (!cueBall) isMoving = true;

    if (!isMoving) {
        isShooting = false;
    }
}

function drawTableFrame() {
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
    for (let p of pockets) {
        push();
        translate(p.x - TABLE_WIDTH / 2, p.y - TABLE_HEIGHT / 2, 0);
        cylinder(POCKET_RADIUS, 20);
        pop();
    }
}

function drawArena() {
    // Floor
    push();
    translate(0, 200, 0); // Below table
    rotateX(HALF_PI);
    noStroke();
    fill(10, 10, 12); // Dark floor
    plane(3000, 3000);
    pop();

    // Seating / Walls (Abstract)
    push();
    translate(0, 0, -1000); // Back wall
    fill(5, 5, 8);
    plane(4000, 2000);
    pop();
}
