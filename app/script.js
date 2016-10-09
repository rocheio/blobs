/*
Blobs: Game where everything is a blob.
*/
const CANVAS = document.getElementById('canvas');
const CONTEXT = CANVAS.getContext('2d');
var GAME = null;

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
    this.blobs = [];
    this.renderer = new TrackedInterval(30, this.render_frame.bind(this));
    this.player = new Blob(100, 100);
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
    this.draw_debug_info();
};
// Write debugging info to the canvas
Game.prototype.draw_debug_info = function () {
    CONTEXT.font = '12px Mono';
    CONTEXT.fillStyle = 'black';
    CONTEXT.fillText("Canvas Width: " + CANVAS.width, 5, 15);
    CONTEXT.fillText("Canvas Height: " + CANVAS.height, 5, 30);
    CONTEXT.fillText("Actual FPS: " + this.renderer.rate, 5, 45);
    CONTEXT.fillText("Number Blobs: " + this.blobs.length, 5, 60);
}
// Spawn blobs on the canvas
Game.prototype.spawn_blobs = function () {
    let number_blobs = 5;
    for (let i = 0; i < number_blobs; i++) {
        let xloc = rand_between(0, CANVAS.width);
        let yloc = rand_between(0, CANVAS.height);
        let radius = rand_between(10, 50);
        this.blobs.push(new Blob(xloc, yloc, radius));
    }
}


/*
Interval that tracks actual actions taken (for FPS monitoring)
*/
var TrackedInterval = function (target_rate, action) {
    this.target_rate = target_rate;  // Target Actions Per Second
    this.action = action;  // Function to execute each interval

    this.rate = 0;  // Calculated at render time
    this._actions = 0;  // Running number of actions taken

    this.interval = setInterval(function(){
        this.action();
        this._actions += 1;
    }.bind(this), 1000/this.target_rate);

    this.tracker = setInterval(this.update_rate.bind(this), 1000);
};
// Calculate the running Actions per Second of the interval
TrackedInterval.prototype.update_rate = function () {
    this.rate = this._actions;
    this._actions = 0;
};


/*
Blob class that floats around the canvas
*/
var Blob = function (xloc, yloc, radius=10, color=null) {
    // Attributes
    this.xloc = xloc;
    this.yloc = yloc;
    this.radius = radius;
    this.color = (color == null ? rand_color() : color);
    this.border_color = shade_color(this.color, -0.4);

    // Loops
    this.move_interval = setInterval(function(){
        this.move_toward(GAME.player.xloc, GAME.player.yloc);
    }.bind(this), 400);
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
// Move the blob (Positive right, negative left)
Blob.prototype.move = function (xmov, ymov) {
    this.xloc += xmov;
    this.yloc += ymov;
}
// Move that blob toward a target
Blob.prototype.move_toward = function (xtarget, ytarget) {
    let step = step_toward(this.xloc, this.yloc, xtarget, ytarget, 15);
    this.move(step.x, step.y);
}


// Start the game on script load
window.onload = function () {
    window.addEventListener('resize', resize_canvas, false);
    resize_canvas();
    GAME = new Game();
    GAME.spawn_blobs();
}
