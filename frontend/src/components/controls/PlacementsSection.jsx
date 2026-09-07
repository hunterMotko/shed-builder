import { useShedStore } from '../../store/shedStore';
import { placementTypeLabel } from '../../utils/placementPresets';

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

const Row = ({ placement, index, onRemove }) => (
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
	const clearPlacements = useShedStore((s) => s.clearPlacements);

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
						<Row key={p.id} placement={p} index={i} onRemove={removePlacement} />
					))}
				</ul>
			)}
		</div>
	);
};
