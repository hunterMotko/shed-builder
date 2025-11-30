import * as THREE from 'three';
import { STANDARD_FOUNDATION } from '../../utils/roofGeometry';

/**
 * Skids (Foundation) Component
 *
 * Renders individual skid beams that ground the shed structure.
 * Multiple separate beams (3-4) provide realistic construction detail.
 * Reusable across both Gable and Gambrel styles.
 */
export const Skids = ({
	width,
	length,
	wallHeight,
	foundationHeight = STANDARD_FOUNDATION.height,
	foundationOverhang = STANDARD_FOUNDATION.overhang,
	foundationColor = STANDARD_FOUNDATION.color,
}) => {
	// Skid dimensions (realistic proportions)
	const skidWidth = 0.333; // ~4 inches
	const skidDepth = 0.5; // ~6 inches
	const skidHeight = foundationHeight;

	// Calculate the overhang for proper positioning
	const halfWidth = width / 2;
	const halfLength = length / 2;

	// Create 3 or 4 evenly-spaced skid beams
	// For 3 beams: front, center, back
	// Spacing calculated to span the full length with even gaps
	const numSkids = 3;
	const skidPositions = [];
	const spacing = length / (numSkids - 1);

	for (let i = 0; i < numSkids; i++) {
		skidPositions.push(-halfLength + i * spacing);
	}

	return (
		<group name="skidsGroup" position={[0, -wallHeight / 2 - skidHeight / 2, 0]}>
			{/* Front-left skid beam */}
			<mesh position={[-halfWidth - skidWidth / 2, 0, skidPositions[0]]} castShadow receiveShadow>
				<boxGeometry args={[skidWidth, skidHeight, skidDepth]} />
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.7}
					metalness={0.0}
				/>
			</mesh>

			{/* Front-center skid beam */}
			<mesh position={[0, 0, skidPositions[0]]} castShadow receiveShadow>
				<boxGeometry args={[skidWidth, skidHeight, skidDepth]} />
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.7}
					metalness={0.0}
				/>
			</mesh>

			{/* Front-right skid beam */}
			<mesh position={[halfWidth + skidWidth / 2, 0, skidPositions[0]]} castShadow receiveShadow>
				<boxGeometry args={[skidWidth, skidHeight, skidDepth]} />
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.7}
					metalness={0.0}
				/>
			</mesh>

			{/* Center-left skid beam */}
			<mesh position={[-halfWidth - skidWidth / 2, 0, skidPositions[1]]} castShadow receiveShadow>
				<boxGeometry args={[skidWidth, skidHeight, skidDepth]} />
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.7}
					metalness={0.0}
				/>
			</mesh>

			{/* Center-center skid beam */}
			<mesh position={[0, 0, skidPositions[1]]} castShadow receiveShadow>
				<boxGeometry args={[skidWidth, skidHeight, skidDepth]} />
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.7}
					metalness={0.0}
				/>
			</mesh>

			{/* Center-right skid beam */}
			<mesh position={[halfWidth + skidWidth / 2, 0, skidPositions[1]]} castShadow receiveShadow>
				<boxGeometry args={[skidWidth, skidHeight, skidDepth]} />
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.7}
					metalness={0.0}
				/>
			</mesh>

			{/* Back-left skid beam */}
			<mesh position={[-halfWidth - skidWidth / 2, 0, skidPositions[2]]} castShadow receiveShadow>
				<boxGeometry args={[skidWidth, skidHeight, skidDepth]} />
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.7}
					metalness={0.0}
				/>
			</mesh>

			{/* Back-center skid beam */}
			<mesh position={[0, 0, skidPositions[2]]} castShadow receiveShadow>
				<boxGeometry args={[skidWidth, skidHeight, skidDepth]} />
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.7}
					metalness={0.0}
				/>
			</mesh>

			{/* Back-right skid beam */}
			<mesh position={[halfWidth + skidWidth / 2, 0, skidPositions[2]]} castShadow receiveShadow>
				<boxGeometry args={[skidWidth, skidHeight, skidDepth]} />
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.7}
					metalness={0.0}
				/>
			</mesh>
		</group>
	);
};

/**
 * PropTypes documentation:
 * - width: Shed width in feet
 * - length: Shed length in feet
 * - wallHeight: Wall height in feet
 * - foundationHeight: Foundation height in feet (default: 1.5)
 * - foundationOverhang: Overhang on all sides in feet (default: 0.5)
 * - foundationColor: Foundation color hex code (default: #8B7355)
 */
