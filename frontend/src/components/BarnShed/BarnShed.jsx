import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShedStore } from '../../store/shedStore';
import { csgModifier } from '../../utils/csgOperations';
import {
	STANDARD_FOUNDATION,
} from '../../utils/roofGeometry';
import { Skids } from '../common/Skids';
import { DoorFrame } from '../common/DoorFrame';
import { WindowFrame } from '../common/WindowFrame';
import { DoorObject } from '../common/DoorObject';
import { WindowObject } from '../common/WindowObject';

/**
 * BarnShed (Gambrel-specific) Component
 *
 * Renders a realistic Gambrel roof barn with:
 * - Individual skid beams foundation
 * - Simple BoxGeometry walls with T1-11 siding detail
 * - Proper dual-roof structure (lower 5:12, upper 10:12 pitch)
 * - Integrated door/window openings via CSG
 */
export const BarnShed = ({
	width = 10,
	length = 12,
	wallHeight = 8,
	color = '#8B4513',
	roofColor = '#2F4F4F',
	onShedMeshReady = null,
}) => {
	const groupRef = useRef();
	const mainWallRef = useRef();
	const placements = useShedStore((state) => state.placements);
	const trimColor = useShedStore((state) => state.trimColor);
	const [modifiedGeometry, setModifiedGeometry] = useState(null);

	// Structural dimensions
	const roofHeight = 4; // Total roof height from wall top to peak
	const knuckleHeightRatio = 0.5; // Knuckle at 50% of roof height
	const halfWidth = width / 2;
	const halfLength = length / 2;

	// Foundation dimensions
	const foundationHeight = STANDARD_FOUNDATION.height;
	const foundationOverhang = STANDARD_FOUNDATION.overhang;
	const foundationColor = STANDARD_FOUNDATION.color;

	// Trim dimensions
	const windowDoorTrimWidth = 0.25; // ~3 inches

	// Main wall geometry - simple box from ground to wallHeight
	const wallGeometry = useMemo(() => {
		return new THREE.BoxGeometry(width, wallHeight, length);
	}, [width, wallHeight, length]);

	// Apply CSG operations for door/window cutouts
	useEffect(() => {
		if (placements.length > 0 && wallGeometry) {
			try {
				const baseGeometry = wallGeometry.clone();
				const modifiedGeo = csgModifier.applyAllPlacements(
					baseGeometry,
					placements,
					{ width, length, wallHeight }
				);
				setModifiedGeometry(modifiedGeo);
			} catch (error) {
				console.error('Error applying CSG operations:', error);
				setModifiedGeometry(null);
			}
		} else {
			setModifiedGeometry(null);
		}
	}, [placements, wallGeometry]);

	// Notify parent when mesh is ready
	useEffect(() => {
		if (mainWallRef.current && onShedMeshReady) {
			onShedMeshReady(mainWallRef.current, { width, length, wallHeight });
		}
	}, [width, length, wallHeight, onShedMeshReady]);

	// Calculated dimensions for gambrel roof
	const knuckleHeight = roofHeight * knuckleHeightRatio;
	const peakHeight = roofHeight;

	// Gambrel lower roof shape (trapezoid)
	const gambrelLowerRoofShape = useMemo(() => {
		const shape = new THREE.Shape();
		// Lower roof: trapezoid from wall to knuckle point
		// Bottom corners
		shape.moveTo(-halfWidth, 0);
		shape.lineTo(halfWidth, 0);

		// Slope inward to knuckle point (5:12 pitch angle)
		const knuckleInset = halfWidth * 0.2; // ~20% inset for steeper lower slope
		shape.lineTo(halfWidth - knuckleInset, knuckleHeight);
		shape.lineTo(-halfWidth + knuckleInset, knuckleHeight);

		shape.closePath();
		return shape;
	}, [halfWidth, knuckleHeight]);

	// Gambrel upper roof shape (triangle)
	const gambrelUpperRoofShape = useMemo(() => {
		const shape = new THREE.Shape();
		// Upper roof: triangle from knuckle to peak
		const knuckleInset = halfWidth * 0.2;

		// Knuckle points
		shape.moveTo(-halfWidth + knuckleInset, knuckleHeight);
		shape.lineTo(halfWidth - knuckleInset, knuckleHeight);

		// Draw to peak (10:12 pitch angle - gentler)
		shape.lineTo(0, peakHeight);

		shape.closePath();
		return shape;
	}, [halfWidth, knuckleHeight, peakHeight]);

	const extrudeSettings = useMemo(
		() => ({
			depth: length,
			bevelEnabled: false,
		}),
		[length]
	);

	// Vertical siding shader for T1-11 effect
	const verticalSidingShader = useMemo(
		() => ({
			uniforms: {
				color: { value: new THREE.Color(color) },
			},
			vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
			fragmentShader: `
        varying vec3 vPos;
        uniform vec3 color;
        void main() {
          // Create vertical rib pattern every 6 inches (~0.5 feet)
          float rib = mod(vPos.x * 2.0, 1.0);
          float ribEffect = smoothstep(0.4, 0.45, rib) - smoothstep(0.55, 0.6, rib);

          // Subtle darkening for vertical ribs
          vec3 ribColor = color * (1.0 - ribEffect * 0.12);
          gl_FragColor = vec4(ribColor, 1.0);
        }
      `,
		}),
		[color]
	);

	// Corrugated metal roof shader
	const corrugatedRoofShader = useMemo(
		() => ({
			uniforms: {
				color: { value: new THREE.Color(roofColor) },
			},
			vertexShader: `
        varying vec3 vPos;
        varying vec3 vNormal;
        void main() {
          vPos = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
			fragmentShader: `
        varying vec3 vPos;
        varying vec3 vNormal;
        uniform vec3 color;
        void main() {
          // Corrugated panels
          float panel = mod(vPos.x * 3.0, 1.0);
          float panelShade = smoothstep(0.0, 0.3, panel) - smoothstep(0.7, 1.0, panel);

          // Metallic corrugation
          vec3 metalColor = color * (0.85 + panelShade * 0.25);

          // Light reflection
          float reflection = dot(vNormal, vec3(0.0, 1.0, 0.5)) * 0.2;
          metalColor += vec3(reflection);

          gl_FragColor = vec4(metalColor, 1.0);
        }
      `,
		}),
		[roofColor]
	);

	return (
		<group ref={groupRef} position={[0, 0, 0]}>
			{/* ========== FOUNDATION / SKID BEAMS ========== */}
			<Skids
				width={width}
				length={length}
				wallHeight={wallHeight}
				foundationHeight={foundationHeight}
				foundationOverhang={foundationOverhang}
				foundationColor={foundationColor}
			/>

			{/* ========== MAIN WALL BOX ========== */}
			<mesh
				ref={mainWallRef}
				name="shedWalls"
				position={[0, wallHeight / 2, 0]}
				castShadow
				receiveShadow
			>
				{modifiedGeometry ? (
					<primitive object={modifiedGeometry} attach="geometry" />
				) : (
					<primitive object={wallGeometry} attach="geometry" />
				)}
				<shaderMaterial
					args={[verticalSidingShader]}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* ========== LOWER ROOF SECTION (5:12 pitch) ========== */}
			<mesh
				name="shedRoofLower"
				position={[
					0,
					wallHeight,
					-length / 2,
				]}
				castShadow
				receiveShadow
			>
				<extrudeGeometry args={[gambrelLowerRoofShape, extrudeSettings]} />
				<shaderMaterial
					args={[corrugatedRoofShader]}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* ========== UPPER ROOF SECTION (10:12 pitch) ========== */}
			<mesh
				name="shedRoofUpper"
				position={[
					0,
					wallHeight,
					-length / 2,
				]}
				castShadow
				receiveShadow
			>
				<extrudeGeometry args={[gambrelUpperRoofShape, extrudeSettings]} />
				<shaderMaterial
					args={[corrugatedRoofShader]}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* ========== DOOR & WINDOW TRIM FRAMES ========== */}
			{placements.map((placement) => {
				if (placement.type === 'door') {
					return (
						<DoorFrame
							key={`trim-${placement.id}`}
							placement={placement}
							shedDimensions={{ width, length, wallHeight }}
							trimColor={trimColor}
							trimWidth={windowDoorTrimWidth}
						/>
					);
				} else if (placement.type === 'window') {
					return (
						<WindowFrame
							key={`trim-${placement.id}`}
							placement={placement}
							shedDimensions={{ width, length, wallHeight }}
							trimColor={trimColor}
							trimWidth={windowDoorTrimWidth}
						/>
					);
				}
				return null;
			})}

			{/* ========== DOOR & WINDOW OBJECTS ========== */}
			{placements.map((placement) => {
				if (placement.type === 'door') {
					return (
						<DoorObject
							key={placement.id}
							placement={placement}
							shedDimensions={{ width, length, wallHeight }}
							trimColor={trimColor}
							wallColor={color}
						/>
					);
				} else if (placement.type === 'window') {
					return (
						<WindowObject
							key={placement.id}
							placement={placement}
							shedDimensions={{ width, length, wallHeight }}
							trimColor={trimColor}
							frameColor={trimColor}
						/>
					);
				}
				return null;
			})}
		</group>
	);
};
