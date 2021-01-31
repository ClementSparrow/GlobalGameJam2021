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
	'#.............3#',
	'#.###.@@@.@@@@.#',
	'#.....@@@......#',
	'#.@@@.@@@.####.#',
	'#p.............#',
	'################']
const level_initial_gold = 100;
const gold_drop_objective = 80;
