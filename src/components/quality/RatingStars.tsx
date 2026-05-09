import type { QualityRating } from '../../types';

export function RatingStars({ value, onChange, readonly }: { value?: QualityRating; onChange?: (rating: QualityRating) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {([1, 2, 3, 4, 5] as QualityRating[]).map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`text-lg transition ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${value && star <= value ? 'text-yellow-400' : 'text-on-surface-variant/30'}`}
          onClick={() => !readonly && onChange?.(star)}
          title={`${star} 星`}
        >
          ★
        </button>
      ))}
      {value ? <span className="ml-1.5 text-xs text-on-surface-variant">{value}/5</span> : null}
    </div>
  );
}
