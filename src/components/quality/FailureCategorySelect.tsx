import type { FailureCategory } from '../../types';

export const failureCategoryOptions: { value: FailureCategory; label: string }[] = [
  { value: 'prompt_issue', label: '提示词问题' },
  { value: 'model_issue', label: '模型能力问题' },
  { value: 'provider_error', label: '供应商错误' },
  { value: 'content_rejected', label: '内容审核失败' },
  { value: 'technical_error', label: '技术错误' },
  { value: 'bad_composition', label: '构图问题' },
  { value: 'bad_motion', label: '动作问题' },
  { value: 'identity_drift', label: '角色漂移' },
  { value: 'style_mismatch', label: '风格不一致' },
  { value: 'low_resolution', label: '清晰度不足' },
  { value: 'artifact', label: '画面伪影' },
  { value: 'other', label: '其他' },
];

export function FailureCategorySelect({ value, onChange, readonly }: { value?: FailureCategory; onChange?: (cat: FailureCategory | undefined) => void; readonly?: boolean }) {
  return (
    <select
      className="field text-sm"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value ? e.target.value as FailureCategory : undefined)}
      disabled={readonly}
    >
      <option value="">无</option>
      {failureCategoryOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export function failureCategoryLabel(category?: FailureCategory): string {
  if (!category) return '';
  return failureCategoryOptions.find(o => o.value === category)?.label ?? category;
}
