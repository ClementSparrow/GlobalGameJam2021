
// To draw level
const canvas_aspect_ratio = canvas.clientWidth / canvas.clientHeight
let tileSize = null
let coin_stack_delta = null

function init_level_renderer()
{
	const canvas_width_in_tiles = level.width + level.sprites.length + 1
	const level_aspect_ratio = canvas_width_in_tiles / level.height;
	const idealTileSize = Math.floor( (canvas_aspect_ratio > level_aspect_ratio) ? (canvas.clientHeight / level.height) : (canvas.clientWidth / canvas_width_in_tiles) )
	tileSize = idealTileSize //- (idealTileSize%20)
	coin_stack_delta = Math.max( 1, Math.min( 10, Math.floor(((level.height-2)*tileSize)/level.initial_gold) ) ) / tileSize
}

const road_tiles = [4, 4, 4, 5, 4, 9, 15, 16, 4, 13, 11, 17, 20, 18, 19, 23]
function draw_level()
{
	// Clear canvas (would not be necessary if we had no transparent background tiles)
	ctx.fillStyle = "#451F45"; // html page background color
	ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

	// Draw background and coins on the ground
	for (const [y,line] of level.grid.entries())
	{
		for (const [x,background_type] of line.entries())
		{
			roads_tileset.draw_tile(x, y, 0, level.can_walk(x,y) ? road_tiles[background_type] : 3)
			// Draw coins
			if (level.coins[y][x])
				coins_tileset.draw_tile(x, y, 0, level.frozen_coins[y][x] ? 1 : 0)
		}
	}
	// Draw level.sprites
	for (const s of level.sprites)
		s.draw()
	// Draw coin magnets
	for (const magnet_position of level.room_centers)
		if (magnet_position != null)
			roads_tileset.draw_tile(magnet_position[0], magnet_position[1], 0, 1)
	// Draw flying coins (and coin stacks)
	for (const fc of level.flying_coins)
		fc.draw()
	// Draw visualisation of how much gold has been dropped compared to the objective
	ctx.fillStyle = '#2f162f' // color of the walls
	ctx.fillRect(level.width*tileSize, 0, (level.sprites.length+1)*tileSize, level.height*tileSize);
	for (let i=gold_droped+1; i<gold_drop_objective; i++)
		coins_tileset.draw_tile(level.width, level.height-2-i*coin_stack_delta, 0, 1)
	for (let i=0; i<gold_droped; i++)
		coins_tileset.draw_tile(level.width, level.height-2-i*coin_stack_delta, 0, 0)
	// Draw visualisation of how much gold each sprite is holding
	for (const [sprite_index, sprite] of level.sprites.entries())
	{
		const [tile_x, tile_y, tileset] = sprite.tile_selector.get_tile()
		const [x, y] = [level.width+sprite_index+1, level.height-1]
		tileset.draw_tile(x, y, tile_x, tile_y)
		for (let i=0; i<sprite.gold; i++)
			coins_tileset.draw_tile(x, y-1-i*coin_stack_delta, 0, 0)
	}
}
