'use strict';
var CANVAS = document.getElementById('canvas');
var CONTEXT = CANVAS.getContext('2d');
var KEYCODEMAP = {
    37: 'left', 38: 'up', 39: 'right', 40: 'down',
    65: 'left', 87: 'up', 68: 'right', 83: 'down',
    27: 'escape', 32: 'space'
};
var MAX_BLOBS = 30;
var DEFAULT_BG_COLOR = "#BBCCFF";
var SPAWN_BUFFER = [500, 1000];
var Game = (function () {
    function Game() {
        this.score = 0;
        this.paused = false;
        this.bg_color = DEFAULT_BG_COLOR;
        this.current_shade = 0;
        this.new_game();
    }
    Game.prototype.new_game = function () {
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
        this.add_interval(20, function () {
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
    };
    Game.prototype.add_interval = function (fps, func, name) {
        this.intervals.push(new TrackedInterval(fps, func, name));
    };
    Game.prototype.render_frame = function () {
        CONTEXT.clearRect(0, 0, CANVAS.width, CANVAS.height);
        CONTEXT.fillStyle = this.bg_color;
        CONTEXT.fillRect(0, 0, CANVAS.width, CANVAS.height);
        this.blobs.forEach(function (blob) {
            blob.draw(this.camera.xoffset, this.camera.yoffset);
        }.bind(this));
        this.player.draw(this.camera.xoffset, this.camera.yoffset);
        this._draw_debug_info();
    };
    ;
    Game.prototype._draw_debug_info = function () {
        var info = [
            ["Canvas Size", CANVAS.width + ' x ' + CANVAS.height],
            ["Number GameObjects", this.blobs.length],
            ["Time", this.timer.time()],
            ["Score", this.score],
            ["Player at", (this.player.xloc + ", " + this.player.yloc)]
        ];
        this.intervals.forEach(function (interval) {
            info.push([interval.name, interval.rate]);
        });
        CONTEXT.font = '10px Mono';
        CONTEXT.fillStyle = 'black';
        var ypos = 0;
        info.forEach(function (items) {
            var label_value = items[0] + ': ' + items[1];
            ypos += 15;
            CONTEXT.fillText(label_value, 5, ypos);
        });
    };
    Game.prototype.spawn_blob = function () {
        if (this.blobs.length < MAX_BLOBS) {
            var xdist = rand_between(SPAWN_BUFFER[0], SPAWN_BUFFER[1]);
            var ydist = rand_between(SPAWN_BUFFER[0], SPAWN_BUFFER[1]);
            var xloc = this.player.xloc + xdist * rand_pos_or_neg();
            var yloc = this.player.yloc + ydist * rand_pos_or_neg();
            var radius = rand_between(this.player.radius * 0.25, this.player.radius * 1.25);
            this.blobs.push(new GameObject(xloc, yloc, radius));
        }
    };
    Game.prototype.check_game_over = function () {
        if (!this.player.alive) {
            this.game_over();
        }
    };
    Game.prototype.remove_blobs = function () {
        for (var i = this.blobs.length - 1; i >= 0; i--) {
            var blob = this.blobs[i];
            if (!blob.alive) {
                this.score += blob.points;
                this.blobs.splice(i, 1);
            }
        }
    };
    Game.prototype.set_blob_targets = function () {
        var actors = this.blobs.slice(0);
        actors.push(this.player);
        this.blobs.forEach(function (blob) {
            var close_actors = [];
            actors.forEach(function (actor) {
                if (blob.distance_from(actor.xloc, actor.yloc) < 500) {
                    close_actors.push(actor);
                }
            });
            var attractors = [];
            var repellants = [];
            close_actors.forEach(function (actor) {
                if (blob.radius > actor.radius) {
                    attractors.push(actor);
                }
                else {
                    repellants.push(actor);
                }
            });
            var target = attractors.length > 0 ? attractors[0] : blob;
            blob.set_target(target.xloc, target.yloc);
        }.bind(this));
    };
    Game.prototype.move_player = function () {
        var xstep = this.controls.intent['x'];
        var ystep = this.controls.intent['y'];
        this.player.step(xstep, ystep);
    };
    Game.prototype.move_npcs = function () {
        this.blobs.forEach(function (blob) {
            blob.move();
        }.bind(this));
    };
    Game.prototype.collision_detection = function () {
        var actors = this.blobs.slice(0);
        actors.push(this.player);
        for (var i = actors.length - 1; i >= 0; i--) {
            var actor = actors[i];
            for (var j = i - 1; j >= 0; j--) {
                var other = actors[j];
                if (actor.overlaps(other)) {
                    actor.collide_with(other);
                    break;
                }
            }
        }
    };
    Game.prototype.toggle_pause = function () {
        if (this.paused) {
            this.start();
        }
        else {
            this.pause();
        }
    };
    Game.prototype.game_over = function () {
        this.pause();
        var display_x = CANVAS.width / 2 - 60;
        var display_y = CANVAS.height / 8;
        CONTEXT.font = '30px Mono bold';
        CONTEXT.fillStyle = 'red';
        CONTEXT.fillText('game over', display_x, display_y);
        CONTEXT.font = '20px Mono bold';
        CONTEXT.fillStyle = 'black';
        CONTEXT.fillText('score: ' + this.score, display_x, display_y + 25);
    };
    Game.prototype.restart = function () {
        this.pause();
        this.new_game();
    };
    Game.prototype.start = function () {
        this.intervals.forEach(function (interval) {
            interval.start();
        });
        this.timer.start();
        this.paused = false;
    };
    Game.prototype.pause = function () {
        this.intervals.forEach(function (interval) {
            interval.pause();
        });
        this.timer.pause();
        this.paused = true;
    };
    Game.prototype.update_bg_color = function () {
        var offset = this.player.distance_from(0, 0);
        var shade = Math.min(1, (offset >> 5) / 100);
        if (shade !== this.current_shade) {
            this.current_shade = shade;
            this.bg_color = shade_color(DEFAULT_BG_COLOR, -shade);
        }
    };
    return Game;
}());
var Camera = (function () {
    function Camera(target) {
        this.speed = 5;
        this.xoffset = -CANVAS.width / 2;
        this.yoffset = -CANVAS.height / 2;
        this.xbound = CANVAS.width / 4;
        this.ybound = CANVAS.height / 4;
        this.target = target;
    }
    Camera.prototype.is_target_right = function () {
        return (this.target.xloc > this.xoffset + CANVAS.width - this.xbound);
    };
    Camera.prototype.is_target_left = function () {
        return (this.target.xloc < this.xoffset + this.xbound);
    };
    Camera.prototype.is_target_top = function () {
        return (this.target.yloc > this.yoffset + CANVAS.height - this.ybound);
    };
    Camera.prototype.is_target_bottom = function () {
        return (this.target.yloc < this.yoffset + this.ybound);
    };
    Camera.prototype.adjust = function () {
        if (this.is_target_right()) {
            this.xoffset += this.speed;
        }
        else if (this.is_target_left()) {
            this.xoffset -= this.speed;
        }
        if (this.is_target_top()) {
            this.yoffset += this.speed;
        }
        else if (this.is_target_bottom()) {
            this.yoffset -= this.speed;
        }
    };
    return Camera;
}());
var TrackedInterval = (function () {
    function TrackedInterval(aps, action, name) {
        this.rate = 0;
        this._actions = 0;
        this.aps = aps;
        this.action = action;
        this.name = name;
        this.start();
    }
    TrackedInterval.prototype.start = function () {
        this.tracker = setInterval(this.track.bind(this), 1000);
        this.interval = setInterval(function () {
            this.action();
            this._actions += 1;
        }.bind(this), 1000 / this.aps);
    };
    TrackedInterval.prototype.pause = function () {
        clearInterval(this.tracker);
        clearInterval(this.interval);
    };
    TrackedInterval.prototype.track = function () {
        this.rate = this._actions;
        this._actions = 0;
    };
    ;
    return TrackedInterval;
}());
var Timer = (function () {
    function Timer(tps) {
        if (tps === void 0) { tps = 1; }
        this.current_seconds = 0;
        this.interval = null;
        this.tps = tps;
        this.start();
    }
    Timer.prototype.start = function () {
        this.interval = setInterval(this.tick.bind(this), 1000 / this.tps);
    };
    Timer.prototype.pause = function () {
        clearInterval(this.interval);
    };
    Timer.prototype.reset = function () {
        clearInterval(this.interval);
        this.current_seconds = 0;
    };
    Timer.prototype.tick = function () {
        this.current_seconds += 1;
    };
    Timer.prototype.time = function () {
        var hours = 0, minutes = 0, seconds = 0;
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
    };
    return Timer;
}());
var Controls = (function () {
    function Controls(game) {
        this.intent_max = 8;
        this.intent = { 'x': 0, 'y': 0 };
        this.game = game;
        this.add_keyboard_listeners();
        this.add_touch_listeners();
    }
    Controls.prototype.add_keyboard_listeners = function () {
        document.addEventListener('keydown', function (event) {
            var code = KEYCODEMAP[event.keyCode];
            if (code == undefined) {
                console.log('unknown keydown: ' + event.keyCode);
            }
            else if (code == 'escape') {
                this.game.toggle_pause();
            }
            else if (code == 'space') {
                this.game.restart();
            }
            else {
                this.direction(code);
            }
        }.bind(this), false);
    };
    Controls.prototype.add_touch_listeners = function () {
        var hammertime = new Hammer(document.getElementById('container'));
        hammertime.on('pan', function (event) {
            if (event.direction == 2) {
                this.direction('left');
            }
            else if (event.direction == 4) {
                this.direction('right');
            }
            else if (event.direction == 8) {
                this.direction('up');
            }
            else if (event.direction == 16) {
                this.direction('down');
            }
        }.bind(this));
    };
    Controls.prototype.direction = function (cmd) {
        var direction = (cmd === 'left' || cmd === 'right' ? 'x' : 'y');
        var increment = (cmd === 'left' || cmd === 'up' ? -1 : 1);
        var new_value = this.intent[direction] + increment;
        if (Math.abs(new_value) < this.intent_max) {
            this.intent[direction] = new_value;
        }
    };
    return Controls;
}());
var GameObject = (function () {
    function GameObject(xloc, yloc, radius, color) {
        if (radius === void 0) { radius = 10; }
        if (color === void 0) { color = null; }
        this.alive = true;
        this.points = 50;
        this.xtarget = 0;
        this.ytarget = 0;
        this.xloc = xloc;
        this.yloc = yloc;
        this.radius = radius;
        this.speed = (15 - Math.sqrt(radius)) >> 1;
        this.color = (color == null ? rand_color() : color);
        this.border_color = shade_color(this.color, -0.4);
    }
    GameObject.prototype.toString = function () {
        return ('<GameObject at (' + this.xloc + ', ' + this.yloc +
            ') radius ' + this.radius + '>');
    };
    GameObject.prototype.draw = function (xoffset, yoffset) {
        if (xoffset === void 0) { xoffset = 0; }
        if (yoffset === void 0) { yoffset = 0; }
        CONTEXT.beginPath();
        CONTEXT.arc(this.xloc - xoffset, this.yloc - yoffset, this.radius, 0, 2 * Math.PI, false);
        CONTEXT.fillStyle = this.color;
        CONTEXT.fill();
        CONTEXT.lineWidth = 5;
        CONTEXT.strokeStyle = this.border_color;
        CONTEXT.stroke();
    };
    GameObject.prototype.set_target = function (xloc, yloc) {
        this.xtarget = xloc;
        this.ytarget = yloc;
    };
    GameObject.prototype.move = function () {
        var xdiff = this.xtarget - this.xloc;
        var ydiff = this.ytarget - this.yloc;
        var radians = Math.atan2(ydiff, xdiff);
        var xstep = Math.cos(radians) * this.speed;
        var ystep = Math.sin(radians) * this.speed;
        xstep = Math.abs(xstep) < Math.abs(xdiff) ? xstep : xdiff;
        ystep = Math.abs(ystep) < Math.abs(ydiff) ? ystep : ydiff;
        this.step(xstep, ystep);
    };
    GameObject.prototype.step = function (xstep, ystep) {
        if (xstep === void 0) { xstep = 0; }
        if (ystep === void 0) { ystep = 0; }
        this.xloc += xstep;
        this.yloc += ystep;
    };
    GameObject.prototype.overlaps = function (target) {
        var distance = this.distance_from(target.xloc, target.yloc);
        if (target.radius + this.radius > distance) {
            return true;
        }
        else {
            return false;
        }
    };
    GameObject.prototype.distance_from = function (xloc, yloc) {
        if (xloc === void 0) { xloc = 0; }
        if (yloc === void 0) { yloc = 0; }
        return hypot(yloc - this.yloc, xloc - this.xloc);
    };
    GameObject.prototype.collide_with = function (other) {
        if (this.radius > other.radius) {
            other.alive = false;
            this.radius += 1;
        }
        else {
            this.alive = false;
            other.radius += 1;
        }
    };
    return GameObject;
}());
var Food = (function () {
    function Food(xloc, yloc, radius, color) {
        if (radius === void 0) { radius = 1; }
        if (color === void 0) { color = null; }
    }
    return Food;
}());
function resize_canvas() {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    CONTEXT.strokeRect(0, 0, window.innerWidth, window.innerHeight);
}
function rand_between(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function rand_pos_or_neg() {
    return Math.random() < 0.5 ? -1 : 1;
}
function rand_color() {
    return '#' + Math.random().toString(16).substr(-6);
}
function shade_color(color, percent) {
    var f = parseInt(color.slice(1), 16), t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent, R = f >> 16, G = f >> 8 & 0x00FF, B = f & 0x0000FF;
    var darker = ("#" +
        (0x1000000 +
            (Math.round((t - R) * p) + R) * 0x10000 +
            (Math.round((t - G) * p) + G) * 0x100 +
            (Math.round((t - B) * p) + B)).toString(16).slice(1));
    return darker;
}
function hypot(x, y) {
    return Math.sqrt(x * x + y * y);
}
window.onload = function () {
    window.addEventListener('resize', resize_canvas, false);
    resize_canvas();
    var game = new Game();
};
