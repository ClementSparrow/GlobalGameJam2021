// grid topology
const directions = [[-1,0], [1,0], [0,1], [0,-1]] // West, East, South, North
const opposite_directions = [ 1, 0, 3, 2 ]


// ---- Sprite -----

function Sprite(x, y, direction, speed, gold)
{
	// Coordinate of the starting cell for a sprite moving from this cell to an adjacent one
	this.x = x // int, in units of cells
	this.y = y // int, in units of cells
	// Direction the sprite is facing
	this.direction = direction
	// Speed it's going at in this direction (float)
	this.speed = speed
	this.gold = gold // how many coins it holds
	this.animation_ref_start = timestamp
	this.animation_ref_end = null
}

Sprite.prototype.get_interpolation_value = function()
{
	if (this.animation_ref_end === null)
		return null
	return (timestamp - this.animation_ref_start) / (this.animation_ref_end - this.animation_ref_start);
}

Sprite.prototype.get_position = function()
{
	const interpolation_value = this.get_interpolation_value()
	if ((interpolation_value === null) || (this.direction === null))
		return [this.x, this.y]
	const [dx, dy] = directions[this.direction]
	return [this.x + dx*interpolation_value, this.y + dy*interpolation_value]
}

Sprite.prototype.draw = function()
{
	const [x, y] = this.get_position()
	const [tile_x, tile_y, tileset] = this.get_image()
	draw_tile(x, y, tile_x, tile_y, tileset)
}

Sprite.prototype.get_image = function() {}

Sprite.prototype.init_in_level = function() {}

Sprite.prototype.frame_update = function()
{
	const interpolation_value = this.get_interpolation_value()
	if (interpolation_value === null)
		return;
	if (interpolation_value >= 1)
	{
	//	ends the current animation
		this.animation_ref_start = this.animation_ref_end
		this.animation_ref_end = null
	//	and move sprite accordingly
		const [dx, dy] = directions[this.direction]
		this.x += dx
		this.y += dy
	//	start a new motion animation if needed
		this.cell_action()
	}
}

Sprite.prototype.cell_action = function() {}


// ---- Player -----

const player_animation_tiles = [0,1] // pour le set 1
// const player_animation_tiles = [4,5,6,7,6,5] // pour le set 0
const player_direction_tiles = [1,0,3,2] // pour le set 1 bis (4 directions)
// const player_direction_tiles = [0,0,0,0] // pour le set 1 (seulement droite)
// const player_direction_tiles = [3,4,5,6] // pour le set 0
const player_animation_duration = 0.5 // seconds
const player_speed = 2.8 // cells per second

Player.prototype = Object.create(Sprite.prototype)
function Player(x, y, speed, gold)
{
	Sprite.call(this, x, y, 2, speed*player_speed, gold)
}

Player.prototype.get_image = function()
{
	const dt = timestamp - this.animation_ref_start // we should have an animation class, and use one for the sprite position and another one for the animation frames
	const frame = Math.floor(dt*player_animation_tiles.length/player_animation_duration) % player_animation_tiles.length
	return [player_animation_tiles[frame], player_direction_tiles[this.direction], 1];
}

Player.prototype.cell_action = function()
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
	if ((input_direction === undefined) || (!level.can_walk(this.x+input_dx, this.y+input_dy)))
	{
		this.speed = 0
	}
	else
	{
		this.direction = input_direction
		this.speed = player_speed
		this.animation_ref_end = this.animation_ref_start + 1.0/this.speed
	}
}

Player.prototype.record_input = function()
{
	if (this.speed == 0)
	{
		this.animation_ref_start = timestamp
		this.change_direction()
	}
	else if ( input_direction == opposite_directions[this.direction]) // moving back
	{
		const interpolation_value = this.get_interpolation_value()
		this.direction = input_direction
		this.x -= input_dx
		this.y -= input_dy
		this.animation_ref_end = timestamp + interpolation_value * (1/this.speed)
		this.animation_ref_start = this.animation_ref_end - (1/this.speed)
	}
}


// ---- Ghost -----

// const ghost_direction_tiles = [0,1,2,3]
const ghost_direction_tiles = [1,0,2,3]
const ghost_animation_tiles = [0, 1, 2, 1]
const ghost_animation_duration = 0.5
const ghost_speed = player_speed // cells per second

Ghost.prototype = Object.create(Sprite.prototype)
function Ghost(x, y, ghost_type)
{
	this.ghost_type = ghost_type
	Sprite.call(this, x, y, 0, 0, 0)
}

Ghost.prototype.get_image = function()
{
	const dt = timestamp - this.animation_ref_start // we should have an animation class, and use one for the sprite position and another one for the animation frames
	const frame = Math.floor(dt*ghost_animation_tiles.length/ghost_animation_duration) % ghost_animation_tiles.length
	return [ghost_animation_tiles[frame], ghost_direction_tiles[this.direction], 3+this.ghost_type];
}


Ghost.prototype.init_in_level = function()
{
	this.choose_direction()
	this.animation_ref_end = this.animation_ref_start + 1.0/ghost_speed
}

Ghost.prototype.cell_action = function()
{
//	pick up gold
	if (level.can_pickup_coin(this.x, this.y))
	{
		level.coins[this.y][this.x] = false
		this.gold += 1
	}
//	pick a new direction
	this.choose_direction();
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
Ghost.prototype.choose_direction = function()
{
	let possible_directions = [...directions.entries()].filter( ([dir, [dx,dy]]) => level.can_walk(this.x+dx, this.y+dy) )
	if (this.speed > 0)
		possible_directions = possible_directions.filter( ([dir, [dx,dy]]) => (dir != opposite_directions[this.direction]) )
	const candidates = find_candidate_directions(this.x, this.y, possible_directions, 3)
	this.direction = candidates[Math.floor(Math.random()*candidates.length)][0]
	this.speed = ghost_speed
	this.animation_ref_end = this.animation_ref_start + 1.0/this.speed
}


// ---- Flying Coins -----

const flying_coin_speed = 5; // tiles per second

FlyingCoin.prototype = Object.create(Sprite.prototype)
function FlyingCoin(x, y, dest_x, dest_y)
{
	const [dx, dy] = [dest_x - x, dest_y - y]
	const l = Math.hypot(dx, dy)
	const proportion = (l-Math.random()*0.4)/l
	this.dest_x = x + dx * proportion
	this.dest_y = y + dy * proportion
	Sprite.call(this, x, y, 0, 0, 0)
	this.animation_ref_end = this.animation_ref_start + l / flying_coin_speed
}

FlyingCoin.prototype.get_position = function()
{
	const interpolation_value = this.get_interpolation_value()
	if (interpolation_value == null)
		return [this.dest_x, this.dest_y]
	return [this.x + (this.dest_x - this.x)*interpolation_value, this.y + (this.dest_y - this.y)*interpolation_value]
}

FlyingCoin.prototype.get_image = function() { return [0,0,3]; }

FlyingCoin.prototype.frame_update = function()
{
	if (this.get_interpolation_value() >= 1 )
	{
		this.animation_ref_end = null
	}
}
