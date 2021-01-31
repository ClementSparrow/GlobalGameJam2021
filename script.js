

// level initialisation : choose random directions for ghosts
function init_level_logic()
{
	for (let s of level.sprites)
		s.init_in_level()
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
			// console.log('room', room_index, 'is surrounded')
			if (level.room_types[room_index] || room_border.some( (cell_index) => level.get_cell_data(level.frozen_coins, cell_index) ))
			{
				// freezing coins
				room_border.forEach( function(cell_index) { level.set_cell_data(level.frozen_coins, cell_index, true); } );
			}
			else
			{
				// flying coins
				let [barycenter_x, barycenter_y] = level.room_centers[room_index]
				// let [barycenter_x, barycenter_y] = room_border.reduce( ([x,y], cell_index) => [x+(cell_index%level.width),y+Math.floor(cell_index/level.width)], [0,0] )
				// barycenter_x = barycenter_x/room_border.length
				// barycenter_y = barycenter_y/room_border.length
				room_border.forEach( function(cell_index) {
					level.set_cell_data(level.coins, cell_index, false); // remove the coins on the ground
					level.flying_coins.push( new FlyingCoin(cell_index%level.width, Math.floor(cell_index/level.width), barycenter_x, barycenter_y) )
				} );

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
			return
		}
	}
}


let first_timestamp = null
function frame(ts)
{
	if (first_timestamp === null)
	first_timestamp = ts
	timestamp = (ts - first_timestamp)/1000

	for (let s of level.sprites)
		s.frame_update()
	level.flying_coins.forEach( (fc) => fc.frame_update() )
	
	check_collisions()
	
	draw_level()
	
	frame_timer = window.requestAnimationFrame(frame) // like setInterval but native frequency
}
let frame_timer = null







// ===== SOUND AND MUSIC =====

let cur_track = 0
let music_playing = false
const music_tracks = [
	// new Audio('music/Oniku Loop2.wav'),
	new Audio('music/music1.wav'),
	new Audio('music/music2.wav'),
	new Audio('music/music3.wav')
]
function timeupdate_cb()
{
	if (this.currentTime > this.duration - 0.1)
	{
		this.pause()
		this.currentTime = 0
		cur_track = (cur_track+1)%music_tracks.length //Math.min(cur_track+1, 2)
		music_tracks[cur_track].ontimeupdate = timeupdate_cb
		music_tracks[cur_track].play()
	}
}
function toggle_music()
{
	music_tracks[cur_track].ontimeupdate = timeupdate_cb
	if (music_playing)
		music_tracks[cur_track].pause()
	else
		music_tracks[cur_track].play()
	music_playing = !music_playing
}

// ===== EVENT MANAGERS =====

const arrow_dirs = {'ArrowLeft': [-1,0,0], 'ArrowRight': [1,0,1], 'ArrowDown': [0,1,2], 'ArrowUp': [0,-1,3]}
function keyDownManager(event)
{
	if (event.code == 'Escape')
	{
		window.cancelAnimationFrame(frame_timer)
		return false // prevents default browser behavior associated with this event.
	}
	if (event.code === 'Space')
	{
		toggle_music()
		return false
	}
	if (event.code in arrow_dirs)
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
div_start.style.display = 'block'

function start()
{
	init_level_renderer()
	init_level_logic()
	frame_timer = window.requestAnimationFrame(frame)
	toggle_music()
}
