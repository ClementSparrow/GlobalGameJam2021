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

Sprite.prototype.draw = function(tile_x, tile_y, tileset)
{
	const [x, y] = this.get_position()
	draw_tile(x, y, tile_x, tile_y, tileset)
}

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
const player_speed = 2 // cells per second

Player.prototype = Object.create(Sprite.prototype)
function Player(x, y, speed, gold)
{
	Sprite.call(this, x, y, 0, speed*player_speed, gold)
}

Player.prototype.draw = function()
{
	const interpolation_value = this.get_interpolation_value()
	const dt = timestamp - this.animation_ref_start // we should have an animation class, and use one for the sprite position and another one for the animation frames
	const frame = Math.floor(dt*player_animation_tiles.length/player_animation_duration) % player_animation_tiles.length
	Sprite.prototype.draw.call(this, player_animation_tiles[frame], player_direction_tiles[this.direction], 1)
	// Sprite.prototype.draw.call(this, player_direction_tiles[this.direction], player_animation_tiles[frame], 1)
}

Player.prototype.cell_action = function()
{
	// console.log([this.x, this.y], [this.dx, this.dy], this.last_action_timestamp, timestamp, [input_dx, input_dy])
	if ((this.gold > 0) && can_drop_coin(this.x, this.y))
	{
		// console.log('dropped coin at', this.x, this.y, ', ', this.gold, 'remaining')
		coins[this.y][this.x] = true
		this.gold -= 1
		update_rooms()
	}
	this.change_direction()
}

Player.prototype.change_direction = function()
{
	// console.log(input_direction, [input_dx, input_dy], [this.x, this.y], grid[this.y+input_dy][this.x+input_dx])
	if ((input_direction === undefined) || (!can_walk(this.x+input_dx, this.y+input_dy)))
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
const ghost_speed = player_speed // cells per second

Ghost.prototype = Object.create(Sprite.prototype)
function Ghost(x, y, ghost_type)
{
	this.ghost_type = ghost_type
	Sprite.call(this, x, y, 0, 0, 0)
}

Ghost.prototype.draw = function()
{
	// Sprite.prototype.draw.call(this, ghost_direction_tiles[this.direction], 1, 0)
	Sprite.prototype.draw.call(this, 0, ghost_direction_tiles[this.direction], 3+this.ghost_type)
}

Ghost.prototype.init_in_level = function()
{
	this.choose_direction()
	this.animation_ref_end = this.animation_ref_start + 1.0/ghost_speed
}

Ghost.prototype.cell_action = function()
{
//	pick up gold
	if (can_pickup_coin(this.x, this.y))
	{
		coins[this.y][this.x] = false
		this.gold += 1
	}
//	pick a new direction
	this.choose_direction();
}

// at intersections, ghosts will go towards the closest coin in line of sight,
// and otherwise a random non-backward direction
Ghost.prototype.choose_direction = function()
{
	let cur_dist = Number.MAX_SAFE_INTEGER
	let candidates = []
	let possible_directions = [...directions.entries()].filter( ([dir, [dx,dy]]) => can_walk(this.x+dx, this.y+dy) )
	if (this.speed > 0)
		possible_directions = possible_directions.filter( ([dir, [dx,dy]]) => (dir != opposite_directions[this.direction]) )
	for (let [dir,[dx,dy]] of possible_directions)
	{
		let X = this.x+dx, Y = this.y+dy, dist = 1
		while (can_walk(X,Y) && !can_pickup_coin(X,Y))
		{
			X += dx
			Y += dy
			dist += 1
		}
		if (!can_pickup_coin(X,Y))
			dist = Number.MAX_SAFE_INTEGER
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
	if (cur_dist === Number.MAX_SAFE_INTEGER)
		candidates = possible_directions//.map( ([dir, [dx,dy]]) => dir )//.filter(dir => (dir != opposite_directions[this.direction]))
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

FlyingCoin.prototype.draw = function()
{
	// Sprite.prototype.draw.call(this, 0, 0, 0)
	Sprite.prototype.draw.call(this, 0, 0, 3)
}

FlyingCoin.prototype.frame_update = function()
{
	if (this.get_interpolation_value() >= 1 )
	{
		this.animation_ref_end = null
	}
}
