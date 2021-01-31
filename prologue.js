/* TODO Thibault:
 * _ refactoring pass
 * _ modification du déplacement des fantômes pour dx/dy
 * _ pourquoi init alors qu'on a déjà des constructeurs ?
 * _ renommer sprites[0] en player
 */

let timestamp = 0


// ===== LEVELS =====

const level_as_string = [
	'################',
	'#.............1#',
	'#.#.#.@@@.####.#',
	'#.#.#.....####.#',
	'#.#.#.###.#K##2#',
	'#.#.#.###.####.#',
	'#....ccccc.....#',
	'#.###c@@@c@@@@.#',
	'#....c@@@c.....#',
	'#.@@@c@@@c####.#',
	'#p...ccccc.....#',
	'################']
const level_initial_gold = 100;
