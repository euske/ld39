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
    hideTime: number = 0;
    
    constructor(frame: Rect) {
	super();
	this.textbox = new TextBox(frame, FONT);
	this.textbox.background = 'rgb(0,0,0,0.7)';
        this.sprite = new FixedSprite(this.textbox);
    }

    getSprites(): Sprite[] {
	let sprites = super.getSprites();
	sprites.push(this.sprite);
	return sprites;
    }

    setText(text: string, duration=2) {
	this.textbox.putText([text], 'center', 'center');
	this.sprite.visible = true;
	this.hideTime = getTime()+duration;
    }

    update() {
	if (this.hideTime < getTime()) {
	    this.sprite.visible = false;
	}
    }
}


//  Player
//
const BOTTOM = 210;
const DEAD = 999;
class Player extends Entity {

    game: Game;
    shadow: FixedSprite;
    died: Signal;
    flying: number = 0;
    state: number = 0;
    usermove: Vec2 = new Vec2();

    tempstate: number = 0;
    tempend: number = 0;

    constructor(game: Game) {
	super(null);
	this.game = game;
	this.imgsrc = SPRITES.get(1);
	this.collider = this.imgsrc.getBounds();
	this.shadow = new FixedSprite(SPRITES.get(8));
	this.died = new Signal(this);
    }

    getSprites(): Sprite[] {
	let sprites = super.getSprites();
	sprites.push(this.shadow);
	return sprites;
    }

    getFencesFor(range: Rect, v: Vec2, context: string): Rect[] {
	return [this.game.screen];
    }

    init() {
	super.init();
	this.pos = new Vec2(this.game.speed*80-20, 140);
    }
    
    update2() {
	if (0 < this.flying) {
	    this.flying--;
	} else {
	    this.usermove.y += 0.5;
	}
	this.usermove.y = clamp(-4, this.usermove.y, +4);
	this.pos.x = this.game.speed * 80 - 20;
	this.moveIfPossible(this.usermove);
	if (BOTTOM-10 < this.pos.y) {
	    this.die();
	}
    }

    update() {
	super.update();
	let state = this.state;
	if (this.tempstate != 0) {
	    state = this.tempstate;
	    if (this.tempend < getTime()) {
		this.tempstate = 0;
	    }
	}
	switch (state) {
	case 1:
	    if (0 < this.flying) {
		this.usermove.y = this.usermove.y*0.5 - 1.0;
	    }
	    this.imgsrc = SPRITES.get(1, phase(getTime(), 0.5));
	    this.update2();
	    break;
	case 2:
	    if (0 < this.flying) {
		this.usermove.y = this.usermove.y*0.5 - 0.6;
	    }
	    this.imgsrc = SPRITES.get(2, phase(getTime(), 0.3));
	    this.update2();
	    break;
	case 3:
	    if (0 < this.flying) {
		this.usermove.y = this.usermove.y*0.5 - 0.3;
	    }
	    this.imgsrc = SPRITES.get(3, phase(getTime(), 0.2));
	    this.update2();
	    break;
	case DEAD:
	    this.imgsrc = SPRITES.get(9, phase(getTime(), 0.2));
	    break;
	}
	let pos = new Vec2(this.pos.x, BOTTOM+(BOTTOM-this.pos.y)*0.5);
	this.shadow.bounds = this.imgsrc.getBounds().add(pos);
    }

    die() {
	if (this.state == DEAD) return;
	this.state = DEAD;
	this.shadow.visible = false;
	this.died.fire();
	APP.setMusic();
	APP.playSound('splash');
    }

    fly(flying: boolean) {
	let duration = 0;
	switch (this.state) {
	case 0:
	    if (flying) {
		APP.setMusic('music', MP3_GAP, 16.0);
		this.state = 1;
	    }
	    break;
	case 1:
	    duration = 20;
	    break;
	case 2:
	    duration = 10;
	    break;
	case 3:
	    duration = 5;
	    break;
	}	    
	if (flying && this.flying == 0) {
	    this.flying = duration;
	    APP.playSound('fly');
	} else {
	    this.flying = 0;
	}
    }

    collidedWith(entity: Entity) {
	if (entity instanceof Birdy ||
	    entity instanceof Airplane ||
	    entity instanceof Lightning) {
	    if (this.tempstate == 0) {
		APP.playSound('hurt');
		this.tempstate = Math.min(this.state+1, 3);
		this.tempend = getTime()+2.0;
	    }
	}
    }
}


//  Thingy
//
class Thingy extends Projectile {

    game: Game;
    
    constructor(game: Game) {
	super(new Vec2(game.screen.right(), rnd(20,200)));
	this.game = game;
    }

    update() {
	this.pos.x -= this.game.speed;
	super.update();
    }
}

class Birdy extends Thingy {
    constructor(game: Game) {
	super(game);
	this.imgsrc = SPRITES.get(4);
	this.collider = this.imgsrc.getBounds();
    }
    update() {
	super.update();
	this.imgsrc = SPRITES.get(4, phase(getTime(), 0.8));
    }
}

class Airplane extends Thingy {
    constructor(game: Game) {
	super(game);
	this.imgsrc = SPRITES.get(5);
	this.movement = new Vec2(-2, (rnd(3)-1)*0.2);
	this.collider = this.imgsrc.getBounds();
    }
    update() {
	super.update();
	this.imgsrc = SPRITES.get(5, phase(getTime(), 0.2));
    }
}

class Lightning extends Thingy {
    constructor(game: Game) {
	super(game);
	this.imgsrc = SPRITES.get(6);
	this.collider = this.imgsrc.getBounds();
    }
    update() {
	super.update();
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
    nextobj: number;
    
    init() {
	super.init();
	this.player = new Player(this);
	this.player.chain(new DelayTask(2, () => { this.init(); }),
			  this.player.died);
	this.add(this.player);
	
	let cloud = new RectImageSource('rgb(255,255,255,0.8)', new Rect(-10,-5,20,10));
	this.clouds = new StarImageSource(this.screen, 20, 10,
					  [SPRITES.get(0,0), SPRITES.get(0,1)]);
	this.oceans = new OceanImageSource(new Rect(0, 0, this.screen.width, 80), 100);
	this.balloon = new Balloon(this.screen.resize(200,32,0,0).move(0,-32));
	this.layer.addWidget(this.balloon);

	this.distRect1 = this.screen.resize(240,8,0,+1).move(0.5,10.5);
	this.distRect2 = this.screen.resize(237,5,0,+1).move(1,12);
	this.sign1 = new TextBox(this.screen.resize(40,20,+1,+1).move(2,32), FONT);
	this.sign1.lineSpace = 2;
	this.sign1.putText(['<','TOKYO']);
	this.sign2 = new TextBox(this.screen.resize(72,20,-1,+1).move(-2,32), FONT);
	this.sign2.lineSpace = 2;
	this.sign2.putText(['SAN     >','FRANCISCO']);

	this.speed = 1;
	this.distance = 1000;
	this.nextobj = 0;
	
	this.balloon.setText('TAP A BUTTON TO FLY!!');
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
	    this.balloon.update();
	    this.clouds.move(new Vec2(-this.speed*0.1, 0));
	    this.oceans.move(-this.speed*0.2);
	    this.distance += this.speed;
	    this.nextobj--;
	    if (this.distance < 200) {
		;
	    } else if (this.distance < 1000) {
		if (this.nextobj <= 0) {
		    this.add((rnd(2) == 0)? new Birdy(this) : new Airplane(this));
		    this.nextobj = rnd(100)+10;
		}
	    } else if (this.distance < 1200) {
		;
	    } else if (this.distance < 2000) {
		;
	    }
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
		     this.distance*0.03, this.distRect2.height);
	this.sign1.render(ctx);
	this.sign2.render(ctx);
    }
}
