const all_8_directions = [ [-1,0], [-1,1],  [0,1], [1,1], [1,0], [1,-1], [0,-1], [-1,-1]];

const levels = [
	['################',
	 '#.............1#',
	 '#.#.#.@@@.####.#',
	 '#.#.#.....####.#',
	 '#.#.#.###.#K##2#',
	 '#.#.#.###.####.#',
	 '#....ccccc....3#',
	 '#.###c@@@c@@@@.#',
	 '#....c@@@c.....#',
	 '#.@@@c@@@c####.#',
	 '#p...ccccc.....#',
	 '################'],
	['###############',
	 '#p....#########',
	 '#.###.....#####',
	 '#.###.###.....#',
	 '#.....###.###.#',
	 '#.@@@.....###.#',
	 '#.@@@.@@@.....#',
	 '#.....@@@.@@@.#',
	 '#.###.....@@@.#',
	 '#.###.###....3#',
	 '#.....###.###.#',
	 '#####.....###.#',
	 '#########1...2#',
	 '###############'],
	['###############',
	 '#p........#..1#',
	 '#.###.###.#.@.#',
	 '#.#.......#.@.#',
	 '#.#.@@@.#...@.#',
	 '#...@@@.###.@.#',
	 '#.#.@@@.#...@.#',
	 '#.#.......#...#',
	 '#.#.#####.###.#',
	 '#.............#',
	 '######.#.####.#',
	 '#......#.#....#',
	 '#.######.#.@@.#',
	 '#3...........2#',
	 '###############']
]
const gold_drop_objectives = [80, 80, 80];
let gold_drop_objective = null


// ----- PARSING ------

Level.prototype.create_room = function(cell_index)
{
	let new_room = new Set()
	new_room.add(cell_index)
	this.rooms.push(new_room)
	this.room_types.push(false)
	this.room_centers.push(null)
	return this.rooms.length-1
}

Level.prototype.get_cell_data = function(array, cell_index)
{
	return array [ Math.floor(cell_index/this.width) ] [ cell_index%this.width ];
}
Level.prototype.set_cell_data = function(array, cell_index, value)
{
	array [ Math.floor(cell_index/this.width) ] [ cell_index%this.width ] = value;
}

// auxillary func to find rooms
// TODO: this is not the correct way to do it and will not work with complex room shapes
Level.prototype.find_room = function(cell_index)
{
	for (let room_index=0; room_index<this.rooms.length; room_index++)
	{
		let room_content = this.rooms[room_index]
		if ( room_content.has(cell_index-1) || room_content.has(cell_index-this.width) )
		{
			// TODO: actually, if the cells above and on the left belong to different rooms we need to merge the rooms
			room_content.add(cell_index)
			return room_index
		}
	}
	return this.create_room(cell_index)
}

Level.prototype.parse_level_string = function(level_as_string)
{
	for (const [y, grid_line] of this.grid.entries())
	{
		const line = level_as_string[y]
		for (const [x, ch] of [...line].entries() )
		{
			const cell_index = y*this.width + x
			// 0 = corridor, 1==wall, 2=inside room
			background_type = { '.': 0, '#': 16, '1': 0, '2': 0, '3': 0, 'p': 0, 'c': 0, '@': 16, 'K': 16}[ch]
			grid_line[x] = background_type
			if ((background_type) == 16)
			{
				let room_index = this.find_room(cell_index)
				if (ch=='K')
					key_room = room_index
				else if (ch=='#')
					this.room_types[room_index] = true
			}
			else if (ch=='p')
				this.sprites.unshift( new Player(x, y, 0, this.initial_gold) ) // players is always the first sprite
			else if (ch=='1')
				this.sprites.push( new Ghost(x, y, 1) )
			else if (ch=='2')
				this.sprites.push( new Ghost(x, y, 2) )
			else if (ch=='3')
				this.sprites.push( new Ghost(x, y, 3) )
			else if (ch=='c')
				this.coins[y][x] = true
		}
	}
}




// ----- ROADS -----

Level.prototype.can_walk = function(x, y)
{
	const background_type = this.grid[y][x];
	return (background_type < 16);
}

Level.prototype.compute_road_type = function(x, y)
{
	let result = 0
	for (const [dir, [dx,dy]] of directions.entries())
		result += (this.can_walk(x+dx, y+dy) ? 1 : 0)<<dir
	return result;
}



// ----- ROOM BORDERS ----

Level.prototype.find_room_borders = function()
{
	const cell_indexes = [...Array(this.width*this.height).fill().keys()]
	this.room_borders = this.rooms.map( (room_content) =>
		cell_indexes.filter(
			(_, cell_index) => (all_8_directions.some( ([dx,dy]) => room_content.has(cell_index+this.width*dy+dx) && (this.get_cell_data(this.grid, cell_index) < 16) ))
		)
	)
}

Level.prototype.compute_room_centers = function()
{
	for (const [room_index, room_border] of this.room_borders.entries())
	{
		if (!this.room_types[room_index])
		{
			// flying coins
			let [barycenter_x, barycenter_y] = room_border.reduce( ([x,y], cell_index) => [x+(cell_index%this.width),y+Math.floor(cell_index/this.width)], [0,0] )
			barycenter_x = barycenter_x/room_border.length
			barycenter_y = barycenter_y/room_border.length
			this.room_centers[room_index] = [barycenter_x, barycenter_y]
		}
	}
}




// ----- COINS -----

Level.prototype.can_drop_coin = function(x, y) { return !this.coins[y][x]; }
Level.prototype.can_pickup_coin = function(x, y) { return this.coins[y][x] && !this.frozen_coins[y][x]; }



// ----- CONSTRUCTOR -----

// Create the level structure
function Level(level_as_string, level_initial_gold)
{
	this.initial_gold = level_initial_gold
	this.height = level_as_string.length
	this.width = level_as_string[0].length

	// Grid data
	this.grid = level_as_string.map( (line) => new Array(line.length).fill(0) )
	this.coins = level_as_string.map( (line) => new Array(line.length).fill(false) )
	this.frozen_coins = level_as_string.map( (line) => new Array(line.length).fill(false) )

	// Moving objects
	this.flying_coins = []
	this.sprites = []
	this.key_room = null

	// Rooms
	this.rooms = []
	this.room_types = []
	this.room_centers = []

	// Parse the level string
	this.parse_level_string(level_as_string)

	// Identify the appropriate background tiles for the roads
	for (const [y, grid_line] of this.grid.entries())
	{
		for (const [x, background_type] of grid_line.entries() )
		{
			if (!this.can_walk(x,y))
				continue;
			grid_line[x] = this.compute_road_type(x,y)
		}
	}

	this.find_room_borders()
	this.compute_room_centers()
	this.room_states = Array(this.rooms.length).fill(false) // not yet revealed
}




