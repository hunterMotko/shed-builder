import { describe, it, expect } from 'vitest';
import { WALL_SIDES, routePlacements } from './wallSides';

// The walls a Placement is allowed to name, taken from CONTEXT.md and the
// Placement typedef in shedStore.js. Written out by hand rather than imported
// from the module under test, so narrowing the source list fails these tests
// instead of quietly redefining what "every wall" means.
const WALLS_A_CUSTOMER_CAN_CHOOSE = ['front', 'back', 'left', 'right'];

const doorOn = (wall) => ({
	id: `door-${wall}`,
	type: 'door',
	wall,
	normalizedX: 0.5,
	normalizedY: 0.5,
	width: 3,
	height: 6.8,
});

describe('WALL_SIDES', () => {
	it('renders every wall a customer can put an Option on', () => {
		for (const wall of WALLS_A_CUSTOMER_CAN_CHOOSE) {
			expect(WALL_SIDES).toContain(wall);
		}
	});

	it('renders no wall a Placement could never name', () => {
		expect(WALL_SIDES).toHaveLength(WALLS_A_CUSTOMER_CAN_CHOOSE.length);
	});
});

describe('routePlacements', () => {
	it('drops nothing from a Design with a door on all four walls', () => {
		const placements = WALLS_A_CUSTOMER_CAN_CHOOSE.map(doorOn);

		const { dropped } = routePlacements(placements);

		expect(dropped).toEqual([]);
	});

	it('sends each Placement to its own wall and no other', () => {
		const placements = WALLS_A_CUSTOMER_CAN_CHOOSE.map(doorOn);

		const { byWall } = routePlacements(placements);

		for (const wall of WALLS_A_CUSTOMER_CAN_CHOOSE) {
			expect(byWall[wall].map((p) => p.id)).toEqual([`door-${wall}`]);
		}
	});

	it('gives every rendered wall an entry even when it has no Placements', () => {
		const { byWall } = routePlacements([]);

		for (const wall of WALLS_A_CUSTOMER_CAN_CHOOSE) {
			expect(byWall[wall]).toEqual([]);
		}
	});

	// This is the failure mode that made a Barn silently ignore front and back
	// doors: the wall list was narrowed and the Placements went nowhere, with
	// nothing reporting the loss. Routing has to hand them back.
	it('reports Placements it cannot render rather than discarding them', () => {
		const placements = [doorOn('front'), doorOn('left')];

		const { byWall, dropped } = routePlacements(placements, ['left', 'right']);

		expect(dropped.map((p) => p.id)).toEqual(['door-front']);
		expect(byWall.left.map((p) => p.id)).toEqual(['door-left']);
	});

	it('does not mistake an inherited object property for a wall', () => {
		const { byWall, dropped } = routePlacements([doorOn('constructor')]);

		expect(byWall.constructor).toBeUndefined();
		expect(dropped).toHaveLength(1);
	});
});
