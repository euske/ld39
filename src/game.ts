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


//  Balloon
//
class Balloon extends Widget {

    textbox: TextBox;
    sprite: FixedSprite;
    
    constructor(frame: Rect) {
	super();
	this.textbox = new TextBox(frame, FONT);
	this.textbox.background = 'rgb(0,0,0,0.5)';
        this.sprite = new FixedSprite(this.textbox);
    }

    setText(text: string) {
	this.textbox.putText([text]);
    }
	
}


//  Player
//
const BOTTOM = 210;
class Player extends Entity {

    game: Game;
    shadow: FixedSprite;
    died: Signal;
    flying: number = 0;
    state: number = 0;
    power: number = 0;
    usermove: Vec2 = new Vec2();

    constructor(game: Game, pos: Vec2) {
	super(pos);
	this.game = game;
	this.imgsrc = SPRITES.get(1);
	this.collider = this.imgsrc.getBounds();
	this.shadow = new FixedSprite(SPRITES.get(8));
	this.died = new Signal(this);
    }

    update() {
	super.update();
	switch (this.state) {
	case 1:
	    if (0 < this.flying) {
		this.usermove.y = this.usermove.y*0.5 - 1.0;
		this.flying--;
	    } else {
		this.usermove.y += 0.5;
	    }
	    this.usermove.y = clamp(-4, this.usermove.y, +4);
	    this.imgsrc = SPRITES.get(1, phase(getTime(), 0.3));
	    this.moveIfPossible(this.usermove);
	    if (BOTTOM-10 < this.pos.y) {
		this.state = 2;
		this.shadow.visible = false;
		this.died.fire();
		APP.setMusic();
		APP.playSound('splash');
	    }
	    break;
	case 2:
	    this.imgsrc = SPRITES.get(9, phase(getTime(), 0.2));
	    break;
	}
	let pos = new Vec2(this.pos.x, BOTTOM+(BOTTOM-this.pos.y)*0.5);
	this.shadow.bounds = this.imgsrc.getBounds().add(pos);
    }

    getSprites(): Sprite[] {
	let sprites = super.getSprites();
	sprites.push(this.shadow);
	return sprites;
    }

    fly(flying: boolean) {
	switch (this.state) {
	case 0:
	    if (flying) {
		this.state = 1;
		APP.setMusic('music', MP3_GAP, 16.0);
	    }
	    break;
	case 1:
	    if (flying && this.flying == 0) {
		this.flying = 20;
		APP.playSound('fly');
	    } else {
		this.flying = 0;
	    }
	    break;
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
    update() {
	super.update();
	this.imgsrc = SPRITES.get(3, phase(getTime(), 0.3));
    }
}

class Airplane extends Enemy {
    constructor(game: Game, pos: Vec2) {
	super(game, pos);
	this.imgsrc = SPRITES.get(4);
	this.collider = this.imgsrc.getBounds();
    }
    update() {
	super.update();
	this.imgsrc = SPRITES.get(4, phase(getTime(), 0.1));
    }
}

class Lightning extends Enemy {
    constructor(game: Game, pos: Vec2) {
	super(game, pos);
	this.imgsrc = SPRITES.get(5);
	this.collider = this.imgsrc.getBounds();
    }
    update() {
	super.update();
	this.imgsrc = SPRITES.get(5, phase(getTime(), 0.4));
    }
}


//  Game
// 
class Game extends GameScene {

    player: Player;
    
    clouds: StarImageSource;
    oceans: OceanImageSource;
    balloon: Balloon;
    
    distRect1: Rect;
    distRect2: Rect;
    sign1: TextBox;
    sign2: TextBox;
    
    speed: number;
    distance: number;
    seaLevel: number;
    
    init() {
	super.init();
	this.player = new Player(this, this.screen.center());
	this.player.chain(new DelayTask(2, () => { this.init(); }),
			  this.player.died);
	this.add(this.player);
	
	let cloud = new RectImageSource('rgb(255,255,255,0.8)', new Rect(-10,-5,20,10));
	this.clouds = new StarImageSource(this.screen, 20, 10,
					  [SPRITES.get(0,0), SPRITES.get(0,1)]);
	this.oceans = new OceanImageSource(new Rect(0, 0, this.screen.width, 80), 100);
	this.balloon = new Balloon(this.screen.resize(120,32,0,+1).move(0,64));

	this.distRect1 = this.screen.resize(240,8,0,+1).move(0.5,10.5);
	this.distRect2 = this.screen.resize(237,5,0,+1).move(1,12);
	this.sign1 = new TextBox(this.screen.resize(40,20,+1,+1).move(2,32), FONT);
	this.sign1.lineSpace = 2;
	this.sign1.putText(['<','TOKYO']);
	this.sign2 = new TextBox(this.screen.resize(72,20,-1,+1).move(-2,32), FONT);
	this.sign2.lineSpace = 2;
	this.sign2.putText(['SAN     >','FRANCISCO']);

	this.speed = 0.1;
	this.distance = 0;
	
	this.balloon.setText('TAP A BUTTON!');
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
	if (this.player.state != 0) {
	    this.clouds.move(new Vec2(-this.speed, 0));
	    this.oceans.move(-this.speed*2);
	    this.distance += this.speed*0.1;
	}
    }

    render(ctx: CanvasRenderingContext2D) {
	let seaLevel = this.player.pos.y*0.1+40;
	ctx.save();
	ctx.translate(0, -seaLevel);
	ctx.fillStyle = 'rgb(80,200,230)';
	ctx.fillRect(this.screen.x, this.screen.y,
		     this.screen.width, this.screen.height);
	this.clouds.render(ctx);
	ctx.translate(0, this.screen.height);
	ctx.fillStyle = 'rgb(0,0,255)';
	ctx.fillRect(this.screen.x, this.screen.y,
		     this.screen.width, this.screen.height-seaLevel);
	this.oceans.render(ctx);
	ctx.restore();
	super.render(ctx);
	// HUD
	ctx.strokeStyle = 'white';
	ctx.strokeRect(this.distRect1.x, this.distRect1.y,
		       this.distRect1.width, this.distRect1.height);
	ctx.fillStyle = 'rgb(0,128,0)';
	ctx.fillRect(this.distRect2.x, this.distRect2.y,
		     this.distance, this.distRect2.height);
	this.sign1.render(ctx);
	this.sign2.render(ctx);
    }
}
