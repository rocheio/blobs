/*
Blobs: Game where everything is a blob.
*/

const CANVAS = document.getElementById('canvas');
const CONTEXT = CANVAS.getContext('2d');

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
function rand_between (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Return random hex code color
function rand_color () {
    return '#' + Math.random().toString(16).substr(-6);
}

// Return darker hex color from a hex color
// (Positive percent for lighter, negative for darker)
function shade_color(color, percent) {
    var f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = f >> 8 & 0x00FF,
        B = f & 0x0000FF;
        console.log(f, t, p, R, G, B);
    let darker = (
        "#" +
        (0x1000000 +
            (Math.round((t - R) * p) + R) * 0x10000 +
            (Math.round((t - G) * p) + G) * 0x100 +
            (Math.round((t - B) * p) + B)
        ).toString(16).slice(1)
    );
    console.log(color, darker);
    return darker;
}


/*
Game class that controls everything else
*/
var Game = function () {
    // Attributes
    this.blobs = [];
    this.render = new TrackedInterval(30, this.render_frame.bind(this));
}
// Render an entire frame of the game at its current state
Game.prototype.render_frame = function () {
    // CLear the canvas
    CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);

    // Draw Game stuff
    this.draw_debug_info();
    this.blobs.forEach(function(blob){
        blob.draw();
    });
};
// Write debugging info to the canvas
Game.prototype.draw_debug_info = function () {
    CONTEXT.font = '12px Mono';
    CONTEXT.fillStyle = 'black';
    CONTEXT.fillText("Canvas Width: " + CANVAS.width, 5, 15);
    CONTEXT.fillText("Canvas Height: " + CANVAS.height, 5, 30);
    CONTEXT.fillText("Actual FPS: " + this.render.rate, 5, 45);
    CONTEXT.fillText("Number Blobs: " + this.blobs.length, 5, 60);
}
// Spawn blobs on the canvas
Game.prototype.spawn_blobs = function () {
    for (let i=0; i<5; i++) {
        let xloc = rand_between(0, CANVAS.width);
        let yloc = rand_between(0, CANVAS.height);
        let radius = rand_between(10, 50);
        let color = rand_color();
        this.blobs.push(new Blob(xloc, yloc, color, radius));
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
var Blob = function (xloc, yloc, color, radius=10) {
    // Attributes
    this.xloc = xloc;
    this.yloc = yloc;
    this.color = color;
    this.border_color = shade_color(color, -0.4);
    this.radius = radius;

    // Loops
    this.move_interval = setInterval(function(){
        let xmov = rand_between(-10, 10);
        let ymov = rand_between(-10, 10);
        this.move(xmov, ymov);
    }.bind(this), 400);
}
// Return info about this Blob as a string
Blob.prototype.toString = function () {
    return ('<Blob at (' + this.xloc + ', ' + this.yloc +
            ') radius ' + this.radius + '>');
}
// Draw the blob on the canvas
Blob.prototype.draw = function () {
    var centerX = this.xloc + this.radius / 2;
    var centerY = this.yloc + this.radius / 2;

    CONTEXT.beginPath();
    CONTEXT.arc(centerX, centerY, this.radius, 0, 2 * Math.PI, false);
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


// Start the game on script load
window.onload = function () {
    window.addEventListener('resize', resize_canvas, false);
    resize_canvas();
    var game = new Game();
    game.spawn_blobs();
}
