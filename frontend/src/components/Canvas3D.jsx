import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Shed } from './ShedConfigurator';
import { useShedStore } from '../store/shedStore';
import { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
	getWallFromIntersection,
	getWallNormalizedCoordinates,
} from '../utils/coordinateUtils';

/**
 * Raycasting interaction component
 * Handles mouse clicks on shed walls and calculates placement coordinates
 */
function RaycastingInteraction({ shedMesh, shedDimensions, onWallClick }) {
	const { gl, camera } = useThree();
	const raycasterRef = useRef(new THREE.Raycaster());
	const mouseRef = useRef(new THREE.Vector2());
	const listenerAddedRef = useRef(false);

	const handleCanvasClick = useCallback(
		(event) => {
			if (!shedMesh || !shedDimensions) return;
			// Get canvas and compute normalized device coordinates
			const canvas = gl.domElement;
			const rect = canvas.getBoundingClientRect();
			const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

			mouseRef.current.set(x, y);
			// Set up raycaster from camera
			raycasterRef.current.setFromCamera(mouseRef.current, camera);
			// Check for intersections with the shed mesh
			const intersects = raycasterRef.current.intersectObject(shedMesh, true);
			if (intersects.length > 0) {
				const intersection = intersects[0];
				const point = intersection.point;
				// Determine which wall was clicked
				const wall = getWallFromIntersection(
					point,
					shedDimensions.width,
					shedDimensions.length
				);
				if (wall) {
					// Calculate normalized coordinates on the wall
					const { normalizedX, normalizedY } = getWallNormalizedCoordinates(
						point,
						wall,
						shedDimensions.width,
						shedDimensions.length,
						shedDimensions.wallHeight
					);
					// Call the placement handler
					onWallClick({
						wall,
						normalizedX,
						normalizedY,
						worldPoint: point,
					});
				}
			}
		},
		[shedMesh, shedDimensions, gl, camera, onWallClick]
	);
	// Attach click listener on mount
	useFrame(() => {
		if (!listenerAddedRef.current && gl.domElement) {
			gl.domElement.addEventListener('click', handleCanvasClick);
			listenerAddedRef.current = true;
		}
	});
	return null;
}

export const Canvas3D = ({ onPlacementInteraction = null }) => {
	const { width, length, style, color, roofColor } = useShedStore();
	const [shedMesh, setShedMesh] = useState(null);
	const [shedDimensions, setShedDimensions] = useState(null);

	const handleShedMeshReady = useCallback((mesh, dimensions) => {
		setShedMesh(mesh);
		setShedDimensions(dimensions);
	}, []);

	const handleWallClick = useCallback(
		(placementData) => {
			if (onPlacementInteraction) {
				onPlacementInteraction(placementData);
			}
			// Could also show a dialog or emit an event here
			console.log('Wall clicked:', placementData);
		},
		[onPlacementInteraction]
	);

	return (
		<Canvas className="w-full h-full" shadows>
			<PerspectiveCamera makeDefault position={[15, 10, 15]} />
			<ambientLight intensity={0.6} />
			<directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
			<pointLight position={[-10, 5, -10]} intensity={0.4} />
			<Shed
				width={width}
				length={length}
				style={style}
				color={color}
				roofColor={roofColor}
				onShedMeshReady={handleShedMeshReady}
			/>
			{shedMesh && shedDimensions && (
				<RaycastingInteraction
					shedMesh={shedMesh}
					shedDimensions={shedDimensions}
					onWallClick={handleWallClick}
				/>
			)}
			<OrbitControls
				autoRotate={false}
				minDistance={10}
				maxDistance={50}
			/>
			<gridHelper args={[50, 50]} position={[0, 0, 0]} />
		</Canvas>
	);
};
