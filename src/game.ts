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
	this.textbox.clear();
	this.textbox.putText([text], 'center', 'center');
	this.sprite.visible = true;
	this.hideTime = getTime()+duration;
    }

    hide() {
	this.hideTime = 0;
	this.sprite.visible = false;
    }

    update() {
	if (this.hideTime < getTime()) {
	    this.hide();
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

    tempend: number = 0;

    constructor(game: Game) {
	super(game.screen.center());
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
	if (state != DEAD) {
	    if (this.game.weather != 0) {
		state = this.game.weather+1;
	    }	    
	    if (this.tempend < getTime()) {
		this.tempend = 0;
	    } else {
		state = Math.min(state+1, 4);
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
	case 4:
	    if (0 < this.flying) {
		this.usermove.y = this.usermove.y*0.5 - 0.1;
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
	if (this.state == DEAD) return;
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
	case 4:
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
	if (this.state == DEAD) return;
	if (entity instanceof Birdy ||
	    entity instanceof Airplane ||
	    entity instanceof Lightning) {
	    if (this.tempend == 0) {
		this.tempend = getTime()+2.0;
		APP.playSound('hurt');
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
	this.movement.y = rnd(5)-2;
    }
    update() {
	super.update();
	this.imgsrc = SPRITES.get(4, phase(getTime(), 0.8));
	this.movement.y -= this.movement.y*0.5;
	if (rnd(30) == 0) {
	    this.movement.y += rnd(9)-4;
	}
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
	this.imgsrc = SPRITES.get(6, phase(getTime(), 0.4));
	if (rnd(30) == 0) {
	    this.movement.y = rnd(5)-2;
	}
    }
}


//  Game
// 
class Game extends GameScene {

    player: Player;
    
    clouds: StarImageSource;
    rains: StarImageSource;
    snows: StarImageSource;
    oceans: OceanImageSource;
    balloon: Balloon;
    
    distRect1: Rect;
    distRect2: Rect;
    sign1: TextBox;
    sign2: TextBox;

    stage: number;
    speed: number;
    deltaspeed: number;
    distance: number;
    nextobj: number;
    weather: number;
    
    init() {
	super.init();
	this.player = new Player(this);
	this.player.chain(new DelayTask(2, () => { this.gameover(); }),
			  this.player.died);
	this.add(this.player);
	
	this.clouds = new StarImageSource(
	    this.screen, 20, 8,
	    [SPRITES.get(0,0), SPRITES.get(0,1)]);
	this.rains = new StarImageSource(
	    this.screen, 100, 4, 
	    [new RectImageSource('rgb(255,255,255,0.8)', new Rect(0,0,1,8)),
	     new RectImageSource('rgb(255,255,255)', new Rect(0,0,1,4))]);
	this.snows = new StarImageSource(
	    this.screen, 100, 4, 
	    [new RectImageSource('rgb(255,255,255)', new Rect(-2,-2,4,4))]);
	this.oceans = new OceanImageSource(new Rect(0, 0, this.screen.width, 80), 100);
	this.balloon = new Balloon(this.screen.resize(160,32,0,0).move(0,-32));

	this.distRect1 = this.screen.resize(240,8,0,+1).move(0.5,10.5);
	this.distRect2 = this.screen.resize(237,5,0,+1).move(1,12);
	this.sign1 = new TextBox(this.screen.resize(40,20,+1,+1).move(2,32), FONT);
	this.sign1.lineSpace = 2;
	this.sign1.putText(['<','TOKYO']);
	this.sign2 = new TextBox(this.screen.resize(72,20,-1,+1).move(-2,32), FONT);
	this.sign2.lineSpace = 2;
	this.sign2.putText(['SAN     >','FRANCISCO']);

	this.stage = 0;
	this.speed = 1;
	this.deltaspeed = 0;
	this.distance = 0;
	this.nextobj = 0;
	this.weather = 0;
	
	this.balloon.setText('TAP A BUTTON!!');
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
	if (this.player.state != 0 && this.player.state != DEAD) {
	    this.balloon.update();
	    this.clouds.move(new Vec2(-this.speed*0.1, 0));
	    this.oceans.move(-this.speed*0.2);
	    this.distance += this.speed;
	    this.speed = clamp(1.0, this.speed+this.deltaspeed, 3.0);
	    this.nextobj--;
	    this.setEnvironment(this.distance);
	}
    }

    setEnvironment(distance: number) {
	if (distance < 200) {
	    this.weather = 0;
	    this.deltaspeed = 0;
	} else if (distance < 1000) {
	    if (this.stage != 1) {
		this.stage = 1;
		this.balloon.setText('OH, ENEMY.');
	    }
	    this.weather = 0;
	    this.deltaspeed = +0.005;
	    if (this.nextobj <= 0) {
		this.add((rnd(2) == 0)? new Birdy(this) : new Airplane(this));
		this.nextobj = rnd(100)+10;
	    }
	} else if (distance < 1200) {
	    if (this.stage != 2) {
		this.stage = 2;
		this.balloon.setText('WHEW.');
	    }
	    this.weather = 0;
	    this.deltaspeed = -0.02;
	} else if (distance < 2400) {
	    if (this.stage != 3) {
		this.stage = 3;
		this.balloon.setText('OMG RAIN!');
	    }
	    this.weather = 1;
	    this.rains.move(new Vec2(-this.speed, 12.0));
	    this.deltaspeed = +0.005;
	    if (this.nextobj <= 0) {
		this.add((rnd(2) == 0)? new Birdy(this) : new Lightning(this));
		this.nextobj = rnd(80)+20;
	    }
	} else if (distance < 2600) {
	    this.weather = 0;
	    this.deltaspeed = -0.01;
	} else if (distance < 3600) {
	    if (this.stage != 4) {
		this.stage = 4;
		this.balloon.setText('MOAR ENEMIES!');
	    }
	    this.weather = 1;
	    this.rains.move(new Vec2(-this.speed, 12.0));
	    this.deltaspeed = +0.001;
	    if (this.nextobj <= 0) {
		this.add((rnd(2) == 0)? new Lightning(this) : new Airplane(this));
		this.nextobj = rnd(80)+20;
	    }
	} else if (distance < 6000) {
	    if (this.stage != 5) {
		this.stage = 5;
		this.balloon.setText('SNOW!?');
	    }
	    this.weather = 2;
	    this.snows.move(new Vec2(-this.speed, 2.0));
	    this.deltaspeed = 0;
	    if (this.nextobj <= 0) {
		switch (rnd(3)) {
		case 0:
		    this.add(new Birdy(this));
		    break;
		case 1:
		    this.add(new Airplane(this));
		    break;
		case 2:
		    this.add(new Lightning(this));
		    break;
		}
		this.nextobj = rnd(50)+20;
	    }
	} else {
	    if (this.stage != 6) {
		this.stage = 6;
		this.balloon.setText('WTF? WHY!?');
	    }
	    this.weather = 3;
	    this.deltaspeed = 0;
	}
    }

    render(ctx: CanvasRenderingContext2D) {
	let seaLevel = this.player.pos.y*0.1+40;
	ctx.save();
	ctx.translate(0, -seaLevel);
	let skyColor = 'rgb(80,200,230)';
	let oceanColor = 'rgb(0,0,255)';
	switch (this.weather) {
	case 1:
	    skyColor = 'rgb(160,160,160)';
	    oceanColor = 'rgb(0,100,160)';
	    break;
	case 2:
	    skyColor = 'rgb(140,60,160)';
	    oceanColor = 'rgb(0,0,100)';
	    break;
	}
	ctx.fillStyle = skyColor;
	ctx.fillRect(this.screen.x, this.screen.y,
		     this.screen.width, this.screen.height);
	this.clouds.render(ctx);
	ctx.translate(0, this.screen.height);
	ctx.fillStyle = oceanColor;
	ctx.fillRect(this.screen.x, this.screen.y,
		     this.screen.width, this.screen.height-seaLevel);
	this.oceans.render(ctx);
	ctx.restore();
	switch (this.weather) {
	case 1:
	    this.rains.render(ctx);
	    break;
	case 2:
	    this.snows.render(ctx);
	    break;
	}
	super.render(ctx);
	// HUD
	if (this.balloon.sprite.visible) {
	    this.balloon.sprite.render(ctx);
	}
	ctx.strokeStyle = 'white';
	ctx.strokeRect(this.distRect1.x, this.distRect1.y,
		       this.distRect1.width, this.distRect1.height);
	ctx.fillStyle = 'rgb(0,128,0)';
	ctx.fillRect(this.distRect2.x, this.distRect2.y,
		     this.distance*0.04, this.distRect2.height);
	this.sign1.render(ctx);
	this.sign2.render(ctx);
    }

    gameover() {
	if (6000 <= this.distance) {
	    this.balloon.hide();
	    let textbox = new TextBox(this.screen.resize(228,80,0,0).move(0,-20), FONT);
	    textbox.padding = 6;
	    textbox.lineSpace = 8;
	    textbox.background = 'rgb(0,0,0,0.7)';
	    let dialog = new DialogBox(textbox);
	    this.add(dialog);
	    dialog.addDisplay('DID YOU REALLY THINK\n')
	    dialog.addDisplay('THIS WILL MAKE IT?\n')
	    dialog.addPause(1);
	    dialog.addDisplay('ANYWAY, THANKS FOR TRYING.\n')
	    dialog.addPause(1);
	    dialog.addDisplay('MADE FOR LUDUM DARE 39')
	} else {
	    this.init();
	}
    }
}
