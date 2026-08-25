import { useRef, useEffect, useMemo } from 'react';
import { useShedStore } from '../../store/shedStore';
import { WALL_SIDES, routePlacements } from '../../utils/wallSides';
import { ShedWall } from '../shed/walls/ShedWall';
import { GableRoof } from '../shed/roofs/GableRoof';
import { GableEnd } from '../shed/roofs/GableEnd';
import { Porch } from '../shed/extras/Porch';
import { Ramp } from '../shed/extras/Ramp';
import { Runners } from '../common/Runners';
import { GableTrim } from '../shed/trim/GableTrim';

const ROOF_HEIGHT = 4; // ft above wall top

/**
 * GableShed — composition wrapper.
 * Assembles: 4× ShedWall + 2× GableEnd + GableRoof + Runners + optional Porch.
 * All geometry and shader logic lives in the individual components.
 */
export const GableShed = ({
	width = 10,
	length = 12,
	wallHeight = 8,
	color = '#8B4513',
	roofColor = '#2F4F4F',
	onShedMeshReady = null,
}) => {
	const frontWallRef = useRef();
	const placements = useShedStore((s) => s.placements);
	const trimColor = useShedStore((s) => s.trimColor);
	const sidingTexture = useShedStore((s) => s.sidingTexture);
	const roofMaterial = useShedStore((s) => s.roofMaterial);
	const porch = useShedStore((s) => s.porch);
	const options = useShedStore((s) => s.options);
	const garageDoorStyle = useShedStore((s) => s.options.garageDoor.style ?? 'sectional');

	// Expose front-wall mesh for raycasting / placement interaction
	useEffect(() => {
		if (frontWallRef.current && onShedMeshReady) {
			onShedMeshReady(frontWallRef.current, { width, length, wallHeight });
		}
	}, [width, length, wallHeight, onShedMeshReady]);

	// Routed once per placements change, not per render: ShedWall's CSG effect
	// keys on the array it is handed, so a fresh filter() each render would
	// re-cut every opening on every render.
	const { byWall } = useMemo(() => routePlacements(placements), [placements]);

	return (
		<group name="gableShed">
			{/* Four individual walls */}
			{WALL_SIDES.map((side) => (
				<ShedWall
					key={side}
					ref={side === 'front' ? frontWallRef : undefined}
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

			{/* Triangular gable ends */}
			<GableEnd
				side="front"
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofHeight={ROOF_HEIGHT}
				color={color}
				sidingTexture={sidingTexture}
				showOctagonWindow={options.octagonWindow.enabled}
				trimColor={trimColor}
			/>
			<GableEnd
				side="back"
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofHeight={ROOF_HEIGHT}
				color={color}
				sidingTexture={sidingTexture}
				showOctagonWindow={options.octagonWindow.enabled}
				trimColor={trimColor}
			/>

			<GableTrim
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofHeight={ROOF_HEIGHT}
				trimColor={trimColor}
				overhangEave={0.5}
			/>

			{/* Roof */}
			<GableRoof
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofHeight={ROOF_HEIGHT}
				roofColor={roofColor}
				roofMaterial={roofMaterial}
				skylight={options.skylight}
				overhangEave={0.5}
			/>

			{/* Foundation: floor deck + 5 longitudinal runners */}
			<Runners
				width={width}
				length={length}
			/>

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
