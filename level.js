// Create the level structure
const level_height = level_as_string.length
const level_width = level_as_string[0].length
var grid = level_as_string.map( (line) => new Array(line.length).fill(0) )
let coins = level_as_string.map( (line) => new Array(line.length).fill(false) )
frozen_coins = level_as_string.map( (line) => new Array(line.length).fill(false) )
flying_coins = []
let sprites = []
let key_room = null

let rooms = []
let room_types = []
let room_centers = []
function create_room(cell_index)
{
	let new_room = new Set()
	new_room.add(cell_index)
	rooms.push(new_room)
	room_types.push(false)
	room_centers.push(null)
	return rooms.length-1
}

function get_cell_data(array, cell_index)
{
	return array [ Math.floor(cell_index/level_width) ] [ cell_index%level_width ];
}
function set_cell_data(array, cell_index, value)
{
	array [ Math.floor(cell_index/level_width) ] [ cell_index%level_width ] = value;
}

// auxillary func to find rooms
// TODO: this is not the correct way to do it and will not work with complex room shapes
function find_room(cell_index)
{
	for (let room_index=0; room_index<rooms.length; room_index++)
	{
		let room_content = rooms[room_index]
		if ( room_content.has(cell_index-1) || room_content.has(cell_index-level_width) )
		{
			// TODO: actually, if the cells above and on the left belong to different rooms we need to merge the rooms
			room_content.add(cell_index)
			return room_index
		}
	}
	return create_room(cell_index)
}

// Parse the level_string
for (const [y, grid_line] of grid.entries())
{
	const line = level_as_string[y]
	for (const [x, ch] of [...line].entries() )
	{
		const cell_index = y*level_width + x
		// 0 = corridor, 1==wall, 2=inside room
		background_type = { '.': 0, '#': 16, '1': 0, '2': 0, 'p': 0, 'c': 0, '@': 16, 'K': 16}[ch]
		grid_line[x] = background_type
		if ((background_type) == 16)
		{
			let room_index = find_room(cell_index)
			if (ch=='K')
				key_room = room_index
			else if (ch=='#')
				room_types[room_index] = true
		}
		else if (ch=='p')
			sprites.unshift( new Player(x, y, 0, level_initial_gold) ) // players is always the first sprite
		else if (ch=='1')
			sprites.push( new Ghost(x, y, 1) )
		else if (ch=='2')
			sprites.push( new Ghost(x, y, 2) )
		else if (ch=='2')
			sprites.push( new Ghost(x, y, 3) )
		else if (ch=='c')
			coins[y][x] = true
	}
}

function can_walk(x, y)
{
	const background_type = grid[y][x];
	return (background_type < 16);
}

function compute_road_type(x, y)
{
	let result = 0
	for (const [dir, [dx,dy]] of directions.entries())
		result += (can_walk(x+dx, y+dy) ? 1 : 0)<<dir
	return result;
}

for (const [y, grid_line] of grid.entries())
{
	for (const [x, background_type] of grid_line.entries() )
	{
		if (!can_walk(x,y))
			continue;
		grid_line[x] = compute_road_type(x,y)
	}
}


// ----- ROOM BORDERS ----

const all_8_directions = [ [-1,0], [-1,1],  [0,1], [1,1], [1,0], [1,-1], [0,-1], [-1,-1]];

let room_borders = rooms.map( function(room_content)
	{
		const result = [...Array(level_width*level_height).fill().keys()].filter(
			(_, cell_index) => (all_8_directions.some( ([dx,dy]) => room_content.has(cell_index+level_width*dy+dx) && (get_cell_data(grid, cell_index) < 16) ))
		);
		return result;
	}
)

for (const [room_index, room_border] of room_borders.entries())
{
	if (!room_types[room_index])
	{
		// flying coins
		let [barycenter_x, barycenter_y] = room_border.reduce( ([x,y], cell_index) => [x+(cell_index%level_width),y+Math.floor(cell_index/level_width)], [0,0] )
		barycenter_x = barycenter_x/room_border.length
		barycenter_y = barycenter_y/room_border.length
		room_centers[room_index] = [barycenter_x, barycenter_y]
	}
}

let room_states = Array(rooms.length).fill(false) // not yet revealed



// ----- COINS -----

function can_drop_coin(x, y) { return !coins[y][x]; }
function can_pickup_coin(x, y) { return coins[y][x] && !frozen_coins[y][x]; }
