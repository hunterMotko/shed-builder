import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { wallHitAt } from '../../utils/coordinateUtils';

/** How far the pointer may travel and still count as a click, in pixels. */
const DRAG_SLOP = 4;

/**
 * Turns a click on the shed into the wall and the spot on it that was hit.
 *
 * Lives inside the `<Canvas>` because it needs the camera and the scene; it
 * draws nothing. `onPick` is handed `{ wall, normalizedX, normalizedY }`, ready
 * to become a Placement, or is not called at all.
 *
 * **A drag is not a click.** OrbitControls owns the same pointer, so releasing
 * after an orbit would otherwise land a door wherever the rotation finished.
 * The pointer has to come back up within `DRAG_SLOP` of where it went down —
 * which is also why this listens for pointerdown/pointerup rather than `click`.
 *
 * **The ray is cast at the whole scene, not at one nominated mesh.** The
 * component this replaces raycast a `shedMesh` that only `GableShed` ever
 * supplied, and only its *front* wall: `BarnShed` handed over `null` with a
 * note that Barn placement was "not yet wired". There is nothing to wire. Which
 * wall a point is on is the kernel's question and it answers it from the point
 * alone, so any hit on the building will do — a wall, its trim, a door already
 * hanging on it.
 *
 * That breadth is why the height check is here. `wallHit` measures distance to
 * a wall's *plane* and not whether the hit lies within that wall, so a click on
 * the roof a few inches inside a gable end would come back as that end, clamped
 * to the top of the wall. A hit above the eave or below the floor is not a
 * wall, whatever plane it is near.
 */
export const WallPicker = ({ shedWidth, shedLength, wallHeight, onPick }) => {
	const { gl, camera, scene } = useThree();
	const downAt = useRef(null);

	useEffect(() => {
		const canvas = gl.domElement;
		const raycaster = new THREE.Raycaster();
		const ndc = new THREE.Vector2();

		const onDown = (e) => {
			downAt.current = { x: e.clientX, y: e.clientY };
		};

		const onUp = (e) => {
			const down = downAt.current;
			downAt.current = null;
			if (!down) return;
			if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_SLOP) return;

			const rect = canvas.getBoundingClientRect();
			ndc.set(
				((e.clientX - rect.left) / rect.width) * 2 - 1,
				-((e.clientY - rect.top) / rect.height) * 2 + 1
			);
			raycaster.setFromCamera(ndc, camera);

			const [nearest] = raycaster.intersectObjects(scene.children, true);
			if (!nearest) return;

			const { point } = nearest;
			if (point.y < 0 || point.y > wallHeight) return;

			const hit = wallHitAt(point, shedWidth, shedLength, wallHeight);
			if (hit) onPick(hit);
		};

		canvas.addEventListener('pointerdown', onDown);
		canvas.addEventListener('pointerup', onUp);
		return () => {
			canvas.removeEventListener('pointerdown', onDown);
			canvas.removeEventListener('pointerup', onUp);
		};
	}, [gl, camera, scene, shedWidth, shedLength, wallHeight, onPick]);

	return null;
};
