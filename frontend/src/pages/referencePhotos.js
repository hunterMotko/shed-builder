/**
 * The Reference Photos, resolved from the untracked `reference/` folder.
 *
 * The photographs are not in the repository — `reference/` is gitignored, and
 * a copy that had been committed into `frontend/public/` has been removed.
 * They are product photography rather than source, and the repository is
 * public.
 *
 * So the Reference Match page reads them from the working copy instead. Vite
 * resolves the glob at build time and `server.fs.allow` lets the dev server
 * serve a path above the frontend root.
 *
 * **A clone without the photos still builds.** An absent file simply means an
 * absent key here, and `ReferenceMatch` renders a placeholder telling the
 * reader where the photos are meant to live. That is the whole reason this
 * goes through a glob rather than a static import, which would fail the build.
 *
 * **The pattern names its files.** A wildcard over the folder emits every
 * photograph into `dist/` — 47 of them, 21 MB, to display two. Vite needs the
 * pattern as a static literal, so adding a target means adding its file name
 * here as well. The list being slightly annoying to maintain is the price of a
 * build that carries only what it shows.
 */

const modules = import.meta.glob(
	'../../../reference/{barn_barndoors,12-16-gable-front}.jpg',
	{ eager: true, query: '?url', import: 'default' }
);

/** Photo URLs by file name, e.g. `barn_barndoors.jpg`. */
export const REFERENCE_PHOTOS = Object.fromEntries(
	Object.entries(modules).map(([path, url]) => [path.split('/').pop(), url])
);

/**
 * The URL for one Reference Photo, or `null` when it is not on this machine.
 *
 * @param {string} fileName - name only, no directory
 * @returns {string|null}
 */
export function referencePhoto(fileName) {
	return REFERENCE_PHOTOS[fileName] ?? null;
}
