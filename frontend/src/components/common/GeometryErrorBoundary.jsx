import { Component } from 'react';

/**
 * Keeps a refusal from the geometry kernel off the whole page.
 *
 * The kernel is load-bearing for first paint: the shed's walls, roof and trim
 * are all its output, so a throw anywhere in that tree unmounts everything
 * above it and leaves a blank canvas. A blank canvas says nothing — not what
 * was wrong, not that anything was wrong.
 *
 * The kernel throws on names it will not guess at: a Model that is not Barn or
 * Gable, a wall the shed does not have, an octagon fitted to an end nobody
 * named. `unrenderableReasons` catches those on the way in from storage, which
 * is the right place and closes the known hole. This is the backstop for the
 * ones that arrive some other way, and for the geometry errors that are not
 * about names at all — Openings that remove a whole wall, or cut it into
 * disconnected pieces, which the kernel also refuses.
 *
 * A class component because that is the only thing React lets catch a render
 * error; there is no hook for it.
 */
export class GeometryErrorBoundary extends Component {
	state = { error: null };

	static getDerivedStateFromError(error) {
		return { error };
	}

	componentDidCatch(error, info) {
		// The message names the offending value — that is the whole point of the
		// kernel refusing rather than guessing — so keep it where it can be read.
		console.error('Geometry could not be built:', error, info?.componentStack);
	}

	/** Lets a caller clear the error after changing whatever caused it. */
	reset = () => this.setState({ error: null });

	render() {
		if (!this.state.error) return this.props.children;

		return (
			<div
				role="alert"
				className="w-full h-full flex items-center justify-center p-6 bg-gray-50"
			>
				<div className="max-w-md text-center">
					<h2 className="text-lg font-semibold text-gray-900">
						This shed cannot be drawn
					</h2>
					<p className="mt-2 text-sm text-gray-600">{this.state.error.message}</p>
					<p className="mt-4 text-xs text-gray-500">
						Change the option that caused it, or start a new design. Nothing has
						been saved.
					</p>
					<button
						type="button"
						onClick={this.reset}
						className="mt-4 px-4 py-2 text-sm rounded bg-gray-900 text-white"
					>
						Try again
					</button>
				</div>
			</div>
		);
	}
}
