var LS = [];
var Screen;
var ctx;
var fps = 200;
var mspf = 1000 / fps;
var updateInterval;
var ship;
var shipX = 100;
var shipY = 100;
var ox = 0;


// test class
class Rectangle
{
	constructor( width, height )
	{
		this.width = width;
		this.height = height;
	}
}

function create_landscape()
{
	for ( var i = 0; i < 8000; i++ )
	{
		let g = Math.floor( Math.random() * 60 ) + 10;
		let s = Math.floor( Math.random() * 60 ) + 10;
		LS.push( { ground: g, sky: s } );
	}
}

var keysDown = {};

function onEvent( e )
{
	if ( e.type == "keydown" )
	{
		keysDown[e.keyCode] = true;
		console.log( "keydown %d", e.keyCode );
		e.preventDefault();
	}
	if ( e.type == "keyup" )
	{
		keysDown[e.keyCode] = false;
		console.log( "keyup %d", e.keyCode );
		e.preventDefault();
	}
}

/*
keysDown = () => {
    "use strict";

    var keysDown = {};

    document.addEventListener( "keydown", function(e) {
        keysDown[e.keyCode] = true;
		  console.log( "keydown %d %d", e.keyCode );
        e.preventDefault();
    }, false);

    document.addEventListener( "keyup", function(e) {
        delete keysDown[e.keyCode];
		  console.log( "keyup %d", e.keyCode );
        e.preventDefault();
    }, false);

    return keysDown; // WORKS!!
};
*/

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

function drawLandscape()
{
	for ( var i = 0; i < 800; i++ )
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
//	console.log( "TICK %d", shipX );
/*
	ctx.fillStyle = "rgb(" + Math.random() * 255 + ","
	                       + Math.random() * 255 + ","
	                       + Math.random() * 255 + ")";
*/
	fl_color( 'cyan' );
	fl_rectf( 0, 0, Screen.clientWidth, Screen.clientHeight );
	drawLandscape();

	var k = keysDown;
	if ( k[39] || k[80] )
	{
		shipX++;
	}
	if ( k[37] || k[79])
	{
		shipX--;
	}
	if ( k[40] || k[65] )
	{
		shipY++;
	}
	if ( k[38] || k[81] )
	{
		shipY--;
	}
	ctx.drawImage( ship, shipX, shipY );
	if ( k[32] )
	{
		fl_color( '#ffffff' );
		fl_line_style( 1, 3 );
		fl_xyline( shipX + ship.width + 20, shipY + ship.height/2+7, shipX + ship.width + 60 );
		fl_line_style( 0, 0 );
	}

	ox++;
	if ( ox + Screen.clientWidth >= LS.length )
	{
		ox = 0;
	}
}

function main()
{
	ship = new Image();
	ship.src = 'ship.gif';
	Screen = document.getElementById( 'viewport' );
	// test class
	var rect = new Rectangle( Screen.clientWidth, Screen.clientHeight );
	ctx = Screen.getContext( '2d' );
	fl_color( '#000000' );
//	ctx.fillRect( 0, 0, ctx.canvas.clientWidth, ctx.canvas.clientHeight );
//	ctx.fillRect( 0, 0, Screen.clientWidth, Screen.clientHeight );
//	ctx.fillRect( 0, 0, rect.width, rect.height );
	fl_rectf( 0, 0, rect.width, rect.height );
	create_landscape();
	console.log( "HELLO JS!" );
	for ( var i = 0; i < LS.length; i++ )
	{
		console.log( "%d %d", LS[i].ground, LS[i].sky );
	}

	updateInterval = window.setInterval( "update()", mspf );
   document.addEventListener( "keydown", onEvent );
   document.addEventListener( "keyup", onEvent );
}

main();
