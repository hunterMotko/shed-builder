import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShedStore } from '../../store/shedStore';
import { csgModifier } from '../../utils/csgOperations';
import { STANDARD_FOUNDATION } from '../../utils/roofGeometry';
import { Skids } from '../common/Skids';
import { DoorFrame } from '../common/DoorFrame';
import { WindowFrame } from '../common/WindowFrame';
import { DoorObject } from '../common/DoorObject';
import { WindowObject } from '../common/WindowObject';

/**
 * GableShed (Gable-specific) Component
 *
 * Renders a realistic Gable roof shed with:
 * - Individual skid beams foundation
 * - Rectangular walls with triangular gable ends
 * - Simple pitched roof
 * - Integrated door/window openings via CSG
 * - T1-11 siding and corrugated metal textures
 */
export const GableShed = ({
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
	const roofHeight = 4;
	const halfWidth = width / 2;
	const halfLength = length / 2;

	// Foundation dimensions
	const foundationHeight = STANDARD_FOUNDATION.height;
	const foundationOverhang = STANDARD_FOUNDATION.overhang;
	const foundationColor = STANDARD_FOUNDATION.color;

	// Trim dimensions
	const windowDoorTrimWidth = 0.25; // ~3 inches

	// Gable end triangular geometry (front and back)
	const gableEndGeometry = useMemo(() => {
		const geometry = new THREE.BufferGeometry();

		// Create triangle for gable end
		// Left point, right point, peak
		const vertices = new Float32Array([
			-halfWidth, 0, 0,      // bottom-left (0)
			halfWidth, 0, 0,       // bottom-right (1)
			0, roofHeight, 0,      // peak (2)
		]);

		const indices = new Uint32Array([0, 1, 2]);

		geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
		geometry.setIndex(new THREE.BufferAttribute(indices, 1));
		geometry.computeVertexNormals();

		return geometry;
	}, [halfWidth, roofHeight]);

	// Main rectangular wall geometry
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

	// Gable roof shape using simpler, cleaner logic
	const roofShape = useMemo(() => {
		const shape = new THREE.Shape();

		// Start at bottom-left
		shape.moveTo(-halfWidth, 0);

		// Bottom line to bottom-right
		shape.lineTo(halfWidth, 0);

		// Right wall up to eave
		shape.lineTo(halfWidth, 0);

		// Draw to peak
		shape.lineTo(0, roofHeight);

		// Left side back down (close the triangle)
		shape.lineTo(-halfWidth, 0);

		// Auto-close path
		shape.closePath();

		return shape;
	}, [halfWidth, roofHeight]);

	// Extrude settings
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

			{/* ========== MAIN WALL BOX (Rectangular section) ========== */}
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

			{/* ========== GABLE END TRIANGLES (Front) ========== */}
			<mesh
				name="gableFront"
				position={[0, wallHeight, halfLength]}
				castShadow
				receiveShadow
			>
				<primitive object={gableEndGeometry} attach="geometry" />
				<shaderMaterial
					args={[verticalSidingShader]}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* ========== GABLE END TRIANGLES (Back) ========== */}
			<mesh
				name="gableBack"
				position={[0, wallHeight, -halfLength]}
				castShadow
				receiveShadow
			>
				<primitive object={gableEndGeometry} attach="geometry" />
				<shaderMaterial
					args={[verticalSidingShader]}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* ========== ROOF GEOMETRY (Single triangular pitch) ========== */}
			<mesh
				name="shedRoof"
				position={[0, wallHeight, -length / 2]}
				castShadow
				receiveShadow
			>
				<extrudeGeometry args={[roofShape, extrudeSettings]} />
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
