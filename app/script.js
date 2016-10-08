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


/*
Game class that controls everything else
*/
var Game = function () {
    this.blobs = [];
}
// Write debugging info to the canvas
Game.prototype.draw_debug_info = function () {
    CONTEXT.font = '12px Mono';
    CONTEXT.fillText("Canvas Width: " + CANVAS.width, 5, 15);
    CONTEXT.fillText("Canvas Height: " + CANVAS.height, 5, 30);
    CONTEXT.fillText("Number Blobs: " + this.blobs.length, 5, 45);
}
// Spawn blobs on the canvas
Game.prototype.spawn_blobs = function () {
    for (let i=0; i<5; i++) {
        let xloc = rand_between(0, CANVAS.width);
        let yloc = rand_between(0, CANVAS.height);
        let radius = rand_between(10, 50);
        this.blobs.push(new Blob(xloc, yloc, radius));
    }
}
// Draw the blobs on the canvas
Game.prototype.draw_blobs = function (index) {
    this.blobs.forEach(function(blob){
        console.log(blob.toString());
        blob.draw();
    })
}


/*
Blob class that floats around the canvas
*/
var Blob = function (xloc, yloc, radius=10) {
    this.xloc = xloc;
    this.yloc = yloc;
    this.radius = radius;
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
    CONTEXT.fillStyle = 'green';
    CONTEXT.fill();
    CONTEXT.lineWidth = 5;
    CONTEXT.strokeStyle = '#003300';
    CONTEXT.stroke();
}

// Start the game on script load
window.onload = function () {
    window.addEventListener('resize', resize_canvas, false);
    resize_canvas();
    var game = new Game();
    game.spawn_blobs();
    game.draw_debug_info();
    game.draw_blobs();
}
