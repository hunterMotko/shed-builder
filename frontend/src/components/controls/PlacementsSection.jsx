import { useShedStore } from '../../store/shedStore';
import { placementTypeLabel } from '../../utils/placementPresets';
import { OPTION_PRICES } from '../../utils/pricingUtils';
import { placementIssues } from '../../utils/placementValidator';
import { wallHeightFt } from '../../utils/modelSpec';

/**
 * The Openings a customer has placed, and the way back off the wall.
 *
 * The counterpart to `PlacementDialog`. Clicking a wall puts a door on the
 * shed; without this there was no way to take one off again short of Reset,
 * which throws the whole Design away. `removePlacement` and `clearPlacements`
 * have been in the store, and covered by its tests, the whole time — what was
 * missing was a caller.
 *
 * Placements are not Options and do not live in `OptionsSection`: an Option is
 * a catalog item with a price and a checkbox, while a Placement is a position
 * on a named wall. They share a tab because that is where a customer looks for
 * what has been added, not because they are the same kind of thing.
 */

// What hangs off this Opening: shutters on a window, a ramp at a garage door.
// They live here rather than in the Options tab because they have no existence
// apart from the Opening they attach to — one window can be shuttered and the
// next left bare (issue #44).
const Attachment = ({ placement, onUpdate }) => {
	if (placement.type === 'window') {
		return (
			<label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, cursor: 'pointer' }}>
				<input
					type="checkbox"
					checked={Boolean(placement.shutters)}
					onChange={(e) => onUpdate(placement.id, { shutters: e.target.checked })}
					style={{ width: 13, height: 13, accentColor: '#3b82f6' }}
				/>
				<span style={{ color: '#94a3b8', fontSize: 11 }}>
					Shutters — ${OPTION_PRICES.shutters_per_pair}
				</span>
			</label>
		);
	}

	if (placement.type === 'garage_door') {
		return (
			<label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
				<span style={{ color: '#94a3b8', fontSize: 11 }}>Ramp</span>
				<select
					aria-label={`Ramp for the garage door on the ${placement.wall} wall`}
					value={placement.ramp || ''}
					onChange={(e) => onUpdate(placement.id, { ramp: e.target.value || undefined })}
					style={{
						background: '#1e293b', color: '#cbd5e1', border: '1px solid #475569',
						borderRadius: 5, padding: '2px 6px', fontSize: 11, cursor: 'pointer',
					}}
				>
					<option value="">None</option>
					<option value="small">6–8×4 ft — ${OPTION_PRICES.ramp_small}</option>
					<option value="large">8–10×4 ft — ${OPTION_PRICES.ramp_large}</option>
				</select>
			</label>
		);
	}

	return null;
};

const Row = ({ placement, index, onRemove, onUpdate, issue }) => (
	<li
		style={{
			display: 'flex', alignItems: 'center', gap: 10,
			padding: '9px 0', borderBottom: '1px solid #1e293b',
		}}
	>
		<span style={{ color: '#475569', fontSize: 11, fontWeight: 600, width: 16, flexShrink: 0 }}>
			{index + 1}
		</span>
		<div style={{ flex: 1, minWidth: 0 }}>
			<div style={{ color: '#e2e8f0', fontSize: 13 }}>{placementTypeLabel(placement.type)}</div>
			<div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
				{placement.wall.charAt(0).toUpperCase() + placement.wall.slice(1)} wall
				{' · '}
				{placement.width.toFixed(1)} × {placement.height.toFixed(1)} ft
			</div>
			{/* A resize can leave an Opening hanging off the wall it was placed
			    on. It is kept and said out loud rather than moved or dropped:
			    a customer's door is not the app's to relocate (ADR-0007). */}
			{issue && (
				<div style={{ color: '#fca5a5', fontSize: 11, marginTop: 3 }}>{issue}</div>
			)}
			<Attachment placement={placement} onUpdate={onUpdate} />
		</div>
		<button
			type="button"
			onClick={() => onRemove(placement.id)}
			/* Named, not just "Remove": four rows of the same word tell a screen
			   reader nothing about which door it is about to take off. */
			aria-label={`Remove ${placementTypeLabel(placement.type)} on the ${placement.wall} wall`}
			style={{
				flexShrink: 0, padding: '4px 9px', fontSize: 11, fontWeight: 600,
				color: '#fca5a5', background: 'none',
				border: '1px solid #7f1d1d', borderRadius: 5, cursor: 'pointer',
			}}
		>
			Remove
		</button>
	</li>
);

export const PlacementsSection = () => {
	const placements = useShedStore((s) => s.placements);
	const removePlacement = useShedStore((s) => s.removePlacement);
	const updatePlacement = useShedStore((s) => s.updatePlacement);
	const clearPlacements = useShedStore((s) => s.clearPlacements);
	const width = useShedStore((s) => s.width);
	const length = useShedStore((s) => s.length);
	const model = useShedStore((s) => s.model);

	// Asked, not stored. Whether an Opening still fits is a question about the
	// Design as it is now, and a stored answer is one more thing to go stale.
	const issues = placementIssues(placements, {
		width,
		length,
		wallHeight: wallHeightFt(model),
	});
	const issueFor = (id) => issues.find((i) => i.id === id)?.summary ?? null;

	return (
		<div>
			<div style={{
				display: 'flex', alignItems: 'center', justifyContent: 'space-between',
				padding: '11px 0',
			}}>
				<span style={{
					color: '#94a3b8', fontSize: 11, fontWeight: 700,
					textTransform: 'uppercase', letterSpacing: '0.06em',
				}}>
					Openings
				</span>
				{placements.length > 0 && (
					<button
						type="button"
						onClick={clearPlacements}
						style={{
							padding: '2px 8px', fontSize: 10, fontWeight: 600,
							color: '#fca5a5', background: 'none',
							border: '1px solid #7f1d1d', borderRadius: 10, cursor: 'pointer',
						}}
					>
						Clear all
					</button>
				)}
			</div>

			{placements.length === 0 ? (
				<p style={{ color: '#64748b', fontSize: 12, padding: '2px 0 10px' }}>
					Click a wall on the shed to add a door or a window.
				</p>
			) : (
				<ul style={{ listStyle: 'none' }}>
					{placements.map((p, i) => (
						<Row
							key={p.id}
							placement={p}
							index={i}
							onRemove={removePlacement}
							onUpdate={updatePlacement}
							issue={issueFor(p.id)}
						/>
					))}
				</ul>
			)}
		</div>
	);
};
