# Premium Snooker Game

A professional broadcast-quality snooker simulation built with p5.js and Matter.js.

## Naming Convention

**All files and variables in this project use an 'r' prefix** (e.g., `rindex.html`, `rsketch.js`, `rballs`, `rengine`).

**Purpose:**
- **Namespace Protection**: Prevents naming conflicts with p5.js built-in functions and Matter.js global variables
- **Code Organization**: Clearly distinguishes project-specific code from library code
- **Consistency**: Maintains uniform naming across HTML, CSS, JavaScript, and all game objects

This convention ensures clean separation between custom game logic and external library functionality throughout the entire codebase.

## Project Structure

```
Snooker-game/
├── rindex.html              # Main game page
├── rhome.html               # Landing page
├── rextensions.html         # Documentation page
├── rstyle.css               # Game page styles
├── rhome-styles.css         # Landing page styles
├── rextensions-styles.css   # Documentation styles
├── rsketch.js               # Main game logic (p5.js + Matter.js)
├── rhome-script.js          # Landing page animations
└── rextensions-script.js    # Documentation interactions
```

## Features

### Game Mechanics
- **Realistic Physics**: Matter.js engine for accurate ball dynamics
- **3D Camera**: Manual and auto-snap camera controls
- **Multiple Modes**: Triangle, Random, and Practice setups
- **Two Rule Sets**: Standard and Beginner modes

### Visual Features
- **5 Table Colors**: Green, Red, Black, Blue, Pink
- **Shot Replay**: Record and replay last shot
- **Slow Motion**: Toggle slow-motion playback
- **Loading Screen**: Animated "ENTERING ARENA" intro

### Player Features
- **Score Tracking**: Individual player scores and break counting
- **Turn Indicators**: Visual cues for active player
- **Foul System**: Automatic detection and scoring
- **Frame Counter**: Track completed frames and total shots

## Code Documentation

All code files have been professionally commented with:
- **File Headers**: Describe purpose and features
- **Section Comments**: Organize code into logical blocks
- **Inline Comments**: Explain complex logic
- **Variable Descriptions**: Clear naming and purpose