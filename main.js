const O_ROCKET = 1;
const O_DROP = 2;
const O_RADAR = 16;
const O_SHIP = 128;
const O_MISSILE = 256;
const O_BOMB = 512;

var Screen;
var ctx;
var fps = 60;
var mspf = 1000 / fps;
var updateInterval;

// images
var ship;
var rocket;
var radar;
var drop;
var bomb;

var spaceship; // ship object
var ox = 0;
var keysDown = [];
var level = 1;
var dx = Math.floor( 200 / fps );
var objects = [];

// sounds
var drop_sound;
var missile_sound;
var bomb_sound;
var x_missile_sound;
var x_bomb_sound;
var x_drop_sound;
var x_ship_sound;
var bg_music;

var max_ground = 0;
var max_sky = 0;
var ground_grad;

// gradients
var sky_grad;
var bg_grad;

var paused = false;
var repeated_right = -1;


class Fl_Rect
{
	constructor( x, y, w, h )
	{
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
	intersects( r )
	{
		return ! ( this.x + this.w - 1 < r.x  ||
		           this.y + this.h - 1 < r.y  ||
	              this.x > r.x + r.w - 1     ||
		           this.y > r.y + r.h - 1 );
	}
	contains( r )
	{
		return this.within( r.x, r.y, this ) &&
		       this.within( r.x + r.w - 1, r.y + r.h - 1, this );
	}
	inside( r )
	{
		return this.within( this.x, this.y, r ) &&
		       this.within( this.x + this.w - 1, this.y + this.h - 1, r );
	}
	within( x, y, r )
	{
		return x >= r.x && x < r.x + r.w &&
		       y >= r.y && y < r.y + r.h;
	}

}

function fl_font( family, size )
{
	var s = family.split( ' ' );
	var f = '';
	if ( s.length >= 2 )
	{
		f = s[1] + ' ';
	}
	f += size + 'px ' +  s[0];
	ctx.font = f;
}

function fl_draw( text, x, y )
{
	ctx.fillText( text, x, y );
}

function fl_color( c )
{
	ctx.strokeStyle = c;
	ctx.fillStyle = c;
}

function fl_xyline( x0, y, x1 )
{
	ctx.beginPath();
	ctx.moveTo( x0, y );
	ctx.lineTo( x1, y );
	ctx.stroke();
}

function fl_yxline( x, y0, y1 )
{
	ctx.beginPath();
	ctx.moveTo( x, y0 );
	ctx.lineTo( x, y1 );
	ctx.stroke();
}

function fl_line_style( type, width )
{
	if ( width )
	{
		ctx.lineWidth = width;
	}
	else
	{
		ctx.lineWidth = 1;
	}
}

function fl_rectf( x, y, w, h )
{
	ctx.fillRect( x, y, w, h );
}


class ObjInfo
{
	constructor( type, x, y, image, frames = 1 )
	{
		this.type = type;
		this.x = x;	// absolute x-coord in landscape!
		this.y = y;
		this.image = image; // NOTE: does this create a new copy for each object?
		this.frames = frames;
		this.curr_frame = 0;
		this.cnt = 0;
		this.x0 = this.x;
		this.y0 = this.y;
		if ( this.image )
		{
			this.image_width = this.image.width / this.frames;
			this.image_height = this.image.height;
		}
		if ( this.type == O_MISSILE )
		{
			this.image_width = 40;
			this.image_height = 3;
		}
	}

	moved_stretch()
	{
		return Math.abs( this.x - this.x0 ) + Math.abs( this.y - this.y0 );
	}

	draw()
	{
		var x = this.x - ox; // x-coord. on screen

		if ( this.type == O_MISSILE )
		{
//			fl_color( '#ffffff' );
			var alpha = 1. - this.moved_stretch() / ( Screen.clientWidth / 2 + 40 ); // FIXME: parameterize
			var rgba = 'rgba(255,255,255,' + alpha+ ")";
			ctx.fillStyle = rgba;
//			fl_line_style( 1, 3 );
//			fl_xyline( x, this.y, x + this.image_width, this.y );
			fl_rectf( x, this.y, this.image_width, this.image_height );
			fl_line_style( 0, 0 );
			return;
		}

		if ( this.frames == 1 )
		{
			ctx.drawImage( this.image, x, this.y );
		}
		else
		{
			ctx.drawImage( this.image, this.image_width * this.curr_frame,
			               0, this.image_width, this.image.height,
			               x, this.y, this.image_width, this.image.height );
		}
	}

	update()
	{
		this.cnt++;
		if ( ( this.cnt % 10 ) == 0 )
		{
			this.curr_frame++;
			if ( this.curr_frame >= this.frames )
			{
				this.curr_frame = 0;
			}
		}
	}
}

function sound( src )
{
	this.sound = document.createElement( "audio" );
	this.sound.src = src;
	this.sound.setAttribute( "preload", "auto" );
	this.sound.setAttribute( "controls", "none" );
	this.sound.setAttribute( "loop", "loop" );
	this.sound.style.display = "none";
	document.body.appendChild( this.sound );
	this.play = function()
	{
		this.sound.play();
	}
	this.stop = function()
	{
		this.sound.pause();
	}
}

function create_landscape()
{
	LS = eval( "Level_" + level ); // assign from variable 'Level_1'
	max_ground = -1;
	max_sky = -1;
	for ( var i = 0; i < LS.length; i++ )
	{
		if ( LS[i].ground > max_ground )
		{
			max_ground = LS[i].ground;
		}
		if ( LS[i].sky > max_sky )
		{
			max_sky = LS[i].sky;
		}
		var o = LS[i].obj;
		if ( o == O_ROCKET )
		{
			var obj = new ObjInfo( o, i - rocket.width / 2, Screen.clientHeight - LS[i].ground - rocket.height, rocket );
			objects.push( obj );
		}
		if ( o == O_DROP )
		{
			var obj = new ObjInfo( o, i - drop.width / 2, LS[i].sky, drop );
			objects.push( obj );
		}
		if ( o == O_RADAR )
		{
			var frames = 14;
			var w = radar.width / frames;
			var obj = new ObjInfo( o, i - w / 2, Screen.clientHeight - LS[i].ground - radar.height, radar, frames );
			objects.push( obj );
		}
	}
	spaceship = new ObjInfo( O_SHIP, 100, 100, ship );
	objects.push( spaceship );

	ground_grad = ctx.createLinearGradient( 0, Screen.clientHeight - max_ground, 0, Screen.clientHeight );
	ground_grad.addColorStop( 0, 'white' );
	ground_grad.addColorStop( 1, 'green' );

	sky_grad = ctx.createLinearGradient( 0, 0, 0, max_sky );
	sky_grad.addColorStop( 0, 'blue' );
	sky_grad.addColorStop( 1, 'white' );

	bg_grad = ctx.createLinearGradient( 0, 0, 0, Screen.clientHeight );
	bg_grad.addColorStop( 0, 'red' );
	bg_grad.addColorStop( 1, 'yellow' );

}

function dropBomb()
{
	var obj = new ObjInfo( O_BOMB, spaceship.x + spaceship.image_width / 2, spaceship.y + spaceship.image_height + 20, bomb );
	objects.push( obj );
	bomb_sound.play();
}

function fireMissile()
{
	var obj = new ObjInfo( O_MISSILE, spaceship.x + spaceship.image_width + 20, spaceship.y + spaceship.image_height/2 + 7, null );
	objects.push( obj );
	missile_sound.play();
}

function onKeyDown( k )
{
	if ( k == 57 ) // '9'
	{
		paused = !paused;
		if ( !paused )
		{
			bg_music.play();
			window.requestAnimationFrame( update );
		}
		else
		{
			bg_music.stop();
		}
	}
	if ( k == 39 || k == 80 )
	{
		repeated_right = -5;
	}
}

function onKeyUp( k )
{
	if ( k == 32 )
	{
		dropBomb();
	}
	if ( k == 39 || k == 80 )
	{
		if ( repeated_right <= 0 )
		{
			fireMissile();
		}
	}
}

function onEvent( e )
{
	if ( e.type == "keydown" )
	{
		if ( !keysDown[e.keyCode] ) // this seems necessary, because a keydown event is delivered before each keyup!!
		{
			onKeyDown( e.keyCode );
		}
		keysDown[e.keyCode] = true;
		e.preventDefault();
	}
	if ( e.type == "keyup" )
	{
		keysDown[e.keyCode] = false;
		onKeyUp( e.keyCode );
		e.preventDefault();
	}
}

function drawObjects()
{
	for ( var i = 0; i < objects.length; i++ )
	{
		var o = objects[i];
		var cx = o.x + o.image_width / 2;
		if ( o.x + o.image_width >= ox && o.x < ox + Screen.clientWidth )
		{
			o.draw();
		}
		else
		{
			if ( o.type == O_MISSILE )
			{
				objects.splice( i,  1 );
				i--;
			}
		}
	}
}

function updateObjects()
{
	for ( var i = 0; i < objects.length; i++ )
	{
		var o = objects[i];
		var cx = o.x + o.image_width / 2;
		if ( !( o.x + o.image_width >= ox && o.x < ox + Screen.clientWidth ) )
		{
			continue;
		}
		if ( o.type == O_SHIP )
		{
			if ( ( o.y + o.image_height >= Screen.clientHeight - LS[cx].ground ) ||
				  ( o.y < LS[cx].sky ) )
			{
				objects.splice( i,  1 );
				i--;
				x_ship_sound.play();
				resetLevel();
				return;
			}
		}
		if ( o.type == O_ROCKET )
		{
			o.y--;
			if ( o.y < -o.image.height )
			{
				objects.splice( i,  1 );
				i--;
			}
		}
		else if ( o.type == O_DROP )
		{
			o.y++;
			if ( o.y > Screen.clientHeight - LS[cx].ground - o.image.height / 2 )
			{
				objects.splice( i,  1 );
				i--;
			}
		}
		else if ( o.type == O_RADAR )
		{
			o.update();
		}
		else if ( o.type == O_MISSILE )
		{
			o.x += 4 * dx;
			if ( ( Screen.clientHeight - LS[cx].ground < o.y ) ||
			     ( o.y < LS[cx].sky ) ||
			       o.moved_stretch() > Screen.clientWidth / 2 )
			{
				objects.splice( i,  1 );
				i--;
			}
		}
		else if ( o.type == O_BOMB )
		{
			o.x += 2 * dx;
			o.x--;
			o.y += dx;
			if ( o.y > Screen.clientHeight - LS[cx].ground - o.image.height / 2 )
			{
				objects.splice( i,  1 );
				i--;
			}
		}
	}
}

function drawLandscape()
{
	ctx.beginPath();
	ctx.lineWidth = 2;
	ctx.moveTo( 0,  Screen.clientHeight );
	for ( var i = 0; i < Screen.clientWidth; i++ )
	{
		var g = LS[ox + i].ground;
		ctx.lineTo( i, Screen.clientHeight - g );
	}
	ctx.lineTo( Screen.clientWidth, Screen.clientHeight );
	ctx.closePath();
	ctx.fillStyle = ground_grad;
	ctx.fill();
	ctx.strokeStyle = 'black';
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo( 0,  0 );
	ctx.lineWidth = 2;
	for ( var i = 0; i < Screen.clientWidth; i++ )
	{
		var s = LS[ox + i].sky;
		ctx.lineTo( i, s );
	}
	ctx.lineTo( Screen.clientWidth, 0 );
	ctx.closePath();
	ctx.fillStyle = sky_grad;
	ctx.fill();
	ctx.strokeStyle = 'black';
	ctx.stroke();
}

function resetLevel()
{
	ox = 0;
	objects = [];
	create_landscape();
}

function checkHits()
{
	for ( var i = 0; i < objects.length; i++ )
	{
		var o = objects[i];
		var rect = new Fl_Rect( o.x, o.y, o.image_width, o.image_height );
		for ( var j = 0; j < objects.length; j++ )
		{
			if ( i == j )
			{
				continue;
			}
			var o1 = objects[j];
			var rect1 = new Fl_Rect( o1.x, o1.y, o1.image_width, o1.image_height );
			if ( rect.intersects( rect1 ) )
			{
				if ( o.type == O_SHIP )
				{
					objects.splice( j,  1 );
					j--;
					x_ship_sound.play();
					resetLevel();
					return;
				}
				if ( o.type == O_MISSILE && ( o1.type == O_ROCKET || o1.type == O_DROP || o1.type == O_RADAR ) )
				{
					objects.splice( j,  1 );
					j--;
					if ( o1.type == O_DROP )
					{
						x_drop_sound.play();
					}
					else
					{
						x_missile_sound.play();
					}
				}
				else if ( o.type == O_BOMB && ( o1.type == O_RADAR ) )
				{
					if ( !rect.inside( rect1 ) ) // bomb must be inside radar (look better)
					{
						continue;
					}
					objects.splice( j,  1 );
					j--;
					x_bomb_sound.play();
				}
			}
		}
	}
}

function update()
{
	if ( !paused )
	{
		window.requestAnimationFrame( update );
		updateObjects();
		checkHits();
	}
	fl_color( 'cyan' );
	ctx.fillStyle = bg_grad;
	fl_rectf( 0, 0, Screen.clientWidth, Screen.clientHeight );
	drawLandscape();
	drawObjects();

	var k = keysDown;
	if ( k[39] || k[80] )
	{
		repeated_right++;
		if ( repeated_right > 0 )
		{
			if ( spaceship.x + spaceship.image_width / 2 < ox + Screen.clientWidth / 2 )
			{
				spaceship.x += dx;
			}
		}
	}
	if ( k[37] || k[79])
	{
		if ( spaceship.x >= ox - spaceship.image_width / 2 )
		{
			spaceship.x -= dx;
		}
	}
	if ( k[40] || k[65] )
	{
		spaceship.y += dx;
	}
	if ( k[38] || k[81] )
	{
		spaceship.y -= dx;
	}
	ox += dx;
	spaceship.x += dx;
	if ( ox + Screen.clientWidth >= LS.length )
	{
		resetLevel();
	}
	if ( paused )
	{
		fl_font( 'Arial bold', 50 );
		fl_color( 'white' );
		fl_draw( "*** PAUSED ***", 240, 300 );
	}
}

function onResourcesLoaded()
{
//	console.log( "rocket %d x %d,  %d x %d", rocket.naturalWidth, rocket.naturalHeight, rocket.width, rocket.height );
//	console.log( "drop %d x %d,  %d x %d", drop.naturalWidth, drop.naturalHeight, drop.width, drop.height );

	create_landscape();
//	updateInterval = window.setInterval( "update()", mspf );
	window.requestAnimationFrame( update );
   document.addEventListener( "keydown", onEvent );
   document.addEventListener( "keyup", onEvent );
	bg_music.play();
}

function load_images()
{
	ship = new Image();
	ship.src = 'ship.gif';
	rocket = new Image();
	rocket.src = 'rocket.gif';
	radar = new Image();
	radar.src = 'radar.gif';
	bomb = new Image();
	bomb.src = 'bomb.gif';
	drop = new Image();
	drop.src = 'drop.gif';
	drop.onload = onResourcesLoaded; // needed to have the image dimensions available!
}

function load_sounds()
{
	drop_sound = new Audio( 'drop.wav' );
	bomb_sound = new Audio( 'bomb.wav' );
	missile_sound = new Audio( 'missile.wav' );
	x_bomb_sound = new Audio( 'x_bomb.wav' );
	x_missile_sound = new Audio( 'x_missile.wav' );
	x_drop_sound = new Audio( 'x_drop.wav' );
	x_ship_sound = new Audio( 'x_ship.wav' );
	bg_music = new sound( 'bg.wav' );
}

function sleep( ms )
{
	return new Promise( resolve => setTimeout( resolve, ms ) );
}

function test()
{
	ctx.beginPath();
	ctx.lineWidth = 4;
	ctx.moveTo( 100, 50 );
	ctx.lineTo( 50, 150 );
	ctx.lineTo( 200, 150 );
	ctx.closePath();
	var mygrad = ctx.createLinearGradient( 0, 0, 0, 200 );
	mygrad.addColorStop( 0, 'green' );
	mygrad.addColorStop( 1, 'white' );
	ctx.fillStyle = mygrad;
	ctx.fill();
//	ctx.stroke(); // no outline drawing!
}

async function main()
{
	console.log( "dx = %d", dx );
	load_sounds();
	load_images();

	Screen = document.getElementById( 'viewport' );
	var rect = new Fl_Rect( 0, 0, Screen.clientWidth, Screen.clientHeight ); // test class
	ctx = Screen.getContext( '2d' );

	fl_color( 'black' );
	fl_rectf( 0, 0, rect.w, rect.h );

	fl_font( 'Arial', 50 );
	fl_color( 'white' );
	fl_draw( "Penetrator is loading...", 160, 300 );
//	test();
//	await sleep( 5000 );
}

main();
