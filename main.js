const O_ROCKET = 1;
const O_DROP = 2;
const O_BADY = 4;
const O_CLOUD = 8;
const O_RADAR = 16;
const O_PHASER = 32;
const O_SHIP = 128;
const O_COLOR_CHANGE = 64;
const O_EXPLOSION = 128;
const O_MISSILE = 256;
const O_BOMB = 512;
const O_DECO = 1024;

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
var bady;
var deco;

var spaceship; // ship object
var ox = 0;
var keysDown = [];
var level = 7;
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
var collision = false;
var repeated_right = -1;


var shipTPM = [];

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
		this.scale = 1;
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

	setScale( s )
	{
		this.scale = s;
	}

	getScale()
	{
		return this.scale;
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
			var rgba = ( LS_colors.missile ? LS_colors.missile : 'rgba(255,255,255,' ) + alpha + ')';
			ctx.fillStyle = rgba;
//			fl_line_style( 1, 3 );
//			fl_xyline( x, this.y, x + this.image_width, this.y );
			fl_rectf( x, this.y, this.image_width, this.image_height );
			fl_line_style( 0, 0 );
			return;
		}
		else
		{
			if ( this.frames == 1 && this.scale == 1 )
			{
				ctx.drawImage( this.image, x, this.y );
			}
			else
			{
				ctx.drawImage( this.image, this.image_width * this.curr_frame,
				               0, this.image_width, this.image.height,
				               x, this.y, this.image_width * this.scale, this.image.height * this.scale );
			}
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

function playSound( sound )
{
	var s = sound.cloneNode();
	s.play();
}

function bgsound( src )
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

function brightenImage( img, adjustment )
{
	var canvas = document.createElement( 'canvas' ); // temp. canvas
	var ctx = canvas.getContext( '2d' );
	canvas.width = img.width;
	canvas.height = img.height;
	ctx.drawImage( img, 0, 0 ); // write image to canvas
	var imageData = ctx.getImageData( 0, 0, img.width, img.height ); // get image data
	var data = imageData.data;

	// 'brighten' data
	for ( var i = 0; i < data.length; i+= 4 )
	{
		data[i]     += adjustment;
		data[i + 1] += adjustment;
		data[i + 2] += adjustment;
	}
	ctx.putImageData( imageData, 0, 0 );

	// read back image from canvas
	var image = new Image();
	image.src = canvas.toDataURL( "image/png" );
	image.width = canvas.width;
	image.height = canvas.height;
	return image;
}

function onDecoLoaded()
{
	deco = brightenImage( deco, 50 );
//	console.log( "deco %d x %d", deco.width, deco.height );
//	console.log( "deco.src = '%s'", deco.src );

	var y = max_sky  + Math.floor( Math.random() * ( Screen.clientHeight - max_sky - max_ground ) );
	var x = Math.floor( Math.random() * LS.length * 2 / 3 ) + Screen.clientWidth / 2;
	var obj = new ObjInfo( O_DECO, x, y, deco );
	obj.setScale( 2 );
	objects.push( obj );
}

function create_landscape()
{
	LS = eval( "Level_" + level ); // assign from variable 'Level_1'
	LS_colors = eval( "Level_" + level + "_colors" );
	LS_param = eval( "Level_" + level + "_param" );
	max_ground = -1;
	max_sky = -1;
	deco = null;

	// add scrollin/scrollout zones
	var s = LS[0].sky;
	var g = LS[0].ground;
	var obj = 0;
	var item = { sky: s, ground:g, obj:obj };
	for ( var i = 0; i < Screen.clientWidth / 2; i++ )
	{
		LS.splice( 0, 0, item ); // inserts at begin
	}
	s = LS[LS.length - 1].sky;
	g = LS[LS.length - 1].ground;
	item = { sky: s, ground:g, obj:obj };
	for ( var i = 0; i < Screen.clientWidth / 2; i++ )
	{
		LS.push( 0, 0, item );
	}

	// add deco object if defined in level param
	if ( LS_param.deco != undefined )
	{
		deco = new Image();
		deco.src = LS_param.deco;
		deco.onload = onDecoLoaded; // needed to have the image dimensions available!
	}

	// calc. max sky/ground values
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

		// create objects
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
		if ( o == O_BADY )
		{
			var frames = 4;
			var w = bady.width / frames;
			var obj = new ObjInfo( o, i - w / 2, LS[i].sky, bady, frames );
			objects.push( obj );
		}
	}
	spaceship = new ObjInfo( O_SHIP, 20, Screen.clientHeight / 2 - ship.height / 2, ship );
	objects.push( spaceship );

	ground_grad = ctx.createLinearGradient( 0, Screen.clientHeight - max_ground, 0, Screen.clientHeight );
	ground_grad.addColorStop( 0, 'white' );
	ground_grad.addColorStop( 1, LS_colors.ground );

	sky_grad = ctx.createLinearGradient( 0, 0, 0, max_sky );
	sky_grad.addColorStop( 0, LS_colors.sky );
	sky_grad.addColorStop( 1, 'white' );

	bg_grad = ctx.createLinearGradient( 0, 0, 0, Screen.clientHeight );
	bg_grad.addColorStop( 0, 'white' );
	bg_grad.addColorStop( 1, LS_colors.background );
}

function dropBomb()
{
	var obj = new ObjInfo( O_BOMB, spaceship.x + spaceship.image_width / 2, spaceship.y + spaceship.image_height + 20, bomb );
	objects.push( obj );
	playSound( bomb_sound );
}

function fireMissile()
{
	var obj = new ObjInfo( O_MISSILE, spaceship.x + spaceship.image_width + 20, spaceship.y + spaceship.image_height/2 + 7, null );
	objects.push( obj );
	playSound( missile_sound );
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
		if ( paused && !collision )
		{
			onKeyDown( 57 );
		}
	}
}

function onKeyUp( k )
{
	if ( paused || collision )
	{
		return;
	}
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

function drawObjects( drawDeco = false )
{
	for ( var i = 0; i < objects.length; i++ )
	{
		var o = objects[i];
		if ( drawDeco && o.type != O_DECO )
		{
			continue;
		}
		if ( !drawDeco && o.type == O_DECO )
		{
			continue;
		}
		if ( o.x + o.image_width * o.getScale() >= ox && o.x < ox + Screen.clientWidth )
		{
			o.draw();
			if ( o.type == O_DECO )
			{
				o.x++;
			}
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
		if ( cx >= LS.length || o.x + o.image_width < ox || o.x >= ox + Screen.clientWidth )
		{
			continue;
		}
		if ( o.type == O_SHIP )
		{
			for ( var x = 0; x < o.image_width; x++ )
			{
				if ( ( o.y + o.image_height >= Screen.clientHeight - LS[o.x + x].ground ) ||
				  ( LS[o.x + x].sky >= 0 && o.y < LS[o.x + x].sky ) )
				{
//					objects.splice( i,  1 );
//					i--;
					playSound( x_ship_sound );
					collision = true;
					resetLevel();
					return;
				}
			}
		}
		else if ( o.type == O_ROCKET )
		{
			o.y--;
			var sky = LS[cx].sky;
			var gone_y = sky >= 0 ? sky : -o.image_height;
			if ( o.y <= gone_y )
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
		else if ( o.type == O_BADY )
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
	var outline_width = (LS_param.outline_width != undefined) ? LS_param.outline_width : 2;
	ctx.lineWidth = outline_width;
	var delta = outline_width ? Math.floor( outline_width / 2 ) + 1 : 0;
	ctx.moveTo( -delta,  Screen.clientHeight + delta );
	for ( var i = -delta; i < Screen.clientWidth + delta; i++ )
	{
		var x = ox + i;
		var g = -1;
		if ( x >= 0 && x < LS.length )
		{
			g = LS[x].ground;
		}
		ctx.lineTo( i, Screen.clientHeight - g );
	}
	ctx.lineTo( Screen.clientWidth + delta, Screen.clientHeight + delta );
	ctx.closePath();
	ctx.fillStyle = ground_grad;
	ctx.fill();
	ctx.strokeStyle = LS_colors.outline ? LS_colors.outline : 'black';
	if ( outline_width )
	{
		ctx.stroke();
	}

	var outline_width = (LS_param.outline_width != undefined) ? LS_param.outline_width : 2;
	ctx.lineWidth = outline_width;
	var delta = outline_width ? Math.floor( outline_width / 2 ) + 1 : 0;
	ctx.beginPath();
	ctx.moveTo( -delta, -delta );
	for ( var i = -delta; i < Screen.clientWidth + delta; i++ )
	{
		var x = ox + i;
		var s = -1;
		if ( x >= 0 && x < LS.length )
		{
			s = LS[x].sky;
		}
		if ( s < 0 && x < LS.length )
		{
			ctx.moveTo( i, s );
		}
		else
		{
			ctx.lineTo( i, s );
		}
	}
	ctx.lineTo( Screen.clientWidth + delta, -delta );
	ctx.closePath();
	ctx.fillStyle = sky_grad;
	ctx.fill();
	ctx.strokeStyle = LS_colors.outline ? LS_colors.outline : 'black';
	if ( outline_width )
	{
		ctx.stroke();
	}
}

async function resetLevel()
{
	if ( paused )
	{
		return;
	}
//	collision = true;
	onKeyDown( 57 );
	await sleep( 3000 );
	collision = false;
	onKeyDown( 57 );

	ox = 0;
	objects = [];
	level++;
	if ( level > 10 )
	{
		level = 1;
	}
	create_landscape();
}

function checkHits()
{
	for ( var i = 0; i < objects.length; i++ )
	{
		var o = objects[i];
		if ( o.type == O_DECO )
		{
			continue;
		}
		var rect = new Fl_Rect( o.x, o.y, o.image_width, o.image_height );
		for ( var j = 0; j < objects.length; j++ )
		{
			if ( i == j )
			{
				continue;
			}
			var o1 = objects[j];
			var rect1 = new Fl_Rect( o1.x, o1.y, o1.image_width, o1.image_height );
			if ( o1.type == O_DECO )
			{
				continue;
			}
			if ( rect.intersects( rect1 ) )
			{
				if ( o.type == O_SHIP )
				{
//					objects.splice( j,  1 );
//					j--;
					playSound( x_ship_sound );
					collision = true;
					resetLevel();
					return;
				}
				else if ( o.type == O_MISSILE && ( o1.type == O_ROCKET || o1.type == O_DROP ||
				                                   o1.type == O_RADAR || o1.type == O_BADY ) )
				{
					objects.splice( j,  1 );
					j--;
					if ( o1.type == O_DROP )
					{
						playSound( x_drop_sound );
					}
					else
					{
						playSound( x_missile_sound );
					}
				}
				else if ( o.type == O_BOMB && ( o1.type == O_RADAR ) )
				{
					if ( !rect.inside( rect1 ) ) // bomb must be inside radar (look better)
					{
						continue;
					}
					objects.splice( i,  1 ); // bomb gone too!
					i--;
					objects.splice( j,  1 );
					j--;
					playSound( x_bomb_sound );
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

	drawObjects( true ); // deco only

	drawLandscape();
	drawObjects();

	if (!collision)
	{
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
			if ( spaceship.y + spaceship.image_height < Screen.clientHeight )
			{
				spaceship.y += dx;
			}
		}
		if ( k[38] || k[81] )
		{
			if ( spaceship.y >= 0 )
			{
				spaceship.y -= dx;
			}
		}
		ox += dx;
		spaceship.x += dx;
	}
	if ( ox + Screen.clientWidth >= LS.length )
	{
		ox = LS.length - Screen.clientWidth;
		resetLevel();
	}
	if ( paused )
	{
		fl_font( 'Arial bold', 50 );
		fl_color( 'white' );
		fl_draw( collision ? "*** OUCH!! ***" : "*** PAUSED ***", 240, 300 );
	}
}

function getTransparencyMask( img )
{
	var canvas = document.createElement( 'canvas' ); // temp. canvas
	var ctx = canvas.getContext( '2d' );
	canvas.width = img.width;
	canvas.height = img.height;
	ctx.drawImage( img, 0, 0 ); // write image to canvas
	var imageData = ctx.getImageData( 0, 0, img.width, img.height ); // get image data
	var data = imageData.data;

	var mask = [];
	for ( var i = 0; i < data.length; i += 4 )
	{
		mask[i / 4] = data[ i + 3 ];
	}
	return mask;
}

function onResourcesLoaded()
{
//	console.log( "rocket %d x %d,  %d x %d", rocket.naturalWidth, rocket.naturalHeight, rocket.width, rocket.height );
//	console.log( "drop %d x %d,  %d x %d", drop.naturalWidth, drop.naturalHeight, drop.width, drop.height );

	create_landscape();
//	updateInterval = window.setInterval( "update()", mspf );

	shipTP = getTransparencyMask( ship );

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
	bady = new Image();
	bady.src = 'bady.gif';
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
	bg_music = new bgsound( 'bg.wav' );
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
