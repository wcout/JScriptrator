var Screen;
var ctx;
var fps = 60;
var mspf = 1000 / fps;
var updateInterval;
var ship;
var rocket;
var drop;
var shipX = 100;
var shipY = 100;
var ox = 0;
var keysDown = [];
var level = 1;
var dx = Math.floor( 200 / fps );
var objects = [];
var missile_sound;


class Fl_Rect
{
	constructor( width, height )
	{
		this.w = width;
		this.h = height;
	}
}

class ObjInfo
{
	constructor( type, x, y, image )
	{
		this.type = type;
		this.x = x;
		this.y = y;
		this.image = image; // NOTE: does this create a new copy for each object?
	}
}

function create_landscape()
{
	LS = eval( "Level_" + level ); // assign from variable 'Level_1'
	for ( var i = 0; i < LS.length; i++ )
	{
		var o = LS[i].obj;
		if ( o == 1 )
		{
			var obj = new ObjInfo( o, i - rocket.width / 2, Screen.clientHeight - LS[i].ground - rocket.height, rocket );
			objects.push( obj );
		}
		if ( o == 2 )
		{
			var obj = new ObjInfo( o, i - drop.width / 2, LS[i].sky, drop );
			objects.push( obj );
		}
	}
}

function onEvent( e )
{
	if ( e.type == "keydown" )
	{
		keysDown[e.keyCode] = true;
		e.preventDefault();
	}
	if ( e.type == "keyup" )
	{
		keysDown[e.keyCode] = false;
		e.preventDefault();
	}
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

function drawObjects()
{
	for ( var i = 0; i < objects.length; i++ )
	{
		var o = objects[i];
		if ( o.x + o.image.width >= ox && o.x < ox + Screen.clientWidth )
		{
			var x = o.x - ox;
			ctx.drawImage( o.image, x, o.y );
		}
	}
}

function drawLandscape()
{
	for ( var i = 0; i < Screen.clientWidth; i++ )
	{
		var g = LS[ox + i].ground;
		fl_color( 'green' );
		fl_yxline( i, Screen.clientHeight, Screen.clientHeight - g );

		var s = LS[ox + i].sky;
		fl_color( 'blue' );
		fl_yxline( i, 0, s );
	}
}

function update()
{
	window.requestAnimationFrame( update );
	fl_color( 'cyan' );
	fl_rectf( 0, 0, Screen.clientWidth, Screen.clientHeight );
	drawLandscape();
	drawObjects();

	var k = keysDown;
	if ( k[39] || k[80] )
	{
		shipX += dx;
	}
	if ( k[37] || k[79])
	{
		shipX -= dx;
	}
	if ( k[40] || k[65] )
	{
		shipY += dx;
	}
	if ( k[38] || k[81] )
	{
		shipY -= dx;
	}
	ctx.drawImage( ship, shipX, shipY );
	if ( k[32] )
	{
		fl_color( '#ffffff' );
		fl_line_style( 1, 3 );
		fl_xyline( shipX + ship.width + 20, shipY + ship.height/2+7, shipX + ship.width + 60 );
		fl_line_style( 0, 0 );
		missile_sound.play();
	}

	ox += dx;
	if ( ox + Screen.clientWidth >= LS.length )
	{
		ox = 0;
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
}

function load_images()
{
	ship = new Image();
	ship.src = 'ship.gif';
	rocket = new Image();
	rocket.src = 'rocket.gif';
	drop = new Image();
	drop.src = 'drop.gif';
	drop.onload = onResourcesLoaded; // needed to have the image dimensions available!
}

function load_sounds()
{
	missile_sound = new Audio( 'missile.wav' );
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
//	load_images();

	Screen = document.getElementById( 'viewport' );
	var rect = new Fl_Rect( Screen.clientWidth, Screen.clientHeight ); // test class
	ctx = Screen.getContext( '2d' );

	fl_color( 'black' );
	fl_rectf( 0, 0, rect.w, rect.h );

	ctx.font = "50px Arial";
	fl_color( 'white' );
	ctx.fillText( "Penetrator is loading...", 160, 300 );
	test();
	await sleep( 5000 );
/*
	create_landscape();
//	updateInterval = window.setInterval( "update()", mspf );
	window.requestAnimationFrame( update );
   document.addEventListener( "keydown", onEvent );
   document.addEventListener( "keyup", onEvent );
*/
}

main();
