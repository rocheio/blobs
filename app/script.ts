/*
GameObjects: Game where everything is a blob.
*/
const CANVAS = <HTMLCanvasElement>document.getElementById('canvas');
const CONTEXT = CANVAS.getContext('2d');
const KEYCODEMAP = {
    37: 'left', 38: 'up', 39: 'right', 40: 'down',  // arrow keys
    65: 'left', 87: 'up', 68: 'right', 83: 'down',  // w a s d
    27: 'escape', 32: 'space'
}

/*
Constants used to tweak the game to make it more fun.
*/
const MAX_BLOBS = 30;  // Maximum blobs in the game at any given time
const DEFAULT_BG_COLOR = "#BBCCFF";  // Starting BG color for the game
const SPAWN_BUFFER = [500, 1000]; // Range from player where blobs spawn

/*
Game class that controls everything else
*/
class Game {
    intervals: TrackedInterval[];
    blobs: GameObject[];
    score: number = 0;
    paused: boolean = false;
    bg_color: string = DEFAULT_BG_COLOR;
    current_shade: number = 0;
    timer: Timer;
    controls: Controls;
    player: GameObject;
    camera: Camera;
    constructor () {
        this.new_game();
    }
    // Start the game on object init and on restarts
    new_game () {
        this.intervals = [];
        this.blobs = [];
        this.score = 0;
        this.paused = false;
        this.bg_color = DEFAULT_BG_COLOR;
        this.current_shade = 0;
        this.timer = new Timer();
        this.controls = new Controls(this);
        this.player = new GameObject(0, 0, 10, '#DDDDDD');
        this.camera = new Camera(this.player);
        this.add_interval(30, this.render_frame.bind(this), 'Graphics');
        this.add_interval(20, function(){
            this.check_game_over();
            this.collision_detection();
            this.move_player();
            this.move_npcs();
            this.remove_blobs();
            this.camera.adjust();
        }.bind(this), 'Primary');
        this.add_interval(5, this.set_blob_targets.bind(this), 'Targetting');
        this.add_interval(1, this.spawn_blob.bind(this), 'Spawner');
        this.add_interval(10, this.update_bg_color.bind(this), 'BG Color');
    }
    // Add a tracked interval to the game
    add_interval (fps, func, name) {
        this.intervals.push(new TrackedInterval(fps, func, name));
    }
    // Render an entire frame of the game at its current state
    render_frame () {
        // CLear the canvas
        CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
        // Draw the background color
        CONTEXT.fillStyle = this.bg_color;
        CONTEXT.fillRect(0, 0, CANVAS.width, CANVAS.height);
        // Draw Game stuff
        this.blobs.forEach(function(blob){
            blob.draw(this.camera.xoffset, this.camera.yoffset);
        }.bind(this));
        this.player.draw(this.camera.xoffset, this.camera.yoffset);
        this._draw_debug_info();
    };
    // Write debugging info to the canvas
    _draw_debug_info () {
        // Format info from Game elements
        let info = [
            ["Canvas Size", CANVAS.width + ' x ' + CANVAS.height],
            ["Number GameObjects", this.blobs.length],
            ["Time", this.timer.time()],
            ["Score", this.score],
            ["Player at", (this.player.xloc + ", " + this.player.yloc)]
        ];
        this.intervals.forEach(function(interval){
            info.push([interval.name, interval.rate])
        });
        // Draw the information on the canvas
        CONTEXT.font = '10px Mono';
        CONTEXT.fillStyle = 'black';
        let ypos = 0;
        info.forEach(function(items){
            let label_value = items[0] + ': ' + items[1];
            ypos += 15;
            CONTEXT.fillText(label_value, 5, ypos);
        });
    }
    // Spawn blobs on the canvas near player but not within 50 px
    spawn_blob () {
        if (this.blobs.length < MAX_BLOBS) {
            let xdist = rand_between(SPAWN_BUFFER[0], SPAWN_BUFFER[1]);
            let ydist = rand_between(SPAWN_BUFFER[0], SPAWN_BUFFER[1]);
            let xloc = this.player.xloc + xdist * rand_pos_or_neg();
            let yloc = this.player.yloc + ydist * rand_pos_or_neg();
            let radius = rand_between(this.player.radius * 0.25,
                                      this.player.radius * 1.25);
            this.blobs.push(new GameObject(xloc, yloc, radius));
        }
    }
    // End the game if the player has died
    check_game_over () {
        if (!this.player.alive) {
            this.game_over();
        }
    }
    // Calculate score for and remove blobs that have died this round
    remove_blobs () {
        for (let i = this.blobs.length - 1; i >= 0; i--) {
            let blob = this.blobs[i];
            if (!blob.alive) {
                this.score += blob.points;
                this.blobs.splice(i, 1);
            }
        }
    }
    // Set all blob targets and move them toward it.
    set_blob_targets () {
        let actors = this.blobs.slice(0);
        actors.push(this.player);

        this.blobs.forEach(function(blob){
            // Find actors that are close to the blob
            let close_actors = [];
            actors.forEach(function(actor){
                if (blob.distance_from(actor.xloc, actor.yloc) < 500) {
                    close_actors.push(actor);
                }
            });
            // Sort actors that the blob can see
            let attractors = [];
            let repellants = [];
            close_actors.forEach(function(actor){
                if (blob.radius > actor.radius) {
                    attractors.push(actor);
                } else {
                    repellants.push(actor);
                }
            });
            // Set the target based on the first attractor (simple for now)
            let target = attractors.length > 0 ? attractors[0] : blob;
            blob.set_target(target.xloc, target.yloc);
        }.bind(this));
    }
    // Move the player toward the controllers intention
    move_player () {
        let xstep = this.controls.intent_x;
        let ystep = this.controls.intent_y;
        this.player.step(xstep, ystep);
    }
    // Move all the NPC blobs
    move_npcs () {
        this.blobs.forEach(function(blob){
            blob.move();
        }.bind(this));
    }
    // Check the collision of all actors in the Game
    // (Only check downward in blob list, so as not to duplicate checks)
    collision_detection () {
        let actors = this.blobs.slice(0);
        actors.push(this.player);
        for (let i = actors.length - 1; i >= 0; i--) {
            let actor = actors[i];
            for (let j = i - 1; j >= 0; j--) {
                let other = actors[j];
                if (actor.overlaps(other)) {
                    actor.collide_with(other);
                    break
                }
            }
        }
    }
    // Stop all action in the game world until Game is unpaused
    toggle_pause () {
        if (this.paused) {
            this.start();
        } else {
            this.pause();
        }
    }
    // End the game and display final stats
    game_over () {
        this.pause();
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
    restart () {
        this.pause();
        this.new_game();
    }
    // Start the game
    start () {
        this.intervals.forEach(function(interval){
            interval.start();
        });
        this.timer.start();
        this.paused = false;
    }
    // Pause the game
    pause () {
        this.intervals.forEach(function(interval){
            interval.pause();
        });
        this.timer.pause();
        this.paused = true;
    }
    // Update background color based on player position
    update_bg_color () {
        let offset = this.player.distance_from(0, 0);
        let shade = Math.min(1, (offset >> 5) / 100);
        if (shade !== this.current_shade) {
            this.current_shade = shade;
            this.bg_color = shade_color(DEFAULT_BG_COLOR, -shade);
        }
    }
}

/*
Represents a Camera to track an Object within the game world.
*/
class Camera {
    speed: number = 5;
    xoffset: number = -CANVAS.width / 2;  // Offset with Game grid X
    yoffset: number = -CANVAS.height / 2;  // Offset with Game grid Y
    xbound: number = CANVAS.width / 4;
    ybound: number = CANVAS.height / 4;
    target: GameObject;
    constructor (target) {
        this.target = target;  // Object camera tracks (player)
    }
    is_target_right () {
        return (this.target.xloc > this.xoffset + CANVAS.width - this.xbound);
    }
    is_target_left () {
        return (this.target.xloc < this.xoffset + this.xbound);
    }
    is_target_top () {
        return (this.target.yloc > this.yoffset + CANVAS.height - this.ybound);
    }
    is_target_bottom () {
        return (this.target.yloc < this.yoffset + this.ybound);
    }
    adjust () {
        if (this.is_target_right()) {
            this.xoffset += this.speed;
        } else if (this.is_target_left()) {
            this.xoffset -= this.speed;
        }
        if (this.is_target_top()) {
            this.yoffset += this.speed;
        } else if (this.is_target_bottom()) {
            this.yoffset -= this.speed;
        }
    }
}

/*
Interval that tracks actual actions taken (for FPS monitoring)
*/
class TrackedInterval {
    rate: number = 0;  // Calculated at render time
    _actions: number = 0;  // Running number of actions taken
    aps: number;  // Target Actions Per Second
    action: number;  // Function to execute each interval
    name: number;
    tracker: number;
    interval: number;
    constructor (aps, action, name) {
        this.aps = aps;
        this.action = action;
        this.name = name;
        this.start();
    }
    // Start the interval
    start () {
        this.tracker = setInterval(this.track.bind(this), 1000);
        this.interval = setInterval(function(){
            this.action();
            this._actions += 1;
        }.bind(this), 1000 / this.aps);
    }
    // Pause the interval
    pause () {
        clearInterval(this.tracker);
        clearInterval(this.interval);
    }
    // Calculate the running Actions per Second of the interval
    track () {
        this.rate = this._actions;
        this._actions = 0;
    };
}

// Object to track and display time
class Timer {
    current_seconds: number = 0;
    interval: number = null;
    tps: number;
    constructor (tps=1) {
        this.tps = tps;  // Ticks Per Second
        this.start();
    }
    // Start the timer to tick up at the defined rate
    start () {
        this.interval = setInterval(this.tick.bind(this), 1000 / this.tps);
    }
    // Stop ticking up until timer is started again
    pause () {
        clearInterval(this.interval);
    }
    // Zero out the timer and reset the display to 0:00
    reset () {
        clearInterval(this.interval);
        this.current_seconds = 0;
    }
    // Tick up the time and display the new time in HTML
    tick () {
        this.current_seconds += 1;
    }
    // Return the time as string from 0:00 to 99:99:99
    time () {
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
}

/*
Control class to map keyboard/touch input to Game actions.
Manages direction actions via "intent" counts of direction history.
*/
class Controls {
    intent_max: number = 8;
    intent_y: number = 0;
    intent_x: number = 0;
    game: Game;
    constructor (game) {
        this.game = game;
        this.add_keyboard_listeners();
        this.add_touch_listeners();
    }
    // Add listeners for keyboard commands
    add_keyboard_listeners () {
        document.addEventListener('keydown', function(event) {
            let code = KEYCODEMAP[event.keyCode];
            if (code == undefined) {
                console.log('unknown keydown: ' + event.keyCode);
            } else if (code == 'escape') {
                this.game.toggle_pause();
            } else if (code == 'space') {
                this.game.restart();
            } else {
                this.direction(code);
            }
        }.bind(this), false);
    }
    // Add listeners for touch controls
    add_touch_listeners () {
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
    direction (cmd) {
        let intenttype = (cmd === 'left' || cmd === 'right' ?
                          'intent_x' : 'intent_y');
        let increment = (cmd === 'left' || cmd === 'up' ? -1 : 1);
        let new_value = this[intenttype] + increment;
        if (Math.abs(new_value) < this.intent_max) {
            this[intenttype] = new_value;
        }
    }
}

/*
GameObject class that floats around the canvas
*/
class GameObject {
    alive: boolean = true;
    points: number = 50;
    xloc: number;
    yloc: number;
    xtarget: number = 0;
    ytarget: number = 0;
    radius: number;
    speed: number;
    color: string;
    border_color: string;
    constructor (xloc, yloc, radius=10, color=null) {
        this.xloc = xloc;
        this.yloc = yloc;
        this.radius = radius;
        this.speed = (15 - Math.sqrt(radius)) >> 1;  // Steps per movement cycle
        this.color = (color == null ? rand_color() : color);
        this.border_color = shade_color(this.color, -0.4);
    }
    // Return info about this GameObject as a string
    toString () {
        return ('<GameObject at (' + this.xloc + ', ' + this.yloc +
                ') radius ' + this.radius + '>');
    }
    // Draw the blob on the canvas
    draw (xoffset=0, yoffset=0) {
        CONTEXT.beginPath();
        CONTEXT.arc(this.xloc - xoffset, this.yloc - yoffset,
                    this.radius, 0, 2 * Math.PI, false);
        CONTEXT.fillStyle = this.color;
        CONTEXT.fill();
        CONTEXT.lineWidth = 5;
        CONTEXT.strokeStyle = this.border_color;
        CONTEXT.stroke();
    }
    // Set the target for a blob
    set_target (xloc, yloc) {
        this.xtarget = xloc;
        this.ytarget = yloc;
    }
    // Move the blob toward its target
    move () {
        let xdiff = this.xtarget - this.xloc;
        let ydiff = this.ytarget - this.yloc;
        let radians = Math.atan2(ydiff, xdiff);
        let xstep = Math.cos(radians) * this.speed;
        let ystep = Math.sin(radians) * this.speed;
        xstep = Math.abs(xstep) < Math.abs(xdiff) ? xstep : xdiff;
        ystep = Math.abs(ystep) < Math.abs(ydiff) ? ystep : ydiff;
        this.step(xstep, ystep);
    }
    // Move the blob a single step using integer amounts
    step (xstep=0, ystep=0) {
        this.xloc += xstep;
        this.yloc += ystep;
    }
    // Calculate if this blob overlaps with another blob
    overlaps (target) {
        let distance = this.distance_from(target.xloc, target.yloc);
        if (target.radius + this.radius > distance) {
            return true;
        } else {
            return false;
        }
    }
    // Return the absolute distance this GameObject is from coordinates
    distance_from (xloc=0, yloc=0) {
        return Math.hypot(yloc - this.yloc, xloc - this.xloc);
    }
    // Collide with another blob, acting based on which blob is bigger
    collide_with (other) {
        if (this.radius > other.radius) {
            other.alive = false;
            this.radius += 1;
        } else {
            this.alive = false;
            other.radius += 1;
        }
    }
}

/*
Basic food objects that can be collected by players
*/
class Food {
    constructor (xloc, yloc, radius=1, color=null) {

    }
}

// Resize the canvas, then redraw it with the new size
function resize_canvas () {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    CONTEXT.strokeRect(0, 0, window.innerWidth, window.innerHeight);
}

// Return random integer between two values
function rand_between (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Return positive or negative 1 randomly
function rand_pos_or_neg () {
    return Math.random() < 0.5 ? -1 : 1;
}

// Return random hex code color
function rand_color () {
    return '#' + Math.random().toString(16).substr(-6);
}

// Return darker hex color from a hex color
// (Positive percent for lighter, negative for darker)
function shade_color (color, percent) {
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

// Start the game on script load
window.onload = function () {
    window.addEventListener('resize', resize_canvas, false);
    resize_canvas();
    let game = new Game();
}
