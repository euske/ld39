/// <reference path="../base/utils.ts" />
/// <reference path="../base/geom.ts" />
/// <reference path="../base/entity.ts" />
/// <reference path="../base/text.ts" />
/// <reference path="../base/scene.ts" />
/// <reference path="../base/app.ts" />

///  game.ts
///


//  Initialize the resources.
let FONT: Font;
let SPRITES:ImageSpriteSheet;
addInitHook(() => {
    FONT = new ShadowFont(APP.images['font'], 'white');
    SPRITES = new ImageSpriteSheet(
	APP.images['sprites'], new Vec2(32,32), new Vec2(16,16));
});

class Line {
    p: Vec2;
    s: number;
}
class OceanImageSource implements ImageSource {
    
    bounds: Rect;
    private _lines: Line[] = [];

    constructor(bounds: Rect, nstars: number) {
	this.bounds = bounds
	for (let i = 0; i < nstars; i++) {
	    let line = new Line();
	    line.p = this.bounds.rndPt();
	    line.s = line.p.y/20+1;
	    this._lines.push(line);
	}
    }

    getBounds(): Rect {
	return this.bounds;
    }

    render(ctx: CanvasRenderingContext2D) {
	ctx.save();
	ctx.fillStyle = 'rgb(200,255,255)';
	ctx.translate(int(this.bounds.x), int(this.bounds.y));
	for (let line of this._lines) {
	    let rect = line.p.expand(line.s, 1);
	    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
	}
	ctx.restore();
    }
    
    move(vx: number) {
	for (let line of this._lines) {
	    line.p.x += vx*line.s;
	    let rect = line.p.expand(line.s, 1);
	    if (!this.bounds.overlapsRect(rect)) {
		line.p = this.bounds.modPt(line.p);
	    }
	}
    }
}


//  Player
//
class Player extends Entity {

    game: Game;
    usermove: Vec2;
    flying: number = 0;

    constructor(game: Game, pos: Vec2) {
	super(pos);
	this.game = game;
	this.imgsrc = SPRITES.get(1);
	this.collider = this.imgsrc.getBounds();
	this.usermove = new Vec2();
    }

    update() {
	super.update();
	this.imgsrc = SPRITES.get(1, phase(getTime(), 0.3));
	if (this.game.started) {
	    if (0 < this.flying) {
		this.usermove.y = this.usermove.y*0.5 - 1.0;
		this.flying--;
	    } else {
		this.usermove.y += 0.5;
	    }
	    this.usermove.y = clamp(-4, this.usermove.y, +4);
	    this.moveIfPossible(this.usermove);
	}
    }
    
    fly(flying: boolean) {
	if (!this.game.started) {
	    this.game.started = true;
	}
	if (flying && this.flying == 0) {
	    this.flying = 20;
	    APP.playSound('fly');
	} else {
	    this.flying = 0;
	}
    }
}


//  Enemy
//
class Enemy extends Projectile {

    game: Game;
    
    constructor(game: Game, pos: Vec2) {
	super(pos);
	this.game = game;
    }

    update() {
	super.update();
	this.pos.x -= this.game.speed;
    }
}

class Birdy extends Enemy {
    constructor(game: Game, pos: Vec2) {
	super(game, pos);
	this.imgsrc = SPRITES.get(3);
	this.collider = this.imgsrc.getBounds();
    }
}


//  Game
// 
class Game extends GameScene {

    player: Player;
    
    clouds: StarImageSource;
    oceans: OceanImageSource;
    dialog: DialogBox;
    
    distRect1: Rect;
    distRect2: Rect;
    sign1: TextBox;
    sign2: TextBox;
    
    started: boolean;
    speed: number;
    distance: number;
    seaLevel: number;
    
    init() {
	super.init();
	this.player = new Player(this, this.screen.center());
	this.add(this.player);
	
	let cloud = new RectImageSource('rgb(255,255,255,0.8)', new Rect(-10,-5,20,10));
	this.clouds = new StarImageSource(this.screen, 20, 10,
					  [SPRITES.get(0,0), SPRITES.get(0,1)]);
	this.oceans = new OceanImageSource(new Rect(0, 0, this.screen.width, 80), 100);
	let balloon = new TextBox(this.screen.resize(120,32,0,+1).move(0,64), FONT);
	balloon.background = 'rgb(0,0,0,0.5)';
	this.dialog = new DialogBox(balloon);
	this.add(this.dialog);

	this.distRect1 = this.screen.resize(240,8,0,+1).move(0.5,10.5);
	this.distRect2 = this.screen.resize(237,5,0,+1).move(1,12);
	this.sign1 = new TextBox(this.screen.resize(40,20,+1,+1).move(2,32), FONT);
	this.sign1.lineSpace = 2;
	this.sign1.putText(['<-','TOKYO']);
	this.sign2 = new TextBox(this.screen.resize(72,20,-1,+1).move(-2,32), FONT);
	this.sign2.lineSpace = 2;
	this.sign2.putText(['SAN    ->','FRANCISCO']);

	this.started = false;
	this.speed = 0.1;
	this.distance = 0;
	this.seaLevel = 10;
	
	this.dialog.addDisplay('TAP A BUTTON!');
    }

    onButtonPressed(keysym: KeySym) {
	this.player.fly(true);
    }
    onButtonReleased(keysym: KeySym) {
	this.player.fly(false);
    }
    onMouseDown(p: Vec2, button: number) {
	this.player.fly(true);
    }
    onMouseUp(p: Vec2, button: number) {
	this.player.fly(false);
    }

    update() {
	super.update();
	if (this.started) {
	    this.clouds.move(new Vec2(-this.speed, 0));
	    this.oceans.move(-this.speed*2);
	    this.distance += this.speed*0.1;
	    this.seaLevel -= this.seaLevel/2 + rnd(5)-2;
	}
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	let seaLevel = this.seaLevel+40;
	ctx.save();
	ctx.translate(0, -seaLevel);
	ctx.fillStyle = 'rgb(80,200,230)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	this.clouds.render(ctx);
	ctx.translate(0, this.screen.height);
	ctx.fillStyle = 'rgb(0,0,255)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height-seaLevel);
	this.oceans.render(ctx);
	ctx.restore();
	super.render(ctx, bx, by);
	// HUD
	ctx.strokeStyle = 'white';
	ctx.strokeRect(bx+this.distRect1.x, by+this.distRect1.y,
		       this.distRect1.width, this.distRect1.height);
	ctx.fillStyle = 'rgb(255,0,0)';
	ctx.fillRect(bx+this.distRect2.x, by+this.distRect2.y,
		     this.distance, this.distRect2.height);
	this.sign1.render(ctx);
	this.sign2.render(ctx);
    }
}
