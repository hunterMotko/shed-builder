import { useEffect, useMemo } from 'react';
import { useShedStore } from '../../store/shedStore';
import { WALL_SIDES, routePlacements } from '../../utils/wallSides';
import { overlayDesign } from '../../utils/design';
import { ShedWall } from '../shed/walls/ShedWall';
import { GambrelRoof } from '../shed/roofs/GambrelRoof';
import { BarnEnd } from '../shed/roofs/BarnEnd';
import { roofOverhangFt } from '../../utils/roofGeometry';
import { Porch } from '../shed/extras/Porch';
import { Ramp } from '../shed/extras/Ramp';
import { Runners } from '../common/Runners';
import { BarnTrim } from '../shed/trim/BarnTrim';

/**
 * BarnShed — composition wrapper.
 * Assembles: 4× ShedWall + GambrelRoof + Runners + optional Porch.
 *
 * The walls run floor to eave on all four sides, the same as GableShed. Above
 * the eave the barn's front and back faces are `BarnEnd` — real siding at
 * ±shedLength/2, disjoint from the walls in Y and meeting them at the eave
 * (ADR-0010). They used to be the roof prism's own end caps, borrowed and drawn
 * with the siding shader; the roof is a slab now and has no caps to lend.
 */
export const BarnShed = ({
	width: widthProp = 10,
	length: lengthProp = 12,
	wallHeight: wallHeightProp = 8,
	color: colorProp = '#8B4513',
	roofColor: roofColorProp = '#2F4F4F',
	design = null,
	onShedMeshReady = null,
}) => {
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
		roofLowerPitch: useShedStore((s) => s.roofLowerPitch),
		roofUpperPitch: useShedStore((s) => s.roofUpperPitch),
		porch: useShedStore((s) => s.porch),
		options: useShedStore((s) => s.options),
	};

	// A fixed Design wins over the one the customer is configuring. Pass a
	// module-level constant, not an object literal: `placements` identity is
	// what keys the CSG cut, so a fresh array each render re-cuts every opening.
	const d = overlayDesign(storeDesign, design);
	const {
		width, length, wallHeight, color, roofColor,
		placements, trimColor, sidingTexture, roofMaterial,
		roofLowerPitch, roofUpperPitch, porch, options,
	} = d;
	const garageDoorStyle = options.garageDoor.style ?? 'sectional';
	// A barn has no soffit box: the panel runs 2 in past and finishes in J-channel.
	const overhang = roofOverhangFt('Barn', width);

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
					showShutters={options.shutters.enabled}
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

			{/* Gambrel end walls above the eave */}
			{['front', 'back'].map((side) => (
				<BarnEnd
					key={side}
					side={side}
					shedWidth={width}
					shedLength={length}
					wallHeight={wallHeight}
					roofLowerPitch={roofLowerPitch}
					roofUpperPitch={roofUpperPitch}
					color={color}
					sidingTexture={sidingTexture}
					showOctagonWindow={options.octagonWindow.enabled}
					trimColor={trimColor}
				/>
			))}

			<GambrelRoof
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofLowerPitch={roofLowerPitch}
				roofUpperPitch={roofUpperPitch}
				roofColor={roofColor}
				roofMaterial={roofMaterial}
				skylight={options.skylight}
				overhang={overhang}
			/>

			<BarnTrim
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofLowerPitch={roofLowerPitch}
				roofUpperPitch={roofUpperPitch}
				trimColor={trimColor}
				overhangEave={overhang}
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
