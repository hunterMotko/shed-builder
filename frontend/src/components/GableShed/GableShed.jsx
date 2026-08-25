import { useRef, useEffect, useMemo } from 'react';
import { useShedStore } from '../../store/shedStore';
import { WALL_SIDES, routePlacements } from '../../utils/wallSides';
import { overlayDesign } from '../../utils/design';
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
	width: widthProp = 10,
	length: lengthProp = 12,
	wallHeight: wallHeightProp = 8,
	color: colorProp = '#8B4513',
	roofColor: roofColorProp = '#2F4F4F',
	design = null,
	onShedMeshReady = null,
}) => {
	const frontWallRef = useRef();

	const storeDesign = {
		width: widthProp,
		length: lengthProp,
		wallHeight: wallHeightProp,
		color: colorProp,
		roofColor: roofColorProp,
		placements: useShedStore((s) => s.placements),
		trimColor: useShedStore((s) => s.trimColor),
		sidingTexture: useShedStore((s) => s.sidingTexture),
		roofMaterial: useShedStore((s) => s.roofMaterial),
		porch: useShedStore((s) => s.porch),
		options: useShedStore((s) => s.options),
	};

	// A fixed Design wins over the one the customer is configuring. Pass a
	// module-level constant, not an object literal: `placements` identity is
	// what keys the CSG cut, so a fresh array each render re-cuts every opening.
	const d = overlayDesign(storeDesign, design);
	const {
		width, length, wallHeight, color, roofColor,
		placements, trimColor, sidingTexture, roofMaterial, porch, options,
	} = d;
	const garageDoorStyle = options.garageDoor.style ?? 'sectional';

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
					showShutters={options.shutters.enabled}
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
