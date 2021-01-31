// https://musiclab.chromeexperiments.com/Song-Maker/song/4764369800396800
// https://musiclab.chromeexperiments.com/Song-Maker/song/6565782197108736
// https://musiclab.chromeexperiments.com/Song-Maker/song/4661100298108928
// https://musiclab.chromeexperiments.com/Song-Maker/song/5698887071825920
// https://musiclab.chromeexperiments.com/Song-Maker/song/4704618215374848
// https://musiclab.chromeexperiments.com/Song-Maker/song/5673144514248704
// https://musiclab.chromeexperiments.com/Song-Maker/song/5284669721935872

let progression = 0 // float in [0;1[
let music_playing = null
const music_tracks = [
	new Audio('music/music0.wav'),
	new Audio('music/music1.wav'),
	new Audio('music/music2.wav'),
	new Audio('music/music3.wav'),
	new Audio('music/music4.wav'),
	new Audio('music/music5.wav'),
	new Audio('music/music6.wav')]
const coin_sound = new Audio('music/coin.wav')
const powerup_sound = new Audio('music/powerup.wav')
const hit_sound = new Audio('music/hit.wav')

function music_update_cb() {
	if (this.currentTime > this.duration - 0.1) {
		music_stop()
		music_start()
	}
}

function music_start() {
	music_playing = music_tracks[Math.floor(progression*music_tracks.length)]
	music_playing.ontimeupdate = music_update_cb
	music_playing.play()
}

function music_stop() {
	music_playing.pause()
	music_playing.currentTime = 0
	music_playing = null
}
