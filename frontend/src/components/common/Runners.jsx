import * as THREE from 'three';
import { RUNNER_SIZE, FLOOR_THICKNESS } from '../../utils/modelSpec';

// Both come from utils/modelSpec so the Peak Height quoted in the UI is
// measured against what is actually drawn under the shed.
const NUM_RUNNERS = 5;

// The outer runners do not sit at the shed's edge: the shop sets each outboard
// runner in so its outside face is 6 in from the edge wall, and the other
// three spread evenly between them.
const RUNNER_INSET = 0.5;

/**
 * Runners + Floor Foundation Component
 *
 * Renders 5 longitudinal 4×4 pressure-treated runners running the full shed
 * length, evenly spaced across the width, topped with a floor deck panel.
 *
 * Coordinate convention (matches ShedWall):
 *   Y = 0  — shed floor / top of deck / bottom of walls
 *   Y < 0  — below floor (runners, ground)
 */
export const Runners = ({
	width,
	length,
	foundationColor = '#6B4C2A', // pressure-treated wood tone
}) => {
	// Floor deck: thin panel sitting just below Y=0 so its top face is flush with wall bottoms
	const floorY = -FLOOR_THICKNESS / 2;
	// Runners run under the floor; their tops touch the floor bottom
	const runnerY = -FLOOR_THICKNESS - RUNNER_SIZE / 2;
	// 5 beams between the two inset outboard runners
	const outerX = width / 2 - RUNNER_INSET - RUNNER_SIZE / 2;
	const xPositions = Array.from({ length: NUM_RUNNERS }, (_, i) =>
		-outerX + i * ((2 * outerX) / (NUM_RUNNERS - 1))
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

			{/* 5 longitudinal 4×4 runners */}
			{xPositions.map((x, i) => (
				<mesh
					key={i}
					position={[x, runnerY, 0]}
					castShadow
					receiveShadow
				>
					<boxGeometry args={[RUNNER_SIZE, RUNNER_SIZE, length]} />
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
