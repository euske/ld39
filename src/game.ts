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
	if (this.game.started) {
	    if (0 < this.flying) {
		this.usermove.y -= 8/this.flying;
		this.flying -= 1;
	    } else {
		this.usermove.y += 0.5;
	    }
	    this.usermove.y = clamp(-4, this.usermove.y, +4);
	    this.moveIfPossible(this.usermove);
	}
    }
    
    fly(flying: boolean) {
	if (flying) {
	    if (!this.game.started) {
		this.game.started = true;
	    } else if (this.flying == 0) {
		this.flying = 4;
	    }
	} else {
	    this.flying = 0;
	}
    }
}


//  Game
// 
class Game extends GameScene {

    clouds: StarImageSource;
    oceans: StarImageSource;
    player: Player;
    sign1: TextBox;
    sign2: TextBox;
    
    started: boolean;
    scoreBox: TextBox;
    score: number;
    
    init() {
	super.init();
	this.scoreBox = new TextBox(this.screen.inflate(-8,-8), FONT);
	this.player = new Player(this, this.screen.center());
	this.add(this.player);
	let cloud = new RectImageSource('rgb(255,255,255,0.8)', new Rect(-10,-5,20,10));
	this.clouds = new StarImageSource(this.screen, 20, 10, [cloud]);
	let ocean = new RectImageSource('rgb(200,255,255)', new Rect(-4,-1,8,2));
	this.oceans = new StarImageSource(this.screen, 100, 2, [ocean]);

	this.started = false;
	this.score = 0;
	this.updateScore();

	this.sign1 = new TextBox(this.screen.resize(40,20,+1,+1).move(2,32), FONT);
	this.sign1.lineSpace = 2;
	this.sign1.putText(['<-','TOKYO']);
	this.sign2 = new TextBox(this.screen.resize(72,20,-1,+1).move(-2,32), FONT);
	this.sign2.lineSpace = 2;
	this.sign2.putText(['SAN ->','FRANCISCO']);
    }

    update() {
	super.update();
	if (this.started) {
	    this.clouds.move(new Vec2(-1, 0));
	    this.oceans.move(new Vec2(-4, 0));
	}
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

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	const sealevel = 40;
	ctx.save();
	ctx.translate(0, -sealevel);
	ctx.fillStyle = 'rgb(80,200,230)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height);
	this.clouds.render(ctx);
	ctx.translate(0, this.screen.height);
	ctx.fillStyle = 'rgb(0,0,255)';
	ctx.fillRect(bx, by, this.screen.width, this.screen.height-sealevel);
	this.oceans.render(ctx);
	ctx.restore();
	super.render(ctx, bx, by);
	this.scoreBox.render(ctx);
	this.sign1.render(ctx);
	this.sign2.render(ctx);
    }

    updateScore() {
	this.scoreBox.clear();
	this.scoreBox.putText(['SCORE: '+this.score]);
    }
}
