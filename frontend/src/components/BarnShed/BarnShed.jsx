import { useEffect } from 'react';
import { useShedStore } from '../../store/shedStore';
import { ShedWall } from '../shed/walls/ShedWall';
import { GambrelRoof } from '../shed/roofs/GambrelRoof';
import { Porch } from '../shed/extras/Porch';
import { Ramp } from '../shed/extras/Ramp';
import { Runners } from '../common/Runners';
import { BarnTrim } from '../shed/trim/BarnTrim';

// Front/back faces are provided by GambrelRoof's ExtrudeGeometry end-caps (siding material).
// Rendering front/back ShedWalls would create Z-fighting with those end-caps.
const WALL_SIDES = ['left', 'right'];

/**
 * BarnShed — composition wrapper.
 * Assembles: 2× ShedWall (left/right) + GambrelRoof + Runners + optional Porch.
 * Front/back barn faces come from GambrelRoof end-caps (siding shader, groups 0 & 1).
 */
export const BarnShed = ({
	width = 10,
	length = 12,
	wallHeight = 8,
	color = '#8B4513',
	roofColor = '#2F4F4F',
	onShedMeshReady = null,
}) => {
	const placements = useShedStore((s) => s.placements);
	const trimColor = useShedStore((s) => s.trimColor);
	const sidingTexture = useShedStore((s) => s.sidingTexture);
	const roofMaterial = useShedStore((s) => s.roofMaterial);
	const roofLowerPitch = useShedStore((s) => s.roofLowerPitch);
	const roofUpperPitch = useShedStore((s) => s.roofUpperPitch);
	const porch = useShedStore((s) => s.porch);
	const options = useShedStore((s) => s.options);
	const garageDoorStyle = useShedStore((s) => s.options.garageDoor.style ?? 'sectional');
	useEffect(() => {
		// Barn has no discrete front wall mesh — placement raycasting not yet wired
		if (onShedMeshReady) onShedMeshReady(null, { width, length, wallHeight });
	}, [width, length, wallHeight, onShedMeshReady]);

	return (
		<group name="barnShed">
			{/* Four individual walls */}
			{WALL_SIDES.map((side) => (
				<ShedWall
					key={side}
					side={side}
					shedWidth={width}
					shedLength={length}
					wallHeight={wallHeight}
					color={color}
					sidingTexture={sidingTexture}
					trimColor={trimColor}
					placements={placements.filter((p) => p.wall === side)}
					doorStyle={garageDoorStyle}
				/>
			))}

			{/* Optional ramp */}
			{options.ramp.enabled && (
				<Ramp
					shedWidth={width}
					shedLength={length}
					wallHeight={wallHeight}
					wall="front"
					size={options.ramp.size}
				/>
			)}

			{/* Gambrel roof — end-caps use siding material as barn gable faces */}
			<GambrelRoof
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofLowerPitch={roofLowerPitch}
				roofUpperPitch={roofUpperPitch}
				roofColor={roofColor}
				roofMaterial={roofMaterial}
				color={color}
				sidingTexture={sidingTexture}
				skylight={options.skylight}
				overhangEave={0.5}
			/>

			<BarnTrim
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofLowerPitch={roofLowerPitch}
				trimColor={trimColor}
				overhangEave={0.5}
			/>

			{/* Foundation: floor deck + 5 longitudinal runners */}
			<Runners
				width={width}
				length={length}
			/>

			{/* Optional porch */}
			{porch.enabled && (
				<Porch
					shedWidth={width}
					shedLength={length}
					wallHeight={wallHeight}
					wall={porch.wall}
					depth={porch.depth}
					color={color}
					roofColor={roofColor}
					roofMaterial={roofMaterial}
				/>
			)}
		</group>
	);
};
