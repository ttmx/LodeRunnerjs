/*     Lode Runner

Autores: Andre Palma (55415), Tiago Teles (54953)

O nosso projeto tem um sistema descentralizado de classes onde cada uma
inspeciona o estado das com quem quer interagir e toma decisoes baseadas no mesmo.
Temos tambem um display secundario onde informacao extra é apresentada, como o tempo atual,
o tempo minimo em que já se fez aquele nivel, e o ouro apanhado

Todas as funcionalidades previstas foram implementadas


01234567890123456789012345678901234567890123456789012345678901234567890123456789
*/

// GLOBAL VARIABLES

// tente não definir mais nenhuma variável global

let empty, hero, control;


// ACTORS

const NORTH = 0;
const SOUTH = 1;
const EAST = 2;
const WEST = 3;
const moves = [
	[0, -1],
	[0, 1],
	[-1, 0],
	[1, 0]
]

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

	constructor(x, y, imageName, collisions) {
		super(x, y, imageName);
		this.collisions = collisions;
	}

	collidesWithAny(directions) {
		for (let i = 0; i < directions.length; i++) {
			if (this.collisions[directions[i]]) {
				return true;
			}
		}
		return false;
	}

	isFullyCollidable() {
		return this.collisions.every(collision => { return collision })
	}

	isFullyUncollidable() {
		return this.collisions.every(collision => { return !collision })
	}

	static fullyUncollidable() {
		return [false, false, false, false];
	}

	static fullyCollidable() {
		return [true, true, true, true];
	}

	isHole() {
		return false;
	}

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

	getBlockIn(direction) {
		let [dx, dy] = moves[direction];
		return control.world[this.x + dx][this.y + dy];
	}

	inBounds(dx, dy) {
		return control.inWorldBounds(this.x + dx, this.y + dy);
	}

	isStanding() {
		return !this.inBounds(0, 1)
			|| this.getBlockIn(SOUTH).collidesWithAny([NORTH]);
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

	invalidMove(move) {
		return !moves.some((elem) => {
			return elem[0] == move[0]
				&& elem[1] == move[1]
		});
	}

	moveNorth() {
		if (this.isClimbing() && !this.getBlockIn(NORTH).collidesWithAny([SOUTH])) {
			this.y--;
			return true;
		} else {
			return false;
		}
	}

	moveSouth() {
		let blockBelow = this.getBlockIn(SOUTH);
		if (!blockBelow.collidesWithAny([NORTH]) || blockBelow.climbable) {
			this.y++;
			return true;
		} else {
			return false;
		}
	}

	verticalMove(dy) {
		if (dy == -1) {
			return this.moveNorth();
		} else {
			return this.moveSouth();
		}
	}

	horizontalMove(dx) {
		let move = [EAST, null, WEST];
		if (!this.getBlockIn(move[dx + 1]).collidesWithAny([move[-dx + 1]])) {
			this.x += dx;
			this.direction = ['left', this.direction, 'right'][dx + 1];
			return true;
		} else {
			return false;
		}
	}

	attemptMove(dx, dy) {
		if (dx == 0) {
			return this.verticalMove(dy);
		} else {
			return this.horizontalMove(dx);
		}
	}
}

class Brick extends PassiveActor {
	constructor(x, y) {
		super(x, y, "brick", PassiveActor.fullyCollidable());
		this.breaks = true;
	}
}

class Chimney extends PassiveActor {
	constructor(x, y) { super(x, y, "chimney", PassiveActor.fullyUncollidable()); }
}

class Empty extends PassiveActor {
	constructor() {
		super(-1, -1, "empty", PassiveActor.fullyUncollidable());
		this.isEmpty = true;
	}
	show() { }
	hide() { }
}

class Gold extends PassiveActor {
	constructor(x, y) { super(x, y, "gold", PassiveActor.fullyUncollidable()); }
}

class Invalid extends PassiveActor {
	constructor(x, y) { super(x, y, "invalid", PassiveActor.fullyUncollidable()); }
}

class Hole extends PassiveActor {
	constructor(x, y, holesDuration) {
		super(x, y, "empty", PassiveActor.fullyUncollidable());
		this.holeDuration = holesDuration;
	}

	isHole() {
		return true;
	}
}

class Ladder extends PassiveActor {
	constructor(x, y) {
		super(x, y, "empty", PassiveActor.fullyUncollidable());
		this.climbable = false;
	}

	makeVisible() {
		this.imageName = "ladder";
		this.collisions[NORTH] = true;
		this.climbable = true;
		this.show();
	}
}

class Rope extends PassiveActor {
	constructor(x, y) {
		super(x, y, "rope", PassiveActor.fullyUncollidable());
		this.hang = true;
	}
}

class Stone extends PassiveActor {
	constructor(x, y) {
		super(x, y, "stone", PassiveActor.fullyCollidable());
	}
}

class Hero extends ActiveActor {
	constructor(x, y) {
		super(x, y, "hero_runs_left", "left", Number.POSITIVE_INFINITY);
	}

	aimedBlock() {
		return control.world[this.x + this.numberedDirection()][this.y + 1];
	}

	breakAimedBlock() {
		if (this.aimedBlock().breaks
			&& !control.world[this.x + this.numberedDirection()][this.y].isFullyCollidable()) {

			control.placeHole(this.x + this.numberedDirection(), this.y + 1);
		}
	}

	recoil() {
		let nDirection = this.numberedDirection();
		let move = [EAST, null, WEST];
		if (this.inBounds(-nDirection, 0)
			&& !this.getBlockIn(move[-nDirection + 1]).collidesWithAny([move[nDirection + 1]])
			&& control.world[this.x - nDirection][this.y + 1].collidesWithAny([NORTH])) {

			this.x -= nDirection;
		}
	}

	shoot() {
		this.breakAimedBlock();
		this.recoil();
		this.backgroundAction();
	}

	isFalling() {
		return super.isFalling()
			&& !(this.getBlockIn(SOUTH).isHole() && (control.worldActive[this.x][this.y + 1].isRobot));
	}

	act(k) {
		if (this.isFalling()) {
			this.y++;
			this.backgroundAction();
		} else if (k != null) {
			let [dx, dy] = k;
			if (dy === "space") {
				this.shoot();
				this.imageName = `hero_shoots_${this.direction}`;
				return;
			} else if (!this.invalidMove([dx, dy])) {
				if (this.inBounds(dx, dy)
					&& !(control.worldActive[this.x + dx][this.y + dy].isRobot)) {

					this.attemptMove(dx, dy);
				}
			}
		}
		this.imageName = `hero_${this.backgroundAction()}_${this.direction}`;
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
		if (!(control.worldActive[this.x][this.y].isRobot)) {
			this.show();
		}
	}
}

class Robot extends ActiveActor {
	constructor(x, y) {
		super(x, y, "robot_runs_right", "right", 1);
		this.dx = 1;
		this.dy = 0;
		this.goldDropAt = null;
		this.nextGoldPickup = 0;
		this.escapeHoleTime = null;
		this.nextFallIntoHole = 0;
		this.isRobot = true;
	}

	pickUpGold() {
		if (this.time >= this.nextGoldPickup) {
			super.pickUpGold();
			this.goldDropAt = this.time + 10 * ANIMATION_EVENTS_PER_SECOND;
		}
	}

	getMovesList() {
		let movements = [
			[moves[NORTH], null],
			[moves[SOUTH], null],
			[moves[EAST], null],
			[moves[WEST], null]
		];

		for (let i = 0; i < movements.length; i++) {
			const [dx, dy] = movements[i][0];
			movements[i][1] = Math.hypot(this.x - hero.x + dx, this.y - hero.y + dy);
		}
		movements.push([null, Math.hypot(this.x - hero.x, this.y - hero.y)]);
		movements.sort((a, b) => a[1] - b[1]);

		let finalMoves = [];
		movements.forEach(movements => {
			finalMoves.push(movements[0]);
		});

		return finalMoves;
	}

	isInHole() {
		return control.world[this.x][this.y].isHole();
	}

	isFalling() {

		if (super.isFalling()
			&& !(control.worldActive[this.x][this.y + 1].isRobot)
			&& !this.isInHole()) {

			if (this.getBlockIn(SOUTH).isHole()) {
				if (this.nextFallIntoHole <= this.time) {
					return true;
				}
			} else {
				return true;
			}
		}
		return false;
	}

	moveTowardsHero() {
		if (this.isFalling()) {
			this.y++;
			if (this.isInHole()) {
				this.escapeHoleTime = this.time + 2 * ANIMATION_EVENTS_PER_SECOND;
				if (this.collectedGold > 0) {
					let findGoldSpot = ((x, y) => {
						if (this.getBlockIn(NORTH).isEmpty) {
							return [x, y - 1];
						} else {
							for (let newX = 0; newX < WORLD_WIDTH; newX++) {
								for (let newY = 0; newY < WORLD_HEIGHT; newY++) {
									if (control.world[newX][newY].isEmpty && control.world[newX][newY + 1].isFullyCollidable()) {
										return [newX, newY];
									}
								}
							}
							return null;
						}
					})

					let coordinates = findGoldSpot(this.x, this.y);
					this.placeGoldAt(coordinates[0], coordinates[1]);
				}
			}
		} else {
			let moves = this.getMovesList();
			if (moves != null) {
				let moved = false;
				for (let i = 0; i < moves.length && moves[i] != null && !moved; i++) {
					const [dx, dy] = moves[i];
					if (!(control.worldActive[this.x + dx][this.y + dy].isRobot)) {
						moved = super.attemptMove(dx, dy);
					}
				}
			}
		}
		if (!this.isInHole()) {
			this.imageName = `robot_${this.backgroundAction()}_${this.direction}`;
		}
	}

	placeGoldAt(x, y) {
		control.placeGold(x, y);
		this.collectedGold = 0;
		this.goldDropAt = null;
		this.nextGoldPickup = this.time + 2 * ANIMATION_EVENTS_PER_SECOND;
	}

	dropGoldAt(dx) {
		if (control.world[this.x + dx][this.y + 1].isFullyCollidable() && control.world[this.x + dx][this.y].isEmpty
			&& control.worldActive[this.x + dx][this.y].isEmpty) {

			this.placeGoldAt(this.x + dx, this.y);
			return true;
		}
		return false;
	}

	attemptDropGold() {
		if (this.goldDropAt != null && this.time >= this.goldDropAt) {
			let drop = (direction => {
				if (!this.dropGoldAt(direction)) {
					this.dropGoldAt(-direction);
				}
			})
			drop(this.numberedDirection());
		}
	}

	escapeHole() {
		if (!control.world[this.x][this.y - 1].collidesWithAny([SOUTH])) {

			this.y--;
			this.nextFallIntoHole = control.time + 6;
			this.escapeHoleTime = null;
		}
	}

	animation() {
		if (this.time % control.difficulty == 0) {
			this.hide();
			if (!this.isInHole()) {
				this.moveTowardsHero();
			} else if (control.time >= this.escapeHoleTime) {
				this.escapeHole();
			}
			this.attemptDropGold();
			this.show();
		}
	}
}

// GAME CONTROL

class GameControl {
	constructor() {
		control = this;
		this.defaultGameLogic();
		this.currentLevel = parseInt(localStorage.getItem('currentLevel'));
		if (isNaN(this.currentLevel))
			this.currentLevel = 1;
		this.highscores = JSON.parse(localStorage.getItem('highscores'));
		if (this.highscores === null)
			this.highscores = [];
		empty = new Empty();	// only one empty actor needed
		this.ctx = document.getElementById("canvas1").getContext('2d');
		this.loadLevel(this.currentLevel + 1);
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

	defaultGameLogic() {
		this.key = 0;
		this.lastKey = null;
		this.time = 0;
		this.difficulty = 3;
		this.holesDuration = 5 * ANIMATION_EVENTS_PER_SECOND;
		this.worldGold = 0;
		this.holes = [];
		this.winCondition = (() => { return control.worldGold == hero.collectedGold && hero.y == 0 });
		this.world = this.createMatrix();
		this.worldActive = this.createMatrix();
	}

	placeGold(x, y) {
		control.world[x][y] = new Gold(x, y);
		control.world[x][y].show();
	}

	placeHole(x, y) {
		control.holes.push(
			[control.time + 5 * ANIMATION_EVENTS_PER_SECOND,
			control.world[x][y]]);

		control.world[x][y] = new Hole(x, y);
	}

	clearLevel() {

		this.defaultGameLogic();
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.ctx.rect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.ctx.fillStyle = "#fff";
		this.ctx.fill();

	}
	loadLevel(level) {
		this.worldGold = 0;
		level = ((level - 1) % MAPS.length);
		this.broken = [];
		if (level < 0 || level >= MAPS.length)
			fatalError("Invalid level " + level)
		this.clearLevel();
		this.starttime = new Date().getTime();
		this.currentLevel = level + 1;
		localStorage.setItem('currentLevel', level);
		let map = MAPS[level];  // -1 because levels start at 1
		for (let x = 0; x < WORLD_WIDTH; x++) {
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				// x/y reversed because map stored by lines
				GameFactory.actorFromCode(map[y][x], x, y);
				if (this.world[x][y] instanceof Gold) {
					this.worldGold++;
				}
			}
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

	updateActiveActorAnimations() {
		for (let x = 0; x < WORLD_WIDTH; x++) {
			for (let y = 0; y < WORLD_HEIGHT; y++) {
				let activeActor = this.worldActive[x][y];
				if (activeActor.time < this.time) {
					activeActor.time = this.time;
					activeActor.animation();
				}
			}
		}
	}

	updateHoles() {
		for (let i = 0; i < this.holes.length; i++) {
			const [regenTime, block] = this.holes[i];
			if (this.time >= regenTime) {
				this.world[block.x][block.y] = block;
				this.worldActive[block.x][block.y] = empty;
				block.show();
				this.holes.shift();
				i--;
			}
		}
	}

	heroDied() {
		return !(this.worldActive[hero.x][hero.y] instanceof Hero);
	}

	animationEvent() {
		control.time++;
		control.updateActiveActorAnimations();
		control.updateHoles();
		if (control.winCondition()) {
			control.winLevel();
		}
		if (control.heroDied()) {
			control.loseLevel();
		}
	}


	loseLevel() {
		setTimeout(() => { this.clearLevel(); this.loadLevel(this.currentLevel); }, 600);
	}

	keyDownEvent(k) {
		control.key = k.keyCode;
	}
	keyUpEvent(k) {
	}

	inWorldBounds(x, y) {
		return x >= 0 && x < WORLD_WIDTH
			&& y >= 0 && y < WORLD_HEIGHT;
	}

	storeHighscore() {

		let timeSpan = new Date().getTime() - this.starttime;
		let highscores = JSON.parse(localStorage.getItem('highscores'));
		if (highscores === null)
			highscores = [];
		if (highscores[this.currentLevel] > timeSpan || isNaN(highscores[this.currentLevel]))
			highscores[this.currentLevel] = timeSpan;
		localStorage.setItem('highscores', JSON.stringify(highscores));
	}

	drawWin() {
		this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		this.ctx.font = "20px bitFont";
		this.ctx.textAlign = "center";
		let interval = 1000 / 60;
		let iteration = 0;
		let animator = setInterval(() => {
			iteration++;
			this.ctx.fillStyle = "#81A1C1"
			this.ctx.fillRect(0, 0, iteration * (interval / 5000) * this.ctx.canvas.width, this.ctx.canvas.height);
			this.ctx.fillStyle = "#4C566A";
			this.ctx.fillRect(100, 100, 300, 50);
			this.ctx.fillStyle = "#81A1C1"
			this.ctx.fillText("Level Completed", this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
			if (iteration >= 5000 / interval)
				clearInterval(animator);
		}, interval);
	}

	winLevel() {
		this.clearLevel();
		this.storeHighscore();
		this.drawWin();
		setTimeout(() => { this.loadLevel(this.currentLevel + 1) }, 6000);

	}
}


// HTML FORM

class Display {
	constructor() { }
	draw() { }

}

class TimeDisplay extends Display {
	constructor(scene, x = 0, y = 0) {
		super();

		this.scene = scene;
		this.scene.objects.push(this);

		this.x = x;
		this.y = y;

	}

	draw() {
		this.scene.ctx.font = "15px bitFont";
		this.scene.ctx.fillStyle = "#BF616A";
		this.scene.ctx.fillText("Time: " + ((new Date().getTime() - control.starttime) / 1000).toFixed(1) + "s", this.x, this.y);
		this.scene.ctx.fillText("Lowest: " + (control.highscores[control.currentLevel] / 1000).toFixed(1) + "s", this.x, this.y + 25);
		this.scene.ctx.fillText("Gold: " + hero.collectedGold + "/" + control.worldGold, this.x, this.y + 50);
	}

}

class RectDisplay extends Display {
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

class ArrowDisplay extends Display {


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
				document.getElementById("canvas1").focus();

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

		let time = new TimeDisplay(this.scene,
			10, 20);

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
