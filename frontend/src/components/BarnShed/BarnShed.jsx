import { useEffect, useMemo } from 'react';
import { useShedStore } from '../../store/shedStore';
import { WALL_SIDES, routePlacements } from '../../utils/wallSides';
import { ShedWall } from '../shed/walls/ShedWall';
import { GambrelRoof } from '../shed/roofs/GambrelRoof';
import { Porch } from '../shed/extras/Porch';
import { Ramp } from '../shed/extras/Ramp';
import { Runners } from '../common/Runners';
import { BarnTrim } from '../shed/trim/BarnTrim';

/**
 * BarnShed — composition wrapper.
 * Assembles: 4× ShedWall + GambrelRoof + Runners + optional Porch.
 *
 * The walls run floor to eave on all four sides, the same as GableShed. Above
 * the eave the barn's front and back faces are the GambrelRoof end-caps
 * (siding shader, groups 0 & 1), which sit at ±shedLength/2 — flush with the
 * outer face of the front/back walls and disjoint from them in Y, so there is
 * nothing to Z-fight (ADR-0010).
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

	// Routed once per placements change, not per render: ShedWall's CSG effect
	// keys on the array it is handed, so a fresh filter() each render would
	// re-cut every opening on every render.
	const { byWall } = useMemo(() => routePlacements(placements), [placements]);

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
					placements={byWall[side]}
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
