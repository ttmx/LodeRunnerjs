/*     Lode Runner

01234567890123456789012345678901234567890123456789012345678901234567890123456789
*/

// GLOBAL VARIABLES

// tente não definir mais nenhuma variável global

let empty, hero, control;


// ACTORS

class Actor {
	constructor(x, y, imageName) {

		this.x = x;
		this.y = y;
		this.imageName = imageName;
		this.show();
	}
	draw(x, y) {
		control.ctx.drawImage(GameImages[this.imageName],
			x * ACTOR_PIXELS_X, y * ACTOR_PIXELS_Y);
	}
	move(dx, dy) {
		this.hide();
		this.x += dx;
		this.y += dy;
		this.show();
	}
}

class PassiveActor extends Actor {
	show() {
		control.world[this.x][this.y] = this;
		this.draw(this.x, this.y);
	}
	hide() {
		control.world[this.x][this.y] = empty;
		empty.draw(this.x, this.y);
	}
}

class ActiveActor extends Actor {
	constructor(x, y, imageName) {
		super(x, y, imageName);
		this.time = 0;	// timestamp used in the control of the animations
	}
	show() {
		control.worldActive[this.x][this.y] = this;
		this.draw(this.x, this.y);
	}
	hide() {
		control.worldActive[this.x][this.y] = empty;
		control.world[this.x][this.y].draw(this.x, this.y);
	}
	animation() {
	}
}

class Brick extends PassiveActor {
	constructor(x, y) {
		super(x, y, "brick");
		this.collides = true;
	}
}

class Chimney extends PassiveActor {
	constructor(x, y) { super(x, y, "chimney"); }
}

class Empty extends PassiveActor {
	constructor() { super(-1, -1, "empty"); }
	show() { }
	hide() { }
}

class Gold extends PassiveActor {
	constructor(x, y) { super(x, y, "gold"); }
}

class Invalid extends PassiveActor {
	constructor(x, y) { super(x, y, "invalid"); }
}

class Ladder extends PassiveActor {
	constructor(x, y) {
		super(x, y, "ladder");
		this.climbable = true;
		this.visible = false;
	}
	show() {
		if (this.visible)
			super.show();
	}
	hide() {
		// if( this.visible )
		// super.hide();
	}
	makeVisible() {
		this.visible = true;
		this.show();
	}
}

class Rope extends PassiveActor {
	constructor(x, y) {
		super(x, y, "rope");
		this.hang = true;
	}
}

class Stone extends PassiveActor {
	constructor(x, y) {
		super(x, y, "stone");
		this.collides = true;

	}
}

class Hero extends ActiveActor {
	constructor(x, y) {
		super(x, y, "hero_runs_left");
		this.direction = "left";
		this.action = "runs";
	}

	inBounds(dx, dy) {

		return this.x + dx >= 0 && this.x + dx < WORLD_WIDTH &&
			this.y + dy >= 0 && this.y + dy < WORLD_HEIGHT;

	}

	act(k) {

		let wasFalling =
			control.world[this.x][this.y + 1]
			&& !control.world[this.x][this.y + 1].collides
			&& control.world[this.x][this.y + 1]
			&& !control.world[this.x][this.y + 1].climbable
			&& !control.world[this.x][this.y].hang;

		let wasClimbing = control.world[this.x][this.y].climbable;

		if (wasFalling && !wasClimbing) {

			if (this.inBounds(0, 1)) {

				this.y++;

			}

		} else {

			if (k != null) {

				let [dx, dy] = k;

				if (this.inBounds(dx, dy)) {

					if (control.world[this.x + dx][this.y + dy] && !control.world[this.x + dx][this.y + dy].collides) {

						this.x += dx;

						this.direction = ['left', this.direction, 'right'][dx + 1];

						if (dy < 0 && wasClimbing) {

							this.y += dy;

						} else if (dy > 0 && (wasClimbing
							|| (control.world[this.x][this.y + dy]
								&& control.world[this.x][this.y + dy].climbable))) {

							this.y += dy;

						}

						if (dy > 0
							&& control.world[this.x][this.y].hang) {

							this.y += dy;

						}

					}

				}

			}

		}

		let isFalling =
			control.world[this.x][this.y + 1]
			&& !control.world[this.x][this.y + 1].collides
			&& control.world[this.x][this.y + 1]
			&& !control.world[this.x][this.y + 1].climbable
			&& !control.world[this.x][this.y].hang;

		let isClimbing = control.world[this.x][this.y].climbable;

		this.action = 'runs';

		if (control.world[this.x][this.y].imageName === "rope") {

			this.action = "on_rope";

		}

		if (isClimbing) {

			this.action = "on_ladder";

		} else if (isFalling) {

			this.action = "falls";

		}

	}

	animation() {

		this.hide();

		control.lastKey = control.getKey();
		this.act(control.lastKey);

		this.imageName = `hero_${this.action}_${this.direction}`;
		this.show();
	}
}

class Robot extends ActiveActor {
	constructor(x, y) {
		super(x, y, "robot_runs_right");
		this.dx = 1;
		this.dy = 0;
	}
}

// GAME CONTROL

class GameControl {
	constructor() {
		control = this;
		this.key = 0;
		this.lastKey = null;
		this.time = 0;
		empty = new Empty();	// only one empty actor needed
		this.ctx = document.getElementById("canvas1").getContext('2d');
		this.world = this.createMatrix();
		this.worldActive = this.createMatrix();
		this.loadLevel(1);
		this.setupEvents();
	}
	createMatrix() { // stored by columns
		let matrix = new Array(WORLD_WIDTH);
		for (let x = 0; x < WORLD_WIDTH; x++) {
			let a = new Array(WORLD_HEIGHT);
			for (let y = 0; y < WORLD_HEIGHT; y++)
				a[y] = empty;
			matrix[x] = a;
		}
		return matrix;
	}
	clearLevel() {

		this.world = this.createMatrix();
		this.worldActive = this.createMatrix();
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.ctx.rect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.ctx.fillStyle = "#fff";
		this.ctx.fill();

	}
	loadLevel(level) {
		if (level < 1 || level > MAPS.length)
			fatalError("Invalid level " + level)
		this.clearLevel();
		let map = MAPS[level - 1];  // -1 because levels start at 1
		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				// x/y reversed because map stored by lines
				GameFactory.actorFromCode(map[y][x], x, y);
			}
	}
	getKey() {
		let k = control.key;
		control.key = 0;
		switch (k) {
			case 37: case 79: case 74: return [-1, 0]; //  LEFT, O, J
			case 38: case 81: case 73: return [0, -1]; //    UP, Q, I
			case 39: case 80: case 76: return [1, 0];  // RIGHT, P, L
			case 40: case 65: case 75: return [0, 1];  //  DOWN, A, K
			case 0: return null;
			default: return String.fromCharCode(k);
			// http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
		};
	}
	setupEvents() {
		addEventListener("keydown", this.keyDownEvent, false);
		addEventListener("keyup", this.keyUpEvent, false);
		setInterval(this.animationEvent, 1000 / ANIMATION_EVENTS_PER_SECOND);
	}
	animationEvent() {
		control.time++;
		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				let a = control.worldActive[x][y];
				if (a.time < control.time) {
					a.time = control.time;
					a.animation();
				}
			}
	}
	keyDownEvent(k) {
		control.key = k.keyCode;
	}
	keyUpEvent(k) {
	}
}


// HTML FORM

class KeyDisplay {

	constructor(scene, x = 0, y = 0, angle = 0, cond = [0, 0]) {

		this.scene = scene;
		this.scene.objects.push(this);

		this.x = x;
		this.y = y;
		this.angle = angle;
		this.cond = cond;

	}

	draw() {

		if (control.lastKey
			&& this.cond[0] == control.lastKey[0]
			&& this.cond[1] == control.lastKey[1]) {

			this.scene.ctx.fillStyle = '#81a1c1';

		} else {

			this.scene.ctx.fillStyle = '#4C566A';

		}

		this.scene.ctx.save();
		this.scene.ctx.translate(this.x, this.y);
		this.scene.ctx.translate(25, 25);
		this.scene.ctx.rotate(this.angle);
		this.scene.ctx.translate(-25, -25);

		this.scene.ctx.fillRect(0, 0, 50, 50);

		this.scene.ctx.fillStyle = '#ffffff';

		this.scene.ctx.beginPath();

		this.scene.ctx.moveTo(5, 45);
		this.scene.ctx.lineTo(25, 5);
		this.scene.ctx.lineTo(45, 45);
		this.scene.ctx.closePath();

		this.scene.ctx.fill();
		this.scene.ctx.stroke();

		this.scene.ctx.restore();


	}

}

class ControlDisplay {

	constructor() {

		this.form = document.getElementsByName('form1')[0];

		this.game = document.getElementById("canvas1");

		let wrapper = document.createElement('div');

		wrapper.append(this.game);

		this.controls = document.createElement('canvas');
		this.controls.height = this.game.height;
		this.controls.width = this.game.height;
		this.controls.style.border = '1px solid #81a1c1';
		this.ctx = this.controls.getContext('2d');

		wrapper.append(this.controls);
		this.form.prepend(wrapper);

		let menu = document.createElement('div');
		menu.style.display = 'grid';
		menu.style.gridTemplateColumns = '126.5px 126.5px 126.5px 126.5px';
		wrapper.after(menu);

		let preview = document.createElement('canvas');
		preview.width = control.ctx.canvas.width;
		preview.height = control.ctx.canvas.height;
		let pctx = preview.getContext('2d');

		MAPS.forEach((map, id) => {

			let button = document.createElement('input');
			button.value = 'Map ' + (id + 1);
			button.type = 'button';
			button.addEventListener('click', () => {

				control.loadLevel(id + 1);

			})

			button.addEventListener('mouseover', () => {

				pctx.clearRect(0, 0, pctx.canvas.width, pctx.canvas.height);

				let map = MAPS[id];
				for (let x = 0; x < WORLD_WIDTH; x++)
					for (let y = 0; y < WORLD_HEIGHT; y++) {

						let sprite = 'invalid';

						switch (map[y][x]) {

							case 't': sprite = 'brick'; break;
							case 'T': sprite = 'chimney'; break;
							case '.': sprite = 'empty'; break;
							case 'o': sprite = 'gold'; break;
							case 'h': sprite = 'hero_runs_left'; break;
							case 'e': sprite = 'ladder'; break;
							case 'E': sprite = 'ladder'; break;
							case 'r': sprite = 'robot_runs_right'; break;
							case 'c': sprite = 'rope'; break;
							case 'p': sprite = 'stone'; break;
							default: sprite = 'invalid'; break;

						}

						pctx.drawImage(GameImages[sprite],x * ACTOR_PIXELS_X, y * ACTOR_PIXELS_Y);

					}

			})

			button.addEventListener('mouseout', () => {

				pctx.clearRect(0, 0, pctx.canvas.width, pctx.canvas.height);

			})

			menu.append(button);

		})

		this.form.append(preview);

		this.scene = {

			ctx: this.ctx,

			objects: []

		}

		let pos = { x: (this.controls.width - 150) / 2, y: (this.controls.height - 100) / 2 };

		let up = new KeyDisplay(this.scene,
			pos.x + 50, pos.y,
			0 * Math.PI / 180,
			[0, -1]);
		let down = new KeyDisplay(this.scene,
			pos.x + 50, pos.y + 50,
			180 * Math.PI / 180,
			[0, 1]);
		let left = new KeyDisplay(this.scene,
			pos.x, pos.y + 50,
			-90 * Math.PI / 180,
			[-1, 0]);
		let right = new KeyDisplay(this.scene,
			pos.x + 100, pos.y + 50,
			90 * Math.PI / 180,
			[1, 0]);

		requestAnimationFrame(() => { this.draw() })

	}

	draw() {

		this.ctx.fillStyle = '#fff';
		this.ctx.fillRect(0, 0, this.controls.width, this.controls.height);

		for (let i = 0; i < this.scene.objects.length; i++) {

			let obj = this.scene.objects[i];

			obj.draw();

		}
		requestAnimationFrame(() => { this.draw() })

	}

}

function onLoad() {

	// Asynchronously load the images an then run the game
	GameImages.loadAll(function () {
		new GameControl();
		new ControlDisplay();

	});

}
