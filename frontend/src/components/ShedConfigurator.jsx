import { BarnShed } from './BarnShed/BarnShed';
import { GableShed } from './GableShed/GableShed';

/**
 * ShedConfigurator
 *
 * Router component that renders the appropriate shed style based on configuration.
 * Handles style switching between Barn (Barn) and Gable roof configurations.
 *
 * This component replaces the original monolithic ShedUltraRefined by delegating
 * to style-specific implementations while maintaining the same interface.
 */
export const ShedConfigurator = ({
	width = 10,
	length = 12,
	wallHeight = 8,
	model = 'Gable',
	color = '#8B4513',
	roofColor = '#2F4F4F',
	onShedMeshReady = null,
}) => {
	// Route to appropriate style-specific component
	if (model === 'Barn') {
		return (
			<BarnShed
				width={width}
				length={length}
				wallHeight={wallHeight}
				color={color}
				roofColor={roofColor}
				onShedMeshReady={onShedMeshReady}
			/>
		);
	}

	// Default to Gable style
	return (
		<GableShed
			width={width}
			length={length}
			wallHeight={wallHeight}
			color={color}
			roofColor={roofColor}
			onShedMeshReady={onShedMeshReady}
		/>
	);
};

/**
 * Alias for backwards compatibility with Canvas3D import
 */
export const Shed = ShedConfigurator;
