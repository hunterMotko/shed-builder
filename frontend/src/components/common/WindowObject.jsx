import { useMemo } from 'react';
import { openingTransform } from '../../utils/wallOpenings';

/**
 * WindowObject — the vinyl single-hung window that goes in a window Opening.
 *
 * Built from the Reference Photos rather than from the idea of a window. It
 * used to be a brown frame around sky-blue glass divided into a 2×2 grid of
 * panes by muntins in the trim colour, which is a cottage casement and not
 * anything this shop sells.
 *
 * What the photographs actually show, measured off `12-16-gable-front.jpg` at
 * 48.5 px/ft:
 *
 * - The frame is **white**, whatever the trim colour is — it is a stock vinyl
 *   unit, not a painted one. The burgundy around it in the photo is
 *   `WindowFrame`, the casing, which is a separate component and does follow
 *   the trim colour.
 * - **No muntins.** One white meeting rail, a little above centre, where the
 *   two sashes lap.
 * - The upper sash is glass over an unlit shed and reads almost black,
 *   `#333429`. The lower sash sits behind an insect screen and reads flat and
 *   pale, `#464237` — no reflection at all, which is what a screen does.
 *
 * The unit measures 24 × 36 in, both to within a couple of inches.
 */
export const WindowObject = ({
	placement,
	shedDimensions,
	frameColor = '#FFFFFF',
}) => {
	const { width: w, height: h } = placement;

	// The unit sits IN the opening: the frame's front face lands on the siding
	// plane (frame boxes run z 0.02 ± 0.03 in group space), the glass recessed
	// behind it, and only the casing — WindowFrame — stands proud of the wall.
	const { position, rotation } = useMemo(
		() => openingTransform(placement, shedDimensions, -0.05),
		[placement, shedDimensions]
	);

	// Frame stock, and where the two sashes meet. The rail sits above centre
	// because the lower sash is the one that slides, and is made the taller.
	const stock = 0.14;
	const railY = h * 0.06;
	const frame = { color: frameColor, roughness: 0.55, metalness: 0.0 };
	const sashHeight = Math.max(0.01, h / 2 - railY - stock / 2);

	return (
		<group position={position} rotation={rotation}>
			{/* Upper sash: glass over an unlit shed, so nearly black. */}
			<mesh position={[0, (railY + h / 2) / 2, 0]}>
				<planeGeometry args={[w - stock * 2, sashHeight]} />
				<meshStandardMaterial color="#2B2C24" roughness={0.12} metalness={0.0} />
			</mesh>

			{/* Lower sash: an insect screen, so matte and lighter than the glass. */}
			<mesh position={[0, (railY - h / 2) / 2, 0]}>
				<planeGeometry args={[w - stock * 2, Math.max(0.01, h / 2 + railY - stock / 2)]} />
				<meshStandardMaterial color="#4B4739" roughness={0.95} metalness={0.0} />
			</mesh>

			{/* The white frame: head, sill, two jambs and the meeting rail. */}
			{[
				{ key: 'head', pos: [0, h / 2 - stock / 2, 0.02], size: [w, stock, 0.06] },
				{ key: 'sill', pos: [0, -(h / 2 - stock / 2), 0.02], size: [w, stock, 0.06] },
				{ key: 'left', pos: [-(w / 2 - stock / 2), 0, 0.02], size: [stock, h, 0.06] },
				{ key: 'right', pos: [w / 2 - stock / 2, 0, 0.02], size: [stock, h, 0.06] },
				{ key: 'rail', pos: [0, railY, 0.02], size: [w - stock * 2, stock, 0.05] },
			].map(({ key, pos, size }) => (
				<mesh key={key} position={pos} castShadow>
					<boxGeometry args={size} />
					<meshStandardMaterial {...frame} />
				</mesh>
			))}
		</group>
	);
};
