import * as THREE from 'three';

// 4×4 nominal lumber: 3.5" actual = ~0.292 ft, rounded to 0.333 for visual clarity
const SKID_SIZE = 0.333;
// Nominal floor deck thickness (~1.5" T&G planks)
const FLOOR_THICKNESS = 0.125;
const NUM_SKIDS = 5;

/**
 * Skids + Floor Foundation Component
 *
 * Renders 5 longitudinal 4×4 pressure-treated skid beams running the full shed
 * length, evenly spaced across the width, topped with a floor deck panel.
 *
 * Coordinate convention (matches ShedWall):
 *   Y = 0  — shed floor / top of deck / bottom of walls
 *   Y < 0  — below floor (skids, ground)
 */
export const Skids = ({
	width,
	length,
	foundationColor = '#6B4C2A', // pressure-treated wood tone
}) => {
	// Floor deck: thin panel sitting just below Y=0 so its top face is flush with wall bottoms
	const floorY = -FLOOR_THICKNESS / 2;
	// Skids run under the floor; their tops touch the floor bottom
	const skidY = -FLOOR_THICKNESS - SKID_SIZE / 2;
	// 5 beams evenly spread across the full shed width
	const xPositions = Array.from({ length: NUM_SKIDS }, (_, i) =>
		-width / 2 + i * (width / (NUM_SKIDS - 1))
	);
	return (
		<group name="foundationGroup">
			{/* Floor deck */}
			<mesh
				position={[0, floorY, 0]}
				receiveShadow
			>
				<boxGeometry args={[width, FLOOR_THICKNESS, length]} />
				<meshStandardMaterial
					color="#C8A96E"
					roughness={0.85}
					metalness={0.0}
				/>
			</mesh>

			{/* 5 longitudinal 4×4 skid beams */}
			{xPositions.map((x, i) => (
				<mesh
					key={i}
					position={[x, skidY, 0]}
					castShadow
					receiveShadow
				>
					<boxGeometry args={[SKID_SIZE, SKID_SIZE, length]} />
					<meshStandardMaterial
						color={foundationColor}
						roughness={0.8}
						metalness={0.0}
					/>
				</mesh>
			))}
		</group>
	);
};
