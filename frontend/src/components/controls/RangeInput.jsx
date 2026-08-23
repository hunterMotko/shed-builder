export const RangeInput = ({
	id,
	min,
	max,
	value,
	onChange,
	step = 1,
	ariaLabel,
}) => {
	const percentage = ((value - min) / (max - min)) * 100;
	const handleChange = (e) => {
		onChange(parseInt(e.target.value, 10));
	};

	return (
		<div className="relative">
			{/* Visual track background */}
			<div className="absolute h-2 bg-gray-200 rounded-full w-full top-3 pointer-events-none" />
			{/* Visual track fill (shows progress) */}
			<div
				className="absolute h-2 bg-blue-600 rounded-full top-3 pointer-events-none transition-all ease-out"
				style={{ width: `${percentage}%` }}
				aria-hidden="true"
			/>

			{/* Range input slider */}
			<input
				id={id}
				type="range"
				min={min}
				max={max}
				value={value}
				onChange={handleChange}
				step={step}
				aria-label={ariaLabel}
				className="
          relative
          w-full
          h-2
          bg-transparent
          rounded-full
          appearance-none
          cursor-pointer
          z-5
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-blue-600
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:hover:shadow-lg
          [&::-webkit-slider-thumb]:focus:shadow-lg
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-blue-600
          [&::-moz-range-thumb]:cursor-pointer
          [&::-moz-range-thumb]:shadow-md
          [&::-moz-range-thumb]:transition-all
          [&::-moz-range-thumb]:hover:shadow-lg
          [&::-moz-range-track]:bg-transparent
          [&::-moz-range-track]:border-0
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          focus:ring-offset-2
        "
			/>
		</div>
	);
};
