const ctx = canvas.getContext('2d')

// Load tilesets

function TileSet(url, padx=0, pady=0, spreadx=100, spready=100, width=100, height=100)
{
	this.img = new Image()
	this.img.src = url
	this.padx = padx // size of the frame around the tileset
	this.pady = pady
	this.spreadx = spreadx // distance between two tiles in the tileset
	this.spready = spready
	this.width = width // dimensions of the tiles
	this.height = height
}

TileSet.prototype.draw_tile = function(x, y, tile_x, tile_y) // draws at position (x,y) in the canvas the tile at position (tile_x, tile_y) in the TileSet
{
	ctx.drawImage(this.img, this.spreadx*tile_x+this.padx, this.spready*tile_y+this.pady, this.width, this.height, x*tileSize, y*tileSize, tileSize, tileSize)
}

const roads_tileset = new TileSet('images/GroundRoad3.png', 0,0, 100,100, 100,100)
const coins_tileset = new TileSet('images/Coins2.png', 0,0, 100,100, 100,100)
const avatar_tileset = new TileSet('images/20x20AvatMoveALL_1.png', 0,0, 100,100, 100,100)
const enemy_tilesets = [ '1', '2', '3' ].map( (n) => new TileSet('images/Enemie' + n + '.png', 0,0, 100,100, 100,100) )
