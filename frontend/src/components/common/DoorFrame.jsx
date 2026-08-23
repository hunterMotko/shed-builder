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
	const { width, length, wallHeight } = shedDimensions;
	const { normalizedX, normalizedY, width: elemWidth, height: elemHeight, wall } = placement;
	const halfWidth = width / 2;
	const halfLength = length / 2;

	// Calculate position
	let position;
	let rotation;

	switch (wall) {
		case 'front':
			position = [
				-halfWidth + normalizedX * width,
				-wallHeight / 2 + normalizedY * wallHeight,
				halfLength + trimWidth / 2,
			];
			rotation = [0, 0, 0];
			break;
		case 'back':
			position = [
				-halfWidth + normalizedX * width,
				-wallHeight / 2 + normalizedY * wallHeight,
				-halfLength - trimWidth / 2,
			];
			rotation = [0, 0, 0];
			break;
		case 'left':
			position = [
				-halfWidth - trimWidth / 2,
				-wallHeight / 2 + normalizedY * wallHeight,
				-halfLength + normalizedX * length,
			];
			rotation = [0, Math.PI / 2, 0];
			break;
		case 'right':
			position = [
				halfWidth + trimWidth / 2,
				-wallHeight / 2 + normalizedY * wallHeight,
				-halfLength + normalizedX * length,
			];
			rotation = [0, Math.PI / 2, 0];
			break;
		default:
			position = [0, 0, 0];
			rotation = [0, 0, 0];
	}

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
