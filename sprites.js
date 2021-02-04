// grid topology
const directions = [[-1,0], [1,0], [0,1], [0,-1]] // West, East, South, North
const opposite_directions = [ 1, 0, 3, 2 ]

// ------ ANIMATION: POSITION -----

function PositionAnimation(start_x, start_y, end_x, end_y, speed)
{
	this.start_x = start_x
	this.start_y = start_y
	this.end_x = end_x
	this.end_y = end_y
	this.speed = speed
	this.start_time = timestamp
	this.end_time = timestamp + Math.hypot(end_x - start_x, end_y - start_y)/speed
}

function directionalPositionAnimation(x, y, direction, speed)
{
	const [dx, dy] = directions[direction]
	return new PositionAnimation(x, y, x+dx, y+dy, speed)
}

PositionAnimation.prototype.get_interpolation_value = function()
{
	return (timestamp - this.start_time) / (this.end_time - this.start_time);
}

PositionAnimation.prototype.get_position = function()
{
	const interpolation_value = this.get_interpolation_value()
	return [this.start_x + (this.end_x - this.start_x)*interpolation_value, this.start_y + (this.end_y - this.start_y)*interpolation_value]
}

PositionAnimation.prototype.finished = function()
{
	return 	(this.get_interpolation_value() >= 1.0)
}

PositionAnimation.prototype.reverse = function()
{
	// reverse start and end positions
	const [x,y] = [this.end_x, this.end_y];
	this.end_x = this.start_x
	this.end_y = this.start_y
	this.start_x = x
	this.start_y = y

	// compute adequate timestamps
	const [time_since_start, time_to_end] = [timestamp - this.start_time, this.end_time - timestamp]
	this.start_time = timestamp - time_to_end
	this.end_time = timestamp + time_since_start
}



// ----- ANIMATION: choice of tile ------

function TileSelector(loop_duration, loop_tiles, direction_tiles, tileset)
{
	this.loop_duration = loop_duration
	this.loop_tiles = loop_tiles
	this.direction_tiles = direction_tiles
	this.tileset = tileset
}

TileSelector.prototype.get_tile = function(direction=0)
{
	const frame = Math.floor(timestamp * this.loop_tiles.length/this.loop_duration) % this.loop_tiles.length
	return [this.loop_tiles[frame], this.direction_tiles[direction], this.tileset];
}



// ---- Sprite -----

function Sprite(x, y, direction, speed, gold, tile_selector)
{
	// Coordinate of the starting cell for a sprite moving from this cell to an adjacent one
	this.x = x // int, in units of cells
	this.y = y // int, in units of cells
	// Direction the sprite is facing
	this.direction = direction
	this.gold = gold // how many coins it holds
	this.position_animation = ((speed==0) || (direction===null)) ? null : directionalPositionAnimation(x, y, direction, speed)
	this.tile_selector = tile_selector
}

Sprite.prototype.get_position = function() // used for rendering and collisions
{
	return (this.position_animation === null) ? [this.x, this.y] : this.position_animation.get_position()
}

Sprite.prototype.draw = function()
{
	const [x, y] = this.get_position()
	const [tile_x, tile_y, tileset] = this.tile_selector.get_tile(this.direction)
	tileset.draw_tile(x, y, tile_x, tile_y)
}

Sprite.prototype.frame_update = function()
{
	if (this.position_animation === null)
		this.cell_action(false)
	else
	{
		if (!this.position_animation.finished())
			return
		this.x = this.position_animation.end_x
		this.y = this.position_animation.end_y
		//	ends the current animation
		this.position_animation = null
		//	start a new position animation if needed
		this.cell_action(true)
	}
}

Sprite.prototype.cell_action = function(at_end_of_movement) {}


// ---- Player -----

const player_tileSelector = new TileSelector(0.5, [0,1], [1,0,3,2], avatar_tileset)
const player_speed = 2.8 // cells per second

Player.prototype = Object.create(Sprite.prototype)
function Player(x, y, speed, gold)
{
	Sprite.call(this, x, y, 2, 0, gold, player_tileSelector)
}

Player.prototype.cell_action = function(at_end_of_movement)
{
	if ((this.gold > 0) && level.can_drop_coin(this.x, this.y))
	{
		// TODO: move this out of the Player class, as it is a game mechanic that could also be given to ghosts
		level.coins[this.y][this.x] = true
		this.gold -= 1
		// coin_sound.play()
		check_win_condition()
		update_rooms()
	}
	this.change_direction()
}

Player.prototype.change_direction = function()
{
	const [dest_x, dest_y] = [this.x+input_dx, this.y+input_dy]
	if ((input_direction === null) || (!level.can_walk(dest_x, dest_y)))
	{
		this.position_animation = null
	}
	else
	{
		this.direction = input_direction
		this.position_animation = new PositionAnimation(this.x, this.y, dest_x, dest_y, player_speed)
	}
}

Player.prototype.record_input = function()
{
	if (this.position_animation === null)
	{
		this.change_direction()
	}
	else if ( input_direction == opposite_directions[this.direction]) // moving back
	{
		this.position_animation.reverse()
		this.direction = input_direction
	}
}


// ---- Ghost -----

const ghost_tileSelectors = enemy_tilesets.map( (tileset) => new TileSelector(0.5, [0, 1, 2, 1], [1,0,2,3], tileset) )
const ghost_speed = player_speed // cells per second

Ghost.prototype = Object.create(Sprite.prototype)
function Ghost(x, y, ghost_type)
{
	this.ghost_type = ghost_type-1
	Sprite.call(this, x, y, 0, 0, 0, ghost_tileSelectors[this.ghost_type])
}

Ghost.prototype.cell_action = function(at_end_of_movement)
{
//	pick up gold
	if (level.can_pickup_coin(this.x, this.y))
	{
		level.coins[this.y][this.x] = false
		this.gold += 1
	}
//	pick a new direction
	this.choose_direction(!at_end_of_movement)
}

function find_candidate_directions(start_x, start_y, possible_directions, max_dist = Number.MAX_SAFE_INTEGER)
{
	let cur_dist = Number.MAX_SAFE_INTEGER
	let candidates = []
	for (const [dir,[dx,dy]] of possible_directions)
	{
		let X = start_x+dx, Y = start_y+dy, dist = 1
		while (level.can_walk(X,Y) && !level.can_pickup_coin(X,Y) && (dist < max_dist))
		{
			X += dx
			Y += dy
			dist += 1
		}
		if (!level.can_pickup_coin(X,Y)) // no coin is visible
			if (!level.can_walk(X,Y)) // prefer a direction with out-of-sight cells over a direction with a wall in sight
				dist = Number.MAX_SAFE_INTEGER
			else
				dist += 1
		if (dist <= cur_dist)
		{
			if (dist < cur_dist)
			{
				cur_dist = dist
				candidates = []
			}
			candidates.push([dir,[dx,dy]])
		}
	}
	// if (cur_dist === Number.MAX_SAFE_INTEGER)
	// 	return possible_directions
	return candidates
}

// at intersections, ghosts will go towards the closest coin in line of sight,
// and otherwise a random non-backward direction
Ghost.prototype.choose_direction = function(ignore_current_direction)
{
	let possible_directions = [...directions.entries()].filter( ([dir, [dx,dy]]) => level.can_walk(this.x+dx, this.y+dy) )
	if (!ignore_current_direction)
		possible_directions = possible_directions.filter( ([dir, [dx,dy]]) => (dir != opposite_directions[this.direction]) )
	const candidates = find_candidate_directions(this.x, this.y, possible_directions, 3)
	this.direction = candidates[Math.floor(Math.random()*candidates.length)][0]
	this.position_animation = directionalPositionAnimation(this.x, this.y, this.direction, ghost_speed)
}


// ---- Flying Coins -----

const coins_tileSelectors = new TileSelector( 1, [0], [0], coins_tileset)
const flying_coin_speed = 5; // tiles per second

function makeFlyingCoin(x, y, dest_x, dest_y)
{
	const [dx, dy] = [dest_x - x, dest_y - y]
	const l = Math.hypot(dx, dy)
	const proportion = (l-Math.random()*0.4)/l
	const new_dest_x = x + dx * proportion
	const new_dest_y = y + dy * proportion
	let result = new Sprite(x, y, 0, 0, 0, coins_tileSelectors)
	result.position_animation = new PositionAnimation(x, y, new_dest_x, new_dest_y, flying_coin_speed)
	return result
}
