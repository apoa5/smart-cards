import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

const arrowStyle = "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-white p-2 text-gray-600 shadow-md enabled:cursor-pointer enabled:hover:bg-gray-200 disabled:opacity-30";

export function StudyArrows({ index, total, onSelect, item }) {
  return (
    <>
      <button type="button" aria-label={`Previous ${item}`} disabled={index === 0}
        onClick={() => onSelect(index - 1)} className={`${arrowStyle} left-0`}>
        <ChevronLeftIcon aria-hidden="true" className="h-5 w-5" />
      </button>
      <button type="button" aria-label={`Next ${item}`} disabled={index === total - 1}
        onClick={() => onSelect(index + 1)} className={`${arrowStyle} right-0`}>
        <ChevronRightIcon aria-hidden="true" className="h-5 w-5" />
      </button>
    </>
  );
}

export function StudyNumbers({ index, total, onSelect, item }) {
  return (
    <nav aria-label={`Select a ${item}`}
      className="grid max-w-full grid-cols-5 gap-2 rounded-lg border border-gray-300 bg-white p-3 shadow-md sm:gap-4 sm:p-4">
      {Array.from({ length: total }, (_, position) => (
        <button key={position} type="button" aria-label={`${item} ${position + 1}`}
          aria-current={position === index ? "true" : undefined}
          onClick={() => onSelect(position)}
          className={`h-9 w-9 cursor-pointer rounded-full text-sm font-medium transition ${
            position === index ? "bg-lime-900 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}>
          {position + 1}
        </button>
      ))}
    </nav>
  );
}
