/**
 * ChevronDownIcon Component
 *
 * Simple SVG icon for dropdown indicators
 * Rotates based on open/closed state
 */

export const ChevronDownIcon = ({ isOpen = false }) => (
  <svg
    className={`w-5 h-5 transition-transform duration-200 ${
      isOpen ? 'rotate-180' : ''
    }`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 14l-7 7m0 0l-7-7m7 7V3"
    />
  </svg>
);
