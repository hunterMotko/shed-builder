import { useRef, useEffect, useMemo } from 'react';
import { useShedStore } from '../../store/shedStore';
import { WALL_SIDES, routePlacements } from '../../utils/wallSides';
import { overlayDesign } from '../../utils/design';
import { gableRoofRise } from '../../utils/roofGeometry';
import { ShedWall } from '../shed/walls/ShedWall';
import { GableRoof } from '../shed/roofs/GableRoof';
import { roofOverhangFt } from '../../utils/roofGeometry';
import { GableEnd } from '../shed/roofs/GableEnd';
import { octagonForEnd } from '../../utils/gableEndOpenings';
import { carriesAttachment, attachmentValue } from '../../utils/dependentOptions';
import { Porch } from '../shed/extras/Porch';
import { Ramp } from '../shed/extras/Ramp';
import { Runners } from '../common/Runners';
import { GableTrim } from '../shed/trim/GableTrim';

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

	// The rafters are cut to one pitch, so the rise follows the span. This was
	// a flat 4ft, which quietly changed the pitch with the width (issue #29).
	const roofHeight = gableRoofRise(width);
	// The soffit and fascia box the shop builds: 6 5/8 in, or 4 7/8 in at 16 wide.
	const overhang = roofOverhangFt('Gable', width);

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

	// A ramp meets a garage door, so it follows that door's Placement rather
	// than sitting centred on a wall (issue #44).
	const rampDoor = useMemo(
		() => placements.find((p) => p.type === 'garage_door') ?? null,
		[placements]
	);

	// An octagon is bought per gable end, so each end is resolved separately.
	const octagons = useMemo(
		() => ({ front: octagonForEnd('front', options), back: octagonForEnd('back', options) }),
		[options]
	);

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
					options={options}
				/>
			))}

			{/* Triangular gable ends */}
			<GableEnd
				side="front"
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofHeight={roofHeight}
				color={color}
				sidingTexture={sidingTexture}
				octagon={octagons.front}
				trimColor={trimColor}
			/>
			<GableEnd
				side="back"
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofHeight={roofHeight}
				color={color}
				sidingTexture={sidingTexture}
				octagon={octagons.back}
				trimColor={trimColor}
			/>

			<GableTrim
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				trimColor={trimColor}
			/>

			{/* Roof */}
			<GableRoof
				shedWidth={width}
				shedLength={length}
				wallHeight={wallHeight}
				roofHeight={roofHeight}
				roofColor={roofColor}
				roofMaterial={roofMaterial}
				skylight={options.skylight}
				overhang={overhang}
			/>

			{/* Foundation: floor deck + 5 longitudinal runners */}
			<Runners
				width={width}
				length={length}
			/>

			{/* Optional ramp */}
			{carriesAttachment('ramp', rampDoor, options) && (
				<Ramp
					shedWidth={width}
					shedLength={length}
					wallHeight={wallHeight}
					placement={rampDoor}
					wall="front"
					size={attachmentValue('ramp', rampDoor, options)}
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
