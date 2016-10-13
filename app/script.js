/*
Blobs: Game where everything is a blob.
*/
const CANVAS = document.getElementById('canvas');
const CONTEXT = CANVAS.getContext('2d');
const KEYCODEMAP = {
    37: 'left', 38: 'up', 39: 'right', 40: 'down', 27: 'escape', 32: 'space'
}

// Resize the canvas, then redraw it
function resize_canvas () {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    redraw_canvas();
}

// Redraw the canvas on the screen
function redraw_canvas () {
    CONTEXT.strokeStyle = 'blue';
    CONTEXT.lineWidth = '5';
    CONTEXT.strokeRect(0, 0, window.innerWidth, window.innerHeight);
}

// Return random integer between two values
function rand_between(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Return random hex code color
function rand_color () {
    return '#' + Math.random().toString(16).substr(-6);
}

// Return darker hex color from a hex color
// (Positive percent for lighter, negative for darker)
function shade_color(color, percent) {
    let f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = f >> 8 & 0x00FF,
        B = f & 0x0000FF;
    let darker = (
        "#" +
        (0x1000000 +
            (Math.round((t - R) * p) + R) * 0x10000 +
            (Math.round((t - G) * p) + G) * 0x100 +
            (Math.round((t - B) * p) + B)
        ).toString(16).slice(1)
    );
    return darker;
}

// Return (x, y) coordinates to move to from a current
// (x, y) position to a target (x, y) position with given distance
function step_toward(x1, y1, x2, y2, distance) {
    let xdiff = x2 - x1;
    let ydiff = y2 - y1;
    let radians = Math.atan2(ydiff, xdiff);
    let xstep = Math.cos(radians) * distance;
    let ystep = Math.sin(radians) * distance;

    xstep = Math.abs(xstep) < Math.abs(xdiff) ? xstep : xdiff;
    ystep = Math.abs(ystep) < Math.abs(ydiff) ? ystep : ydiff;

    return {'x': xstep, 'y': ystep};
}


/*
Game class that controls everything else
*/
var Game = function () {
    // Attributes
    this.score = 0;
    this.max_blobs = 30;
    this.blobs = [];
    this.paused = false;

    // Composition (big core chunks)
    this.timer = new Timer();
    this.controls = new Controls(this);
    this.graphics = new TrackedInterval(30, this.render_frame.bind(this));
    this.physics = new TrackedInterval(10, this.render_action.bind(this));
    this.spawner = new TrackedInterval(1, this.spawn_blob.bind(this));
    this.player = new Blob(CANVAS.width / 2, CANVAS.height / 2,
                           10, '#DDDDDD');
}
// Render an entire frame of the game at its current state
Game.prototype.render_frame = function () {
    // CLear the canvas
    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
    // Draw Game stuff
    this.blobs.forEach(function(blob){
        blob.draw();
    });
    this.player.draw();
    this._draw_debug_info();
};
// Write debugging info to the canvas
Game.prototype._draw_debug_info = function () {
    CONTEXT.font = '12px Mono';
    CONTEXT.fillStyle = 'black';
    let info = [
        ["Canvas Width", CANVAS.width],
        ["Canvas Height", CANVAS.height],
        ["Frames Per Second", this.graphics.rate],
        ["Physics Per Second", this.physics.rate],
        ["Number Blobs", this.blobs.length],
        ["Time", this.timer.time()],
        ["Score", this.score],
    ]
    let ypos = 0;
    info.forEach(function(items){
        let label_value = items[0] + ': ' + items[1];
        ypos += 15;
        CONTEXT.fillText(label_value, 5, ypos);
    });
}
// Spawn blobs on the canvas
Game.prototype.spawn_blob = function () {
    let xloc = rand_between(0, CANVAS.width);
    let yloc = rand_between(0, CANVAS.height);
    let radius = rand_between(this.player.radius * 0.25,
                              this.player.radius * 1.5);
    if (this.blobs.length < this.max_blobs) {
        this.blobs.push(new Blob(xloc, yloc, radius));
    }
}
// Taken action for every item on the canvas
// Loop backward so removal from the list doesn't break things
Game.prototype.render_action = function () {
    // Move NPC blobs
    for (let i = this.blobs.length - 1; i >= 0; i--) {
        let blob = this.blobs[i]
        if (blob.overlaps(this.player)) {
            if (blob.radius > this.player.radius) {
                this.game_over();
            } else {
                this.score += blob.points;
                this.blobs.splice(i, 1);
                this.player.radius += 1;
            }
        } else {
            blob.move_toward(this.player.xloc, this.player.yloc);
        }
    }
    // Move the player
    this.player.move(this.controls.intent_x,
                     this.controls.intent_y);
}
// Stop all action in the game world until Game is unpaused
Game.prototype.toggle_pause = function () {
    if (this.paused) {
        this.start();
    } else {
        this.pause();
    }
}
// End the game and display final stats
Game.prototype.game_over = function () {
    this.toggle_pause();
    let display_x = CANVAS.width / 2 - 60;
    let display_y = CANVAS.height / 8;
    CONTEXT.font = '30px Mono bold';
    CONTEXT.fillStyle = 'red';
    CONTEXT.fillText('game over', display_x, display_y);
    CONTEXT.font = '20px Mono bold';
    CONTEXT.fillStyle = 'black';
    CONTEXT.fillText('score: ' + this.score, display_x, display_y + 25);
}
// Reset the game
Game.prototype.reset = function () {
    this.pause();
    this.blobs = [];
    this.timer.reset();
    this.player = new Blob(CANVAS.width / 2, CANVAS.height / 2,
                           10, '#DDDDDD');
    this.start();
}
// Start the game
Game.prototype.start = function () {
    this.graphics.start();
    this.physics.start();
    this.spawner.start();
    this.timer.start();
    this.paused = false;
}
// Pause the game
Game.prototype.pause = function () {
    this.graphics.pause();
    this.physics.pause();
    this.spawner.pause();
    this.timer.pause();
    this.paused = true;
}


/*
Interval that tracks actual actions taken (for FPS monitoring)
*/
var TrackedInterval = function (aps, action) {
    this.aps = aps;  // Target Actions Per Second
    this.action = action;  // Function to execute each interval
    this.rate = 0;  // Calculated at render time
    this._actions = 0;  // Running number of actions taken
    this.start();
};
// Start the interval
TrackedInterval.prototype.start = function () {
    this.tracker = setInterval(this.track.bind(this), 1000);
    this.interval = setInterval(function(){
        this.action();
        this._actions += 1;
    }.bind(this), 1000 / this.aps);
}
// Pause the interval
TrackedInterval.prototype.pause = function () {
    clearInterval(this.tracker);
    clearInterval(this.interval);
}
// Calculate the running Actions per Second of the interval
TrackedInterval.prototype.track = function () {
    this.rate = this._actions;
    this._actions = 0;
};


// Object to track and display time
var Timer = function (tps=1) {
    this.tps = tps;  // Ticks Per Second
    this.current_seconds = 0;
    this.interval = null;
    this.start();
}
// Start the timer to tick up at the defined rate
Timer.prototype.start = function() {
    this.interval = setInterval(this.tick.bind(this), 1000 / this.tps);
}
// Stop ticking up until timer is started again
Timer.prototype.pause = function() {
    clearInterval(this.interval);
}
// Zero out the timer and reset the display to 0:00
Timer.prototype.reset = function() {
    clearInterval(this.interval);
    this.current_seconds = 0;
}
// Tick up the time and display the new time in HTML
Timer.prototype.tick = function() {
    this.current_seconds += 1;
}
// Return the time as string from 0:00 to 99:99:99
Timer.prototype.time = function() {
   var hours, minutes, seconds = 0;
   var formatted = '';
   hours = (this.current_seconds / (60 * 60)) >> 0;
   if (hours > 0) {
       formatted += hours + ':';
   }
   minutes = (this.current_seconds / 60) >> 0;
   if (hours > 0 && minutes < 10) {
       formatted += '0';
   }
   formatted += minutes + ':';
   seconds = this.current_seconds % 60;
   if (seconds < 10) {
       formatted += '0';
   }
   formatted += seconds;
   return formatted;
}


/*
Control class to map keyboard/touch input to Game actions.
Manages direction actions via "intent" counts of direction history.
*/
var Controls = function (game) {
    this.game = game;
    this.intent_max = 8;
    this.intent_y = 0;
    this.intent_x = 0;
    // Listeners / Intervals
    this.add_keyboard_listeners();
    this.add_touch_listeners();
}
// Add listeners for keyboard commands
Controls.prototype.add_keyboard_listeners = function () {
    document.addEventListener('keydown', function(event) {
        let code = KEYCODEMAP[event.keyCode];
        if (code == undefined) {
            console.log('unknown keydown: ' + event.keyCode);
        } else if (code == 'escape') {
            this.game.toggle_pause();
        } else if (code == 'space') {
            this.game.reset();
        } else {
            this.direction(code);
        }
    }.bind(this), false);
}
// Add listeners for touch controls
Controls.prototype.add_touch_listeners = function () {
    var hammertime = new Hammer(document.getElementById('container'));
    hammertime.on('pan', function(event) {
        if (event.direction == 2) {
            this.direction('left');
        } else if (event.direction == 4) {
            this.direction('right');
        } else if (event.direction == 8) {
            this.direction('up');
        } else if (event.direction == 16) {
            this.direction('down');
        }
    }.bind(this));
}
// Translate a direction command (e.g. 'left') into movement intent
Controls.prototype.direction = function (cmd) {
    let intenttype = (cmd === 'left' | cmd === 'right' ?
                      'intent_x' : 'intent_y');
    let increment = (cmd === 'left' | cmd === 'up' ? -1 : 1);
    let new_value = this[intenttype] + increment;
    if (Math.abs(new_value) < this.intent_max) {
        this[intenttype] = new_value;
    }
}


/*
Blob class that floats around the canvas
*/
var Blob = function (xloc, yloc, radius=10, color=null) {
    // Attributes
    this.points = 50;
    this.xloc = xloc;
    this.yloc = yloc;
    this.radius = radius;
    this.speed = (15 - Math.sqrt(radius)) >> 1;  // Steps per movement cycle
    this.color = (color == null ? rand_color() : color);
    this.border_color = shade_color(this.color, -0.4);
}
// Return info about this Blob as a string
Blob.prototype.toString = function () {
    return ('<Blob at (' + this.xloc + ', ' + this.yloc +
            ') radius ' + this.radius + '>');
}
// Draw the blob on the canvas
Blob.prototype.draw = function () {
    CONTEXT.beginPath();
    CONTEXT.arc(this.xloc, this.yloc, this.radius, 0, 2 * Math.PI, false);
    CONTEXT.fillStyle = this.color;
    CONTEXT.fill();
    CONTEXT.lineWidth = 5;
    CONTEXT.strokeStyle = this.border_color;
    CONTEXT.stroke();
}
// Move that blob toward a target
Blob.prototype.move_toward = function (xtarget, ytarget) {
    let step = step_toward(this.xloc, this.yloc, xtarget, ytarget, this.speed);
    this.move(step.x, step.y);
}
// Move the blob using integer amounts
Blob.prototype.move = function (xstep=0, ystep=0) {
    this.xloc += xstep;
    this.yloc += ystep;
}
// Calculate if this blob overlaps with another blob
Blob.prototype.overlaps = function (target) {
    let distance = Math.hypot(target.yloc - this.yloc,
                              target.xloc - this.xloc);
    if (target.radius + this.radius > distance) {
        return true;
    } else {
        return false;
    }
}


// Start the game on script load
window.onload = function () {
    window.addEventListener('resize', resize_canvas, false);
    resize_canvas();
    let game = new Game();
}
