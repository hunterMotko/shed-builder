import { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useShedStore } from '../store/shedStore';
import { csgModifier } from '../utils/csgOperations';
import { getEffectiveTrimColor } from '../utils/advancedColorUtils';
import {
	calculateGambrelProfile,
	calculateKnucklePoint,
	createLowerRoofShape,
	createUpperRoofShape,
	getRakeTrimAngles,
	calculateSlopeLength,
	calculateFoundationDimensions,
	calculateGableRakeAngle,
	calculateGableRakeTrimLength,
	STANDARD_GAMBREL,
	STANDARD_FOUNDATION,
} from '../utils/roofGeometry';
import { mergeWallWithRibs } from '../utils/wallRibGeometry';
import { DoorObject } from './DoorObject';
import { WindowObject } from './WindowObject';

/**
 * Ultra-refined Shed component with realistic construction details,
 * CSG-based geometry, and comprehensive trim system
 */
export const Shed = ({
	width = 10,
	length = 12,
	wallHeight = 8,
	style = 'Gable',
	color = '#8B4513',
	roofColor = '#2F4F4F',
	onShedMeshReady = null,
}) => {
	const groupRef = useRef();
	const mainWallRef = useRef();
	const placements = useShedStore((state) => state.placements);
	const trimColor = useShedStore((state) => state.trimColor);
	const trimColorMode = useShedStore((state) => state.trimColorMode);
	const trimAutoMode = useShedStore((state) => state.trimAutoMode);
	const [modifiedGeometry, setModifiedGeometry] = useState(null);

	const roofHeight = 3;
	// Trim dimensions (in feet)
	const cornerTrimWidth = 0.35; // ~4 inches
	const cornerTrimDepth = 0.125; // ~1.5 inches
	const fasciaTrimHeight = 0.5;
	const windowDoorTrimWidth = 0.5; // ~6 inches
	const roofOverhang = 1.5;
	// Foundation dimensions
	const foundationHeight = STANDARD_FOUNDATION.height;
	const foundationOverhang = STANDARD_FOUNDATION.overhang;
	const foundationColor = STANDARD_FOUNDATION.color;
	// Gambrel roof configuration
	const lowerRoofPitch = STANDARD_GAMBREL.lowerPitch; // 5:12
	const upperRoofPitch = STANDARD_GAMBREL.upperPitch; // 10:12
	const halfWidth = width / 2;
	const halfLength = length / 2;
	// Calculate knuckle point for gambrel roofs
	const gambrelKnuckle = useMemo(
		() => calculateKnucklePoint(halfWidth, wallHeight, lowerRoofPitch, roofHeight),
		[halfWidth, wallHeight, roofHeight]
	);
	// Rake trim angles
	const rakeAngles = useMemo(
		() => getRakeTrimAngles(lowerRoofPitch, upperRoofPitch),
		[]
	);
	// Calculate slope lengths for rake trim sizing
	const lowerSlopeLength = useMemo(
		() => calculateSlopeLength(halfWidth, lowerRoofPitch),
		[halfWidth]
	);
	const upperSlopeLength = useMemo(
		() => calculateSlopeLength(halfWidth, upperRoofPitch),
		[halfWidth]
	);
	// Wall shape with clean rectangular profile
	const wallShape = useMemo(() => {
		const shape = new THREE.Shape();
		shape.moveTo(-halfWidth, 0);
		shape.lineTo(halfWidth, 0);
		shape.lineTo(halfWidth, wallHeight);
		shape.lineTo(-halfWidth, wallHeight);
		shape.closePath();
		return shape;
	}, [width, wallHeight, halfWidth]);
	// Base wall geometry (before CSG operations)
	const baseWallGeometry = useMemo(() => {
		const extrudeSettings = {
			depth: length,
			bevelEnabled: false,
		};
		return new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
	}, [wallShape, length]);
	// Wall geometry with T1-11 rib details
	const ribmedWallGeometry = useMemo(() => {
		try {
			return mergeWallWithRibs(baseWallGeometry.clone(), width, wallHeight);
		} catch (error) {
			console.warn('Failed to merge wall with ribs, using base geometry:', error);
			return baseWallGeometry.clone();
		}
	}, [baseWallGeometry, width, wallHeight]);
	// Gable rake trim calculations (only used when style !== 'Gambrel')
	const gableRakeAngle = useMemo(
		() => calculateGableRakeAngle(halfWidth, roofHeight),
		[halfWidth, roofHeight]
	);
	const gableRakeTrimLength = useMemo(
		() => calculateGableRakeTrimLength(halfWidth, roofHeight),
		[halfWidth, roofHeight]
	);
	// Calculate effective trim color with advanced contrast logic
	const effectiveTrimColor = useMemo(
		() =>
			getEffectiveTrimColor(
				trimColor,
				trimColorMode,
				color,
				roofColor,
				trimAutoMode
			),
		[trimColor, trimColorMode, color, roofColor, trimAutoMode]
	);
	// Apply CSG operations for door/window cutouts
	useEffect(() => {
		if (placements.length > 0 && ribmedWallGeometry) {
			try {
				// Use ribbed geometry as base for CSG operations
				const baseGeometry = ribmedWallGeometry.clone();
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
	}, [placements, width, length, wallHeight, ribmedWallGeometry]);
	// Notify parent when mesh is ready
	useEffect(() => {
		if (mainWallRef.current && onShedMeshReady) {
			onShedMeshReady(mainWallRef.current, { width, length, wallHeight });
		}
	}, [width, length, wallHeight, onShedMeshReady]);
	// Roof shape (used for Gable style only; Gambrel uses dual shapes below)
	const roofShape = useMemo(() => {
		if (style === 'Gambrel') {
			// Gambrel uses separate shapes below, return dummy shape
			const shape = new THREE.Shape();
			shape.moveTo(-halfWidth, wallHeight);
			shape.lineTo(halfWidth, wallHeight);
			shape.lineTo(0, wallHeight + roofHeight);
			shape.closePath();
			return shape;
		}
		// Gable style: simple triangular roof
		const shape = new THREE.Shape();
		shape.moveTo(-halfWidth, wallHeight);
		shape.lineTo(halfWidth, wallHeight);
		const peakY = wallHeight + roofHeight;
		shape.lineTo(0, peakY);
		shape.lineTo(-halfWidth, wallHeight);
		shape.closePath();
		return shape;
	}, [width, wallHeight, roofHeight, style, halfWidth]);
	// Gambrel-specific roof shapes (lower and upper sections)
	const gambrelLowerRoofShape = useMemo(() => {
		if (style !== 'Gambrel') return null;
		return createLowerRoofShape(halfWidth, wallHeight, gambrelKnuckle.knuckleY);
	}, [style, halfWidth, wallHeight, gambrelKnuckle]);
	const gambrelUpperRoofShape = useMemo(() => {
		if (style !== 'Gambrel') return null;
		const peakY = wallHeight + roofHeight;
		return createUpperRoofShape(halfWidth, gambrelKnuckle.knuckleY, peakY);
	}, [style, halfWidth, wallHeight, roofHeight, gambrelKnuckle]);
	const extrudeSettings = useMemo(
		() => ({
			depth: length,
			bevelEnabled: false,
		}),
		[length]
	);
	// Custom shader for T1-11 siding vertical ribs
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
          // Create vertical rib pattern every ~0.5 units
          float rib = mod(vPos.x * 8.0, 1.0);
          float ribEffect = smoothstep(0.3, 0.4, rib) - smoothstep(0.6, 0.7, rib);

          // Subtle darkening for ribs (depth effect)
          vec3 ribColor = color * (1.0 - ribEffect * 0.15);
          gl_FragColor = vec4(ribColor, 1.0);
        }
      `,
		}),
		[color]
	);
	// Corrugated roof shader
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
          // Create corrugated panel effect
          float panel = mod(vPos.x * 6.0, 1.0);
          float panelShade = smoothstep(0.0, 0.3, panel) - smoothstep(0.7, 1.0, panel);

          // Metallic appearance with corrugation
          vec3 metalColor = color * (0.9 + panelShade * 0.2);

          // Light reflection effect for metal
          float reflection = dot(vNormal, vec3(0.0, 1.0, 0.5)) * 0.3;
          metalColor += reflection;

          gl_FragColor = vec4(metalColor, 1.0);
        }
      `,
		}),
		[roofColor]
	);

	return (
		<group ref={groupRef} position={[0, wallHeight / 2, 0]}>
			{/* ========== FOUNDATION / SKID BASE ========== */}
			<mesh
				name="foundation"
				position={[0, -wallHeight / 2 - foundationHeight / 2, 0]}
				castShadow
				receiveShadow
			>
				<boxGeometry
					args={[
						width + foundationOverhang * 2,
						foundationHeight,
						length + foundationOverhang * 2,
					]}
				/>
				<meshStandardMaterial
					color={foundationColor}
					roughness={0.8}
					metalness={0.0}
				/>
			</mesh>
			{/* ========== MAIN WALL GEOMETRY ========== */}
			<mesh
				ref={mainWallRef}
				name="shedWalls"
				position={[0, -wallHeight / 2, 0]}
				castShadow
				receiveShadow
			>
				{modifiedGeometry ? (
					<primitive object={modifiedGeometry} attach="geometry" />
				) : (
					<primitive object={ribmedWallGeometry} attach="geometry" />
				)}
				<shaderMaterial
					args={[verticalSidingShader]}
					side={THREE.DoubleSide}
				/>
			</mesh>
			{/* ========== ROOF GEOMETRY ========== */}
			{style === 'Gambrel' ? (
				<>
					{/* Lower Roof Section (steeper, 5:12 pitch) */}
					<mesh
						name="shedRoofLower"
						position={[0, -wallHeight / 2, 0]}
						castShadow
						receiveShadow
					>
						<extrudeGeometry args={[gambrelLowerRoofShape, extrudeSettings]} />
						<shaderMaterial
							args={[corrugatedRoofShader]}
							side={THREE.DoubleSide}
						/>
					</mesh>

					{/* Upper Roof Section (gentler, 10:12 pitch) */}
					<mesh
						name="shedRoofUpper"
						position={[0, -wallHeight / 2, 0]}
						castShadow
						receiveShadow
					>
						<extrudeGeometry args={[gambrelUpperRoofShape, extrudeSettings]} />
						<shaderMaterial
							args={[corrugatedRoofShader]}
							side={THREE.DoubleSide}
						/>
					</mesh>
				</>
			) : (
				/* Single Roof (Gable or Barn style) */
				<mesh
					name="shedRoof"
					position={[0, -wallHeight / 2, 0]}
					castShadow
					receiveShadow
				>
					<extrudeGeometry args={[roofShape, extrudeSettings]} />
					<shaderMaterial
						args={[corrugatedRoofShader]}
						side={THREE.DoubleSide}
					/>
				</mesh>
			)}
			{/* ========== GABLE RAKE TRIM (angled roof edges) ========== */}
			{style !== 'Gambrel' && (
				<>
					{/* Front Gable Rake Trim */}
					<mesh
						position={[0, roofHeight / 2, halfLength + fasciaTrimHeight / 2]}
						rotation={[gableRakeAngle, 0, 0]}
						castShadow
						receiveShadow
					>
						<boxGeometry
							args={[width + cornerTrimWidth * 2, gableRakeTrimLength, fasciaTrimHeight]}
						/>
						<meshStandardMaterial
							color={effectiveTrimColor}
							roughness={0.4}
							metalness={0.25}
						/>
					</mesh>

					{/* Back Gable Rake Trim */}
					<mesh
						position={[0, roofHeight / 2, -halfLength - fasciaTrimHeight / 2]}
						rotation={[-gableRakeAngle, 0, 0]}
						castShadow
						receiveShadow
					>
						<boxGeometry
							args={[width + cornerTrimWidth * 2, gableRakeTrimLength, fasciaTrimHeight]}
						/>
						<meshStandardMaterial
							color={effectiveTrimColor}
							roughness={0.4}
							metalness={0.25}
						/>
					</mesh>
				</>
			)}
			{/* ========== CORNER TRIM (4 vertical pieces) ========== */}
			{/* Front-left corner trim */}
			<mesh
				position={[-halfWidth - cornerTrimWidth / 2, 0, halfLength + cornerTrimDepth / 2]}
				castShadow
				receiveShadow
			>
				<boxGeometry args={[cornerTrimWidth, wallHeight, cornerTrimDepth]} />
				<meshStandardMaterial
					color={effectiveTrimColor}
					roughness={0.4}
					metalness={0.25}
				/>
			</mesh>
			{/* Front-right corner trim */}
			<mesh
				position={[halfWidth + cornerTrimWidth / 2, 0, halfLength + cornerTrimDepth / 2]}
				castShadow
				receiveShadow
			>
				<boxGeometry args={[cornerTrimWidth, wallHeight, cornerTrimDepth]} />
				<meshStandardMaterial
					color={effectiveTrimColor}
					roughness={0.4}
					metalness={0.25}
				/>
			</mesh>
			{/* Back-left corner trim */}
			<mesh
				position={[-halfWidth - cornerTrimWidth / 2, 0, -halfLength - cornerTrimDepth / 2]}
				castShadow
				receiveShadow
			>
				<boxGeometry args={[cornerTrimWidth, wallHeight, cornerTrimDepth]} />
				<meshStandardMaterial
					color={effectiveTrimColor}
					roughness={0.4}
					metalness={0.25}
				/>
			</mesh>
			{/* Back-right corner trim */}
			<mesh
				position={[halfWidth + cornerTrimWidth / 2, 0, -halfLength - cornerTrimDepth / 2]}
				castShadow
				receiveShadow
			>
				<boxGeometry args={[cornerTrimWidth, wallHeight, cornerTrimDepth]} />
				<meshStandardMaterial
					color={effectiveTrimColor}
					roughness={0.4}
					metalness={0.25}
				/>
			</mesh>
			{/* ========== FASCIA/EAVE TRIM (4 horizontal pieces) ========== */}
			{/* Front fascia */}
			<mesh
				position={[0, wallHeight / 2, halfLength + fasciaTrimHeight / 2]}
				castShadow
				receiveShadow
			>
				<boxGeometry
					args={[width + cornerTrimWidth * 2, fasciaTrimHeight, fasciaTrimHeight]}
				/>
				<meshStandardMaterial
					color={effectiveTrimColor}
					roughness={0.4}
					metalness={0.25}
				/>
			</mesh>
			{/* Back fascia */}
			<mesh
				position={[0, wallHeight / 2, -halfLength - fasciaTrimHeight / 2]}
				castShadow
				receiveShadow
			>
				<boxGeometry
					args={[width + cornerTrimWidth * 2, fasciaTrimHeight, fasciaTrimHeight]}
				/>
				<meshStandardMaterial
					color={effectiveTrimColor}
					roughness={0.4}
					metalness={0.25}
				/>
			</mesh>
			{/* Left fascia */}
			<mesh
				position={[-halfWidth - cornerTrimWidth / 2, wallHeight / 2, 0]}
				castShadow
				receiveShadow
			>
				<boxGeometry
					args={[fasciaTrimHeight, fasciaTrimHeight, length + cornerTrimDepth * 2]}
				/>
				<meshStandardMaterial
					color={effectiveTrimColor}
					roughness={0.4}
					metalness={0.25}
				/>
			</mesh>
			{/* Right fascia */}
			<mesh
				position={[halfWidth + cornerTrimWidth / 2, wallHeight / 2, 0]}
				castShadow
				receiveShadow
			>
				<boxGeometry
					args={[fasciaTrimHeight, fasciaTrimHeight, length + cornerTrimDepth * 2]}
				/>
				<meshStandardMaterial
					color={effectiveTrimColor}
					roughness={0.4}
					metalness={0.25}
				/>
			</mesh>
			{/* ========== GAMBREL-SPECIFIC TRIM (Knuckle & Rake) ========== */}
			{style === 'Gambrel' && (
				<>
					{/* Front Knuckle Fascia (at lower/upper roof junction) */}
					<mesh
						position={[0, gambrelKnuckle.knuckleY - wallHeight / 2, halfLength + fasciaTrimHeight / 2]}
						castShadow
						receiveShadow
					>
						<boxGeometry
							args={[width + cornerTrimWidth * 2, fasciaTrimHeight, fasciaTrimHeight]}
						/>
						<meshStandardMaterial
							color={effectiveTrimColor}
							roughness={0.4}
							metalness={0.25}
						/>
					</mesh>
					{/* Back Knuckle Fascia */}
					<mesh
						position={[0, gambrelKnuckle.knuckleY - wallHeight / 2, -halfLength - fasciaTrimHeight / 2]}
						castShadow
						receiveShadow
					>
						<boxGeometry
							args={[width + cornerTrimWidth * 2, fasciaTrimHeight, fasciaTrimHeight]}
						/>
						<meshStandardMaterial
							color={effectiveTrimColor}
							roughness={0.4}
							metalness={0.25}
						/>
					</mesh>
					{/* Front Rake Trim - Lower Section (angled at 5:12 pitch) */}
					<mesh
						position={[0, (wallHeight + gambrelKnuckle.knuckleY) / 2 - wallHeight / 2, halfLength + 0.3]}
						rotation={[rakeAngles.lowerRakeRotation, 0, 0]}
						castShadow
						receiveShadow
					>
						<boxGeometry
							args={[
								width + cornerTrimWidth * 2,
								lowerSlopeLength,
								fasciaTrimHeight,
							]}
						/>
						<meshStandardMaterial
							color={effectiveTrimColor}
							roughness={0.4}
							metalness={0.25}
						/>
					</mesh>
					{/* Front Rake Trim - Upper Section (angled at 10:12 pitch) */}
					<mesh
						position={[0, (gambrelKnuckle.knuckleY + wallHeight + roofHeight) / 2 - wallHeight / 2, halfLength + 0.3]}
						rotation={[rakeAngles.upperRakeRotation, 0, 0]}
						castShadow
						receiveShadow
					>
						<boxGeometry
							args={[
								width + cornerTrimWidth * 2,
								upperSlopeLength,
								fasciaTrimHeight,
							]}
						/>
						<meshStandardMaterial
							color={effectiveTrimColor}
							roughness={0.4}
							metalness={0.25}
						/>
					</mesh>
					{/* Back Rake Trim - Lower Section */}
					<mesh
						position={[0, (wallHeight + gambrelKnuckle.knuckleY) / 2 - wallHeight / 2, -halfLength - 0.3]}
						rotation={[rakeAngles.lowerRakeRotation, 0, 0]}
						castShadow
						receiveShadow
					>
						<boxGeometry
							args={[
								width + cornerTrimWidth * 2,
								lowerSlopeLength,
								fasciaTrimHeight,
							]}
						/>
						<meshStandardMaterial
							color={effectiveTrimColor}
							roughness={0.4}
							metalness={0.25}
						/>
					</mesh>
					{/* Back Rake Trim - Upper Section */}
					<mesh
						position={[0, (gambrelKnuckle.knuckleY + wallHeight + roofHeight) / 2 - wallHeight / 2, -halfLength - 0.3]}
						rotation={[rakeAngles.upperRakeRotation, 0, 0]}
						castShadow
						receiveShadow
					>
						<boxGeometry
							args={[
								width + cornerTrimWidth * 2,
								upperSlopeLength,
								fasciaTrimHeight,
							]}
						/>
						<meshStandardMaterial
							color={effectiveTrimColor}
							roughness={0.4}
							metalness={0.25}
						/>
					</mesh>
				</>
			)}
			{/* ========== DOOR & WINDOW TRIM FRAMES ========== */}
			{placements.map((placement) => (
				<DoorWindowTrimFrame
					key={`trim-${placement.id}`}
					placement={placement}
					shedDimensions={{ width, length, wallHeight }}
					trimColor={effectiveTrimColor}
					trimWidth={windowDoorTrimWidth}
				/>
			))}
			{/* ========== DOOR & WINDOW OBJECTS ========== */}
			{placements.map((placement) => {
				if (placement.type === 'door') {
					return (
						<DoorObject
							key={placement.id}
							placement={placement}
							shedDimensions={{ width, length, wallHeight }}
							trimColor={effectiveTrimColor}
							wallColor={color}
						/>
					);
				} else if (placement.type === 'window') {
					return (
						<WindowObject
							key={placement.id}
							placement={placement}
							shedDimensions={{ width, length, wallHeight }}
							trimColor={effectiveTrimColor}
							frameColor={effectiveTrimColor}
						/>
					);
				}
				return null;
			})}
		</group>
	);
};

/**
 * Render trim frame around door/window opening
 */
function DoorWindowTrimFrame({
	placement,
	shedDimensions,
	trimColor,
	trimWidth,
}) {
	const { width, length, wallHeight } = shedDimensions;
	const { normalizedX, normalizedY, width: elemWidth, height: elemHeight, wall } = placement;
	const halfWidth = width / 2;
	const halfLength = length / 2;

	// Calculate position
	let position;
	let rotation;

	switch (wall) {
		case 'front':
			position = [
				-halfWidth + normalizedX * width,
				-wallHeight / 2 + normalizedY * wallHeight,
				halfLength + trimWidth / 2,
			];
			rotation = [0, 0, 0];
			break;
		case 'back':
			position = [
				-halfWidth + normalizedX * width,
				-wallHeight / 2 + normalizedY * wallHeight,
				-halfLength - trimWidth / 2,
			];
			rotation = [0, 0, 0];
			break;
		case 'left':
			position = [
				-halfWidth - trimWidth / 2,
				-wallHeight / 2 + normalizedY * wallHeight,
				-halfLength + normalizedX * length,
			];
			rotation = [0, Math.PI / 2, 0];
			break;
		case 'right':
			position = [
				halfWidth + trimWidth / 2,
				-wallHeight / 2 + normalizedY * wallHeight,
				-halfLength + normalizedX * length,
			];
			rotation = [0, Math.PI / 2, 0];
			break;
		default:
			position = [0, 0, 0];
			rotation = [0, 0, 0];
	}
	return (
		<group position={position} rotation={rotation}>
			{/* Top trim */}
			<mesh castShadow>
				<boxGeometry args={[elemWidth + trimWidth * 2, trimWidth, trimWidth]} />
				<meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.25} />
			</mesh>
			{/* Bottom trim */}
			<mesh position={[0, -elemHeight - trimWidth, 0]} castShadow>
				<boxGeometry args={[elemWidth + trimWidth * 2, trimWidth, trimWidth]} />
				<meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.25} />
			</mesh>
			{/* Left trim */}
			<mesh position={[-(elemWidth / 2 + trimWidth / 2), -elemHeight / 2, 0]} castShadow>
				<boxGeometry args={[trimWidth, elemHeight + trimWidth * 2, trimWidth]} />
				<meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.25} />
			</mesh>
			{/* Right trim */}
			<mesh position={[elemWidth / 2 + trimWidth / 2, -elemHeight / 2, 0]} castShadow>
				<boxGeometry args={[trimWidth, elemHeight + trimWidth * 2, trimWidth]} />
				<meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.25} />
			</mesh>
		</group>
	);
}
