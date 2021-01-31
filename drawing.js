// Load images
function load_image(url)
{
	img = new Image()
	img.src = url
	return img
}
let tiles_image = [
	[ load_image('https://opengameart.org/sites/default/files/spr_all5_4A2.png'), 1,1, 21,21, 20,20],
	// [ load_image('images/20x20AvatMoveR.png'), 0,0, 100,100, 100,100],
	[ load_image('images/20x20AvatMoveALL_1.png'), 0,0, 100,100, 100,100],
	[ load_image('images/GroundRoad_1.png'), 0,0, 100,100, 100,100],
	[ load_image('images/Coins_1.png'), 0,0, 100,100, 100,100],
	[ load_image('images/Enemie1.png'), 0,0, 100,100, 100,100],
	[ load_image('images/Enemie2.png'), 0,0, 100,100, 100,100],
	[ load_image('images/Enemie3.png'), 0,0, 100,100, 100,100],
];

// To draw level
const ctx = canvas.getContext('2d')
const canvas_aspect_ratio = canvas.clientWidth / canvas.clientHeight
const canvas_width_in_tiles = level_width + sprites.length
const level_aspect_ratio = canvas_width_in_tiles / level_height;
const idealTileSize = Math.floor( (canvas_aspect_ratio > level_aspect_ratio) ? (canvas.clientHeight / level_height) : (canvas.clientWidth / canvas_width_in_tiles) )
const tileSize = idealTileSize - (idealTileSize%20)
const coin_stack_delta = Math.max( 1, Math.min( 10, Math.floor(((level_height-2)*tileSize)/level_initial_gold) ) ) / tileSize

function draw_tile(j, i, tile_x, tile_y, tileset)
{
	[img, padx,pady, spreadx,spready, width,height] = tiles_image[tileset]
	ctx.drawImage(img, spreadx*tile_x+padx, spready*tile_y+pady, width, height, j*tileSize, i*tileSize, tileSize, tileSize)
}

const road_tiles = [4, 4, 4, 5, 4, 9, 15, 16, 4, 13, 11, 17, 20, 18, 19, 23].map( (x) => [0,x,2] )
function draw_level()
{
	// Clear canvas (would not be necessary if we had no transparent background tiles)
	ctx.fillStyle = "#f9f7e8";
	ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

	// Draw background and coins on the ground
	for (const [i,line] of grid.entries())
	{
		for (const [j,background_type] of line.entries())
		{
			// const [tile_x, tile_y, tileset] = [ [11,8], [12,8], [1,8] ][background_type]
			// const [tile_x, tile_y, tileset] = can_walk(j,i) ? road_tiles[background_type] : [ [12,8,0], [1,8,0] ][background_type-16]
			const [tile_x, tile_y, tileset] = can_walk(j,i) ? road_tiles[background_type] : [0,3,2]
			draw_tile(j, i, tile_x, tile_y, tileset)
			// Draw coins
			if (coins[i][j])
				// draw_tile(j, i, (freeze_offered_coins && !frozen_coins[i][j] ) ? 4 : 0, 0, 0)
				draw_tile(j, i, 0, frozen_coins[i][j] ? 1 : 0, 3)
		}
	}
	// Draw sprites
	for (const s of sprites)
		s.draw()
	// Draw coin magnets
	for (const magnet_position of room_centers)
		if (magnet_position != null)
			draw_tile(magnet_position[0], magnet_position[1], 0, 1, 2)
	// Draw flying coins (and coin stacks)
	for (const fc of flying_coins)
		fc.draw()
	// Draw visualisation of how much gold each sprite is holding
	for (const [sprite_index, sprite] of sprites.entries())
	{
		const sprite_image = sprite.get_image()
		const [x, y] = [level_width+sprite_index, level_height-1]
		for (let i=0; i<level_height; i++)
			draw_tile(x, y-i, 0, 3, 2)
		draw_tile(x, y, sprite_image[0], sprite_image[1], sprite_image[2])
		for (let i=0; i<sprite.gold; i++)
			draw_tile(x, y-1-i*coin_stack_delta, 0, 0, 3)
	}
}
