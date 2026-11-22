import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

const arrowStyle = "study-arrow absolute top-1/2 z-10 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-lg border border-rule-strong bg-paper text-ink-secondary enabled:cursor-pointer enabled:hover:bg-accent-tint disabled:opacity-40";

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
      className="grid max-w-full grid-cols-5 gap-1.5">
      {Array.from({ length: total }, (_, position) => (
        <button key={position} type="button" aria-label={`${item} ${position + 1}`}
          aria-current={position === index ? "true" : undefined}
          onClick={() => onSelect(position)}
          className={`h-11 w-11 cursor-pointer rounded-lg border text-sm font-medium transition-colors duration-150 ${
            position === index ? "border-accent bg-accent text-paper" : "border-rule bg-paper text-ink-secondary hover:border-accent hover:bg-accent-tint"
          }`}>
          {position + 1}
        </button>
      ))}
    </nav>
  );
}
