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

function setup() {
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('game-container');

    // Initialize Matter.js
    engine = Engine.create();
    world = engine.world;

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
                            isPlacingCueBall = true;
                            cueBall = new Ball(TABLE_WIDTH * 0.2 - 50, TABLE_HEIGHT / 2, 'white');
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

    push();
    translate(width / 2 - TABLE_WIDTH / 2, height / 2 - TABLE_HEIGHT / 2);

    drawTable();
    drawBalls();
    drawImpacts();

    if (cueBall && !isShooting) {
        cue.update();
        cue.show();
    }

    pop();

    // UI Updates
    let scoreEl = document.getElementById('score-panel');
    if (scoreEl) scoreEl.innerText = `SCORE: ${score}`;

    let modeName = currentMode === 1 ? "STANDARD" : currentMode === 2 ? "RANDOM" : "PRACTICE";
    let modeEl = document.getElementById('mode-panel');
    if (modeEl) modeEl.innerText = `MODE: ${modeName}`;
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
    // Check if placing cue ball
    if (isPlacingCueBall) {
        let localX = mouseX - (width / 2 - TABLE_WIDTH / 2);
        let localY = mouseY - (height / 2 - TABLE_HEIGHT / 2);

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

function drawTable() {
    // Draw Rails (Outer Frame)
    noStroke();
    fill(20, 20, 22); // Matte Obsidian
    rect(-RAIL_WIDTH, -RAIL_WIDTH, TABLE_WIDTH + RAIL_WIDTH * 2, TABLE_HEIGHT + RAIL_WIDTH * 2, 15);

    // Draw Felt (Gradient)
    let ctx = drawingContext;
    let gradient = ctx.createRadialGradient(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, 50, TABLE_WIDTH / 2, TABLE_HEIGHT / 2, TABLE_WIDTH);
    gradient.addColorStop(0, 'rgb(30, 100, 60)'); // Deep Emerald Center
    gradient.addColorStop(1, 'rgb(10, 40, 25)');  // Darker Forest Edges

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Draw Cushions (Slightly lighter than edges to pop)
    fill(20, 70, 40);
    // Top
    rect(0, 0, TABLE_WIDTH, RAIL_WIDTH / 2);
    // Bottom
    rect(0, TABLE_HEIGHT - RAIL_WIDTH / 2, TABLE_WIDTH, RAIL_WIDTH / 2);
    // Left
    rect(0, 0, RAIL_WIDTH / 2, TABLE_HEIGHT);
    // Right
    rect(TABLE_WIDTH - RAIL_WIDTH / 2, 0, RAIL_WIDTH / 2, TABLE_HEIGHT);

    // Draw Pockets (Seamless, dark with inner glow)
    for (let p of pockets) {
        // Outer shadow
        fill(5, 5, 5);
        circle(p.x, p.y, POCKET_RADIUS * 2.2);

        // Inner void
        fill(0);
        circle(p.x, p.y, POCKET_RADIUS * 2);

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
    stroke(255, 255, 255, 30);
    strokeWeight(1);
    line(TABLE_WIDTH * 0.2, TABLE_HEIGHT - RAIL_WIDTH / 2, TABLE_WIDTH * 0.2, RAIL_WIDTH / 2);

    // Draw D-Zone Semi-circle
    noFill();
    arc(TABLE_WIDTH * 0.2, TABLE_HEIGHT / 2, 150, 150, HALF_PI, -HALF_PI);

    // Draw Spot
    noStroke();
    fill(0, 0, 0, 50);
    circle(TABLE_WIDTH * 0.75, TABLE_HEIGHT / 2, 4); // Black spot
}

function setupTable() {
    // Define cushion physics bodies (static)
    const cushionOptions = { isStatic: true, restitution: 0.8, friction: 0.1 };

    // Top
    cushions.push(Bodies.rectangle(TABLE_WIDTH / 2, -RAIL_WIDTH / 2, TABLE_WIDTH, RAIL_WIDTH, cushionOptions));
    // Bottom
    cushions.push(Bodies.rectangle(TABLE_WIDTH / 2, TABLE_HEIGHT + RAIL_WIDTH / 2, TABLE_WIDTH, RAIL_WIDTH, cushionOptions));
    // Left
    cushions.push(Bodies.rectangle(-RAIL_WIDTH / 2, TABLE_HEIGHT / 2, RAIL_WIDTH, TABLE_HEIGHT, cushionOptions));
    // Right
    cushions.push(Bodies.rectangle(TABLE_WIDTH + RAIL_WIDTH / 2, TABLE_HEIGHT / 2, RAIL_WIDTH, TABLE_HEIGHT, cushionOptions));

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
    isPlacingCueBall = true; // Start by placing cue ball

    // Create Cue Ball (initially off-screen or in hand)
    cueBall = new Ball(TABLE_WIDTH * 0.2 - 50, TABLE_HEIGHT / 2, 'white');
    balls.push(cueBall);

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

function drawBalls() {
    for (let b of balls) {
        b.show();
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

        let localMX = mouseX - (width / 2 - TABLE_WIDTH / 2);
        let localMY = mouseY - (height / 2 - TABLE_HEIGHT / 2);

        let dx = localMX - cueBall.body.position.x;
        let dy = localMY - cueBall.body.position.y;
        this.angle = atan2(dy, dx);

        if (this.isAiming) {
            let distToBall = dist(localMX, localMY, cueBall.body.position.x, cueBall.body.position.y);
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

    show() {
        if (isPlacingCueBall) {
            // Draw placement hint
            push();
            fill(255, 255, 255, 100);
            textAlign(CENTER);
            text("CLICK IN D-ZONE TO PLACE CUE BALL", TABLE_WIDTH / 2, TABLE_HEIGHT / 2 + 50);
            pop();
            return;
        }

        let pos = cueBall.body.position;

        push();
        translate(pos.x, pos.y);
        rotate(this.angle);

        // Aim Line
        if (!this.isAiming) {
            stroke(255, 255, 255, 50);
            strokeWeight(1);
            line(0, 0, 100, 0); // Simple guide
        } else {
            // Power aim line
            let aimColor = lerpColor(color(255, 255, 240), color(100, 255, 255), this.power / this.maxPower);
            stroke(aimColor);
            strokeWeight(2);
            line(0, 0, -this.power * 5, 0); // Pull back visual

            // Forward projection
            stroke(255, 255, 255, 30);
            line(0, 0, 500, 0);
        }

        // Cue Stick
        let stickOffset = this.isAiming ? this.power * 5 + 20 : 20;
        translate(stickOffset, 0);

        // Stick texture/gradient
        let ctx = drawingContext;
        let grad = ctx.createLinearGradient(0, -3, 300, 3);
        grad.addColorStop(0, '#e0c0a0'); // Wood tip
        grad.addColorStop(0.1, '#503010'); // Dark wood
        grad.addColorStop(1, '#201005'); // Handle

        ctx.fillStyle = grad;
        rect(0, -3, 300, 6, 2);

        pop();
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

    show() {
        let pos = this.body.position;

        // Update trail
        if (Vector.magnitude(this.body.velocity) > 0.5) {
            this.trail.push({ x: pos.x, y: pos.y });
            if (this.trail.length > 10) this.trail.shift();
        } else if (this.trail.length > 0) {
            this.trail.shift();
        }

        push();

        // Draw Trail
        noFill();
        strokeWeight(this.r);
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
            point(t.x, t.y);
        }

        translate(pos.x, pos.y);
        noStroke();

        // Ball Color
        if (this.color === 'white') fill(240);
        else if (this.color === 'red') fill(200, 40, 40);
        else fill(this.color);

        circle(0, 0, this.r * 2);

        // Simple 3D shine
        fill(255, 255, 255, 100);
        circle(-this.r * 0.3, -this.r * 0.3, this.r * 0.6);

        pop();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function drawImpacts() {
    for (let i = impacts.length - 1; i >= 0; i--) {
        impacts[i].update();
        impacts[i].show();
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

    show() {
        noFill();
        stroke(255, 255, 255, this.life);
        strokeWeight(2);
        circle(this.x, this.y, (255 - this.life) / 2);
    }

    isDead() {
        return this.life <= 0;
    }
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
