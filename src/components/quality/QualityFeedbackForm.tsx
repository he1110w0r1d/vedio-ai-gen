import { useState } from 'react';
import type { QualityFeedback, QualityRating, QualityStatus, FailureCategory } from '../../types';
import { RatingStars } from './RatingStars';
import { FailureCategorySelect } from './FailureCategorySelect';
import { Icon } from '../common/Icon';

const qualityStatusOptions: { value: QualityStatus; label: string }[] = [
  { value: 'excellent', label: '优秀' },
  { value: 'usable', label: '可用' },
  { value: 'needs_fix', label: '需要修复' },
  { value: 'unusable', label: '不可用' },
];

export function QualityFeedbackForm({
  feedback,
  onSave,
  onClear,
  saving,
}: {
  feedback?: QualityFeedback | null;
  onSave: (data: Partial<QualityFeedback>) => void;
  onClear?: () => void;
  saving?: boolean;
}) {
  const [rating, setRating] = useState<QualityRating | undefined>(feedback?.rating);
  const [qualityStatus, setQualityStatus] = useState<QualityStatus | undefined>(feedback?.qualityStatus);
  const [failureCategory, setFailureCategory] = useState<FailureCategory | undefined>(feedback?.failureCategory);
  const [note, setNote] = useState(feedback?.note ?? '');
  const [worthRetry, setWorthRetry] = useState(feedback?.worthRetry ?? false);

  const handleSave = () => {
    onSave({ rating, qualityStatus, failureCategory, note: note || undefined, worthRetry });
  };

  return (
    <div className="space-y-4 rounded-xl bg-surface-container p-4">
      <h4 className="flex items-center gap-2 font-bold">
        <Icon name="rate_review" /> 质量评价
      </h4>

      <div>
        <label className="mb-1 block text-xs text-on-surface-variant">星级评分</label>
        <RatingStars value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-on-surface-variant">质量状态</label>
        <div className="flex flex-wrap gap-2">
          {qualityStatusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`chip text-xs transition ${qualityStatus === opt.value ? 'bg-primary-fixed-dim/30 text-primary-fixed-dim ring-1 ring-primary-fixed-dim' : ''}`}
              onClick={() => setQualityStatus(qualityStatus === opt.value ? undefined : opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-on-surface-variant">问题分类</label>
        <FailureCategorySelect value={failureCategory} onChange={setFailureCategory} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-on-surface-variant">备注</label>
        <textarea
          className="field min-h-[60px] text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="描述质量问题或使用场景..."
        />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={worthRetry} onChange={(e) => setWorthRetry(e.target.checked)} />
        值得重试
      </label>

      <div className="flex items-center gap-2">
        <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>
          <Icon name="save" />{feedback ? '更新评价' : '保存评价'}
        </button>
        {feedback && onClear ? (
          <button className="btn-ghost text-sm" onClick={onClear} disabled={saving}>
            <Icon name="delete" />清除评价
          </button>
        ) : null}
      </div>
    </div>
  );
}
