import { useRef, useEffect } from 'react';
import { useShedStore } from '../../store/shedStore';
import { ShedWall } from '../shed/walls/ShedWall';
import { GableRoof } from '../shed/roofs/GableRoof';
import { GableEnd } from '../shed/roofs/GableEnd';
import { Porch } from '../shed/extras/Porch';
import { Ramp } from '../shed/extras/Ramp';
import { Skids } from '../common/Skids';
import { GableTrim } from '../shed/trim/GableTrim';

const WALL_SIDES = ['front', 'back', 'left', 'right'];
const ROOF_HEIGHT = 4; // ft above wall top

/**
 * GableShed — composition wrapper.
 * Assembles: 4× ShedWall + 2× GableEnd + GableRoof + Skids + optional Porch.
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
	const addOns = useShedStore((s) => s.addOns);
	const garageDoorStyle = useShedStore((s) => s.addOns.garageDoor.style ?? 'sectional');

	// Expose front-wall mesh for raycasting / placement interaction
	useEffect(() => {
		if (frontWallRef.current && onShedMeshReady) {
			onShedMeshReady(frontWallRef.current, { width, length, wallHeight });
		}
	}, [width, length, wallHeight, onShedMeshReady]);

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
					placements={placements.filter((p) => p.wall === side)}
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
				showOctagonWindow={addOns.octagonWindow.enabled}
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
				showOctagonWindow={addOns.octagonWindow.enabled}
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
				skylight={addOns.skylight}
				overhangEave={0.5}
			/>

			{/* Foundation: floor deck + 5 longitudinal skid beams */}
			<Skids
				width={width}
				length={length}
			/>

			{/* Optional ramp */}
			{addOns.ramp.enabled && (
				<Ramp
					shedWidth={width}
					shedLength={length}
					wallHeight={wallHeight}
					wall="front"
					size={addOns.ramp.size}
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
