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
	constructor(x, y, imageName, direction, goldLimit) {
		super(x, y, imageName);
		this.time = 0;	// timestamp used in the control of the animations
		this.direction = direction;
		this.collectedGold = 0;
		this.goldLimit = goldLimit;
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

	numberedDirection() {
		if (this.direction == "left") {
			return -1;
		} else {
			return 1;
		}
	}

	inBounds(dx, dy) {
		return this.x + dx >= 0 && this.x + dx < WORLD_WIDTH
			&& this.y + dy >= 0 && this.y + dy < WORLD_HEIGHT;
	}

	collides(dx, dy) {
		return !this.inBounds(dx, dy)
			|| control.world[this.x + dx][this.y + dy].collides;
	}

	isStanding() {
		return this.collides(0, 1)
			|| (!this.isClimbing() && control.world[this.x][this.y + 1].climbable);
	}

	isHanging() {
		return control.world[this.x][this.y].hang;
	}

	isClimbing() {
		return control.world[this.x][this.y].climbable;
	}

	isFalling() {
		return !this.isStanding()
			&& !this.isHanging()
			&& !this.isClimbing();
	}

	canPickUpGold() {
		return this.collectedGold < this.goldLimit;
	}

	// pre: background is gold
	pickUpGold() {
		this.collectedGold++;
		control.world[this.x][this.y].hide();
	}

	backgroundAction() {
		switch (control.world[this.x][this.y].imageName) {
			case "rope":
				return "on_rope";
				break;

			case "ladder":
				return "on_ladder";
				break;

			case "gold":
				if (this.canPickUpGold()) {
					this.pickUpGold();
				}
			case "empty":
			case "chimney":
				if (this.isFalling()) {
					return "falls";
				} else {
					return "runs";
				}
				break;

			default:
				throw "Unexpected background";
				break;
		}
	}

	attemptMove(dx, dy) {
		if (!this.collides(dx, dy)) {
			if (dx != 0) {
				this.x += dx;
				this.direction = ['left', this.direction, 'right'][dx + 1];
				return true;
			}
			if (this.isClimbing()
				|| (dy === 1
					&& (this.isHanging() || this.isStanding()))) {

				this.y += dy;
				return true;
			}
		}
		return false;
	}
}

class Brick extends PassiveActor {
	constructor(x, y) {
		super(x, y, "brick");
		this.collides = true;
		this.breaks = true;
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
		super(x, y, "empty");
		this.climbable = false;
	}

	makeVisible() {
		this.imageName = "ladder";
		this.climbable = true;
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
		super(x, y, "hero_runs_left", "left", Number.POSITIVE_INFINITY);
	}

	breakBlock(direction) {
		if (control.world[this.x + direction][this.y + 1].breaks
			&& !control.world[this.x + direction][this.y].collides) {

			control.broken.push(
				[control.time + 5 * ANIMATION_EVENTS_PER_SECOND,
				control.world[this.x + direction][this.y + 1]]);

			control.world[this.x + direction][this.y + 1].hide();
		}
	}

	recoil() {
		let nDirection = this.numberedDirection()
		if (!this.collides(-nDirection, 0)
			&& (control.world[this.x - nDirection][this.y + 1].collides
				|| control.world[this.x - nDirection][this.y + 1] instanceof Ladder)) {

			this.x -= nDirection;
		}
	}

	shoot() {
		this.breakBlock(this.numberedDirection());
		this.recoil();
		this.backgroundAction();
	}

	act(k) {
		if (this.isFalling()) {
			this.y++;

		} else if (k != null) {
			let [dx, dy] = k;
			if (dy === "space") {
				this.shoot();
				this.imageName = `hero_shoots_${this.direction}`;
			} else {
				super.attemptMove(dx, dy);
				this.imageName = `hero_${this.backgroundAction()}_${this.direction}`;
			}
		}
	}

	pickUpGold() {
		super.pickUpGold();
		if (this.collectedGold >= control.worldGold)
			control.showExit();
	}

	animation() {
		this.hide();
		control.lastKey = control.getKey();
		this.act(control.lastKey);
		this.show();
	}
}

class Robot extends ActiveActor {
	constructor(x, y) {
		super(x, y, "robot_runs_right", "right", 1);
		this.dx = 1;
		this.dy = 0;
		this.goldDropAt = null;
		this.nextGoldPickup = 0;
	}

	pickUpGold() {
		if (this.time >= this.nextGoldPickup) {
			super.pickUpGold();
			this.goldDropAt = this.time + 10 * ANIMATION_EVENTS_PER_SECOND;
		}
	}

	getMovesList() {
		let moves = [
			[[-1, 0], null],
			[[0, -1], null],
			[[1, 0], null],
			[[0, 1], null]
		];

		for (let i = 0; i < moves.length; i++) {
			const [dx, dy] = moves[i][0];
			moves[i][1] = Math.hypot(this.x - hero.x + dx, this.y - hero.y + dy);
		}
		moves.push([null, Math.hypot(this.x - hero.x, this.y - hero.y)]);
		moves.sort((a, b) => a[1] - b[1]);

		moves = (moves => {
			let a = [];
			moves.forEach(move => {
				a.push(move[0]);
			});
			return a;
		})(moves);

		return moves;
	}

	isFalling() {
		return super.isFalling() && !(control.worldActive[this.x][this.y + 1] instanceof Robot)
			&& !((ax, ay) => {
				for (let i = 0; i < control.broken.length; i++) {
					const element = control.broken[i][1];
					if (ax == element.x && ay == element.y) {
						return true;
					}
				}
				return false;
			})(this.x, this.y);
	}

	moveTowardsHero() {
		if (this.isFalling()) {
			this.y++;

		} else {
			let moves = this.getMovesList();
			if (moves != null) {
				let moved = false;
				for (let i = 0; i < moves.length && moves[i] != null && !moved; i++) {
					const [dx, dy] = moves[i];
					if (!(control.worldActive[this.x + dx][this.y + dy] instanceof Robot)) {
						moved = super.attemptMove(dx, dy);
					}
				}
			}
		}
		this.imageName = `robot_${this.backgroundAction()}_${this.direction}`;
	}

	dropGoldAt(dx) {
		if (control.world[this.x + dx][this.y + 1].collides && control.world[this.x + dx][this.y] instanceof Empty
			&& control.worldActive[this.x + dx][this.y] instanceof Empty) {

			control.world[this.x + dx][this.y] = new Gold(this.x + dx, this.y);
			control.world[this.x + dx][this.y].show();
			this.collectedGold = 0;
			this.goldDropAt = null;
			this.nextGoldPickup = this.time + 2 * ANIMATION_EVENTS_PER_SECOND;
		}
	}

	attemptDropGold() {
		let drop = (direction => {
			this.dropGoldAt(direction);
			if (this.goldDropAt != null) {
				this.dropGoldAt(-direction);
			}
		})
		if (this.direction == "left") {
			drop(1);
		} else {
			drop(-1);
		}
	}

	animation() {
		let difficulty = 3;
		if (this.time % difficulty == 0) {
			this.hide();
			this.moveTowardsHero();
			if (this.goldDropAt != null && this.time >= this.goldDropAt) {
				this.attemptDropGold();
			}
			this.show();
		}
	}
}

// GAME CONTROL

class GameControl {
	constructor() {
		control = this;
		this.key = 0;
		this.lastKey = null;
		this.time = 0;
		this.worldGold = 0;
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
		this.worldGold = 0;
		this.broken = [];
		if (level < 1 || level > MAPS.length)
			fatalError("Invalid level " + level)
		this.clearLevel();
		let map = MAPS[level - 1];  // -1 because levels start at 1
		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				// x/y reversed because map stored by lines
				GameFactory.actorFromCode(map[y][x], x, y);
				this.worldGold += this.world[x][y] instanceof Gold;
			}

	}

	showExit() {
		for (let x = 0; x < WORLD_WIDTH; x++)
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				if (this.world[x][y] instanceof Ladder)
					this.world[x][y].makeVisible();
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
			case 32: return ["space", "space"]; // Hackery hacks
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
		for (let x = 0; x < WORLD_WIDTH; x++) {
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				let a = control.worldActive[x][y];
				if (a.time < control.time) {
					a.time = control.time;
					a.animation();
				}
			}
		}
		for (let i = 0; i < control.broken.length; i++) {
			const [regenTime, block] = control.broken[i];
			if (control.time >= regenTime) {
				control.world[block.x][block.y] = block;
				control.worldActive[block.x][block.y] = empty;
				block.show();
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
	constructor() { }
	draw() { }

}

class RectDisplay extends KeyDisplay {
	constructor(scene, x = 0, y = 0, width = 100, height = 30, cond = ["space", "space"]) {
		super();

		this.scene = scene;
		this.scene.objects.push(this);

		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
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

		this.scene.ctx.fillRect(0, 0, this.width, this.height);

		this.scene.ctx.restore();
	}

}

class ArrowDisplay extends KeyDisplay {


	constructor(scene, x = 0, y = 0, angle = 0, cond = [0, 0]) {
		super();

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

		this.scene.ctx.fillStyle = '#d8dee9';

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

						pctx.drawImage(GameImages[sprite], x * ACTOR_PIXELS_X, y * ACTOR_PIXELS_Y);

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

		let pos = { x: (this.controls.width - 150) / 2, y: (this.controls.height - 50) / 2 };

		let up = new ArrowDisplay(this.scene,
			pos.x + 50, pos.y,
			0 * Math.PI / 180,
			[0, -1]);
		let down = new ArrowDisplay(this.scene,
			pos.x + 50, pos.y + 50,
			180 * Math.PI / 180,
			[0, 1]);
		let left = new ArrowDisplay(this.scene,
			pos.x, pos.y + 50,
			-90 * Math.PI / 180,
			[-1, 0]);
		let right = new ArrowDisplay(this.scene,
			pos.x + 100, pos.y + 50,
			90 * Math.PI / 180,
			[1, 0]);
		let space = new RectDisplay(this.scene,
			pos.x + 10, pos.y + 110,
			130, 40,
			["space", "space"]);

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
