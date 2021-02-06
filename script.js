
let gold_droped = null
let level_won = false
function check_win_condition()
{
	// gold_droped = level.flying_coins.length + [...Array(level.width*level.height).fill().keys()].reduce( (s, cell_index) => level.get_cell_data(level.coins, cell_index) ? s+1:s)
	gold_droped = level.initial_gold - level.sprites.reduce( (sum, sprite) => sum+sprite.gold, 0)
	progression = gold_droped / (gold_drop_objective+1)

	if (gold_droped >= gold_drop_objective)
		level_won = true
}

// check if a room is surrounded with coins
function update_rooms()
{
	for (const [room_index, room_border] of level.room_borders.entries())
	{
		if (level.room_states[room_index]) // don't check the rooms that are already openned
			continue;
		if (room_border.every( (cell_index) => level.get_cell_data(level.coins, cell_index) ))
		{
			if (level.room_types[room_index] || room_border.some( (cell_index) => level.get_cell_data(level.frozen_coins, cell_index) ))
			{
				// freezing coins
				room_border.forEach( function(cell_index) { level.set_cell_data(level.frozen_coins, cell_index, true); } );
			}
			else
			{
				// flying coins
				let [barycenter_x, barycenter_y] = level.room_centers[room_index]
				room_border.forEach( function(cell_index) {
					level.set_cell_data(level.coins, cell_index, false); // remove the coins on the ground
					level.flying_coins.push( makeFlyingCoin(cell_index%level.width, Math.floor(cell_index/level.width), barycenter_x, barycenter_y) )
				} );
				powerup_sound.play()
			}
			level.room_states[room_index] = true
		}
	}
}


// check collisions between the player and the ghosts
function check_collisions()
{
	let player = level.sprites[0];
	const [px, py] = player.get_position()
	for (let i=1; i<level.sprites.length; i++)
	{
		let ghost = level.sprites[i]
		const [x,y] = ghost.get_position()
		if ( Math.hypot(px-x, py-y) < 0.25 )
		{
			//console.log(x, y, level.sprites[0].x, level.sprites[0].y)
			player.gold += ghost.gold
			ghost.gold = 0
			// TODO : go back somewhere without chasing the player for a while?
			hit_sound.play()
			return
		}
	}
}


let first_timestamp = null
function frame(ts)
{
	if (first_timestamp === null)
		first_timestamp = ts
	timestamp += (ts - first_timestamp)/1000
	first_timestamp = ts

	for (let s of level.sprites)
		s.frame_update()
	level.flying_coins.forEach( (fc) => fc.frame_update() )
	
	check_collisions()
	
	draw_level()
	
	if (level_won)
		end_level()
	else
		frame_timer = window.requestAnimationFrame(frame) // like setInterval but native frequency
}
let frame_timer = null








// ===== EVENT MANAGERS =====
let paused = true
let muted = false
let [input_dx, input_dy, input_direction] = [0, 0, null]
const arrow_dirs = {'ArrowLeft': [-1,0,0], 'ArrowRight': [1,0,1], 'ArrowDown': [0,1,2], 'ArrowUp': [0,-1,3]}
function keyDownManager(event)
{
	if (event.code === 'Escape' || event.code === 'Pause' || event.code === 'KeyP')
	{
		if (paused)
		{
			first_timestamp = null
			frame_timer = window.requestAnimationFrame(frame)
			if (!muted)
				music_start()
		}
		else
		{
			window.cancelAnimationFrame(frame_timer)
			music_stop()
		}
		paused = !paused
		return false // prevents default browser behavior associated with this event.
	}
	if (event.code === 'KeyM')
	{
		if (muted && !paused)
			music_start()
		else
			music_stop()
		muted = !muted
		return false
	}
	if ( (!paused) && (event.code in arrow_dirs))
	{
		[input_dx, input_dy, input_direction] = arrow_dirs[event.code]
		level.sprites[0].record_input()
		return false
	}
	return true
}

window.onload = function()
{
	window.onkeydown = keyDownManager
}

div_end = document.getElementById('div_end')
div_end.style.display = 'none' // 'block' to show it
div_start = document.getElementById('div_start')
// div_start.style.display = 'block'

function end_level()
{
	paused = true
	window.cancelAnimationFrame(frame_timer)
	music_stop()
	next_level()
}

function next_level()
{
	cur_level += 1
	if (cur_level >= levels.length)
		return // todo: win screen
	document.getElementById('spn_level').innerText = ''+(cur_level+1)
	div_start.style.display = 'block'
}

let level = null
let cur_level = 0
let timestamp = 0
function start()
{
	level_won = false
	first_timestamp = null
	timestamp = 0
	gold_drop_objective = gold_drop_objectives[cur_level];
	[input_dx, input_dy, input_direction] = [0, 0, null]
	level = new Level(levels[cur_level], 100)
	init_level_renderer()
	gold_droped = 0
	progression = 0
	paused = false
	frame_timer = window.requestAnimationFrame(frame)
	music_start()
}
