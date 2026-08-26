import { openingTransform } from '../../utils/wallOpenings';

/**
 * DoorFrame (Trim) Component
 *
 * Renders a trim frame around door openings.
 * Reusable across both Gable and Gambrel styles.
 */
export const DoorFrame = ({
	placement,
	shedDimensions,
	trimColor = '#654321',
	trimWidth = 0.25,
}) => {
	const { width: elemWidth, height: elemHeight } = placement;

	// Trim sits half its own stock proud of the wall face.
	const { position, rotation } = openingTransform(placement, shedDimensions, trimWidth / 2);

	// Group origin is at the CENTER of the opening (matching CSG localY).
	// All trim offsets are relative to that center.
	return (
		<group position={position} rotation={rotation}>
			{/* Top trim — sits above the opening center by elemHeight/2 */}
			<mesh position={[0, elemHeight / 2 + trimWidth / 2, 0]} castShadow>
				<boxGeometry args={[elemWidth + trimWidth * 2, trimWidth, trimWidth]} />
				<meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.25} />
			</mesh>

			{/* Bottom trim — sits below the opening center by elemHeight/2 */}
			<mesh position={[0, -(elemHeight / 2 + trimWidth / 2), 0]} castShadow>
				<boxGeometry args={[elemWidth + trimWidth * 2, trimWidth, trimWidth]} />
				<meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.25} />
			</mesh>

			{/* Left trim — centered vertically at group origin */}
			<mesh position={[-(elemWidth / 2 + trimWidth / 2), 0, 0]} castShadow>
				<boxGeometry args={[trimWidth, elemHeight + trimWidth * 2, trimWidth]} />
				<meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.25} />
			</mesh>

			{/* Right trim — centered vertically at group origin */}
			<mesh position={[elemWidth / 2 + trimWidth / 2, 0, 0]} castShadow>
				<boxGeometry args={[trimWidth, elemHeight + trimWidth * 2, trimWidth]} />
				<meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.25} />
			</mesh>
		</group>
	);
};

/**
 * PropTypes documentation:
 * - placement: { normalizedX, normalizedY, width, height, wall } - Door position and size
 * - shedDimensions: { width, length, wallHeight } - Shed measurements
 * - trimColor: Trim color hex code (default: #654321)
 * - trimWidth: Trim width in feet (default: 0.25)
 */
