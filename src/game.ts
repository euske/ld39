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
    FONT = new ShadowFont(IMAGES['font'], 'white');
    SPRITES = new ImageSpriteSheet(
	IMAGES['sprites'], new Vec2(32,32), new Vec2(16,16));
});


//  Player
//
class Player extends Entity {

    scene: Game;
    usermove: Vec2;

    constructor(scene: Game, pos: Vec2) {
	super(pos);
	this.scene = scene;
	this.imgsrc = SPRITES.get(1);
	this.collider = this.imgsrc.getBounds();
	this.usermove = new Vec2();
    }

    update() {
	super.update();
	if (this.scene.started) {
	    this.moveIfPossible(this.usermove);
	    this.usermove.y += 0.5;
	    this.usermove.y = upperbound(4, this.usermove.y);
	}
    }
    
    fly() {
	this.usermove.y -= 4;
    }
}


//  Game
// 
class Game extends GameScene {

    clouds: StarImageSource;
    player: Player;
    started: boolean;
    sign1: TextBox;
    sign2: TextBox;
    
    scoreBox: TextBox;
    score: number;
    
    init() {
	super.init();
	this.scoreBox = new TextBox(this.screen.inflate(-8,-8), FONT);
	this.player = new Player(this, this.screen.center());
	this.add(this.player);
	let cloud = new RectImageSource('rgb(255,255,255,0.8)', new Rect(-10,-5,20,10));
	this.clouds = new StarImageSource(this.screen, 20, 10, [cloud]);
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
	this.clouds.move(new Vec2(-1, 0));
    }

    onButtonPressed(keysym: KeySym) {
	if (this.started) {
	    this.player.fly();
	} else {
	    this.started = true;
	}
    }
    onMouseDown(p: Vec2, button: number) {
	if (this.started) {
	    this.player.fly();
	} else {
	    this.started = true;
	}
    }

    render(ctx: CanvasRenderingContext2D, bx: number, by: number) {
	const sky = 180;
	ctx.fillStyle = 'rgb(80,200,230)';
	ctx.fillRect(bx, by, this.screen.width, sky);
	ctx.fillStyle = 'rgb(0,0,255)';
	ctx.fillRect(bx, by+sky, this.screen.width, this.screen.height-sky);
	this.clouds.render(ctx);
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
