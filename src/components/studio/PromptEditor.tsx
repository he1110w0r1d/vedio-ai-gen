export function PromptEditor({
  prompt,
  negativePrompt,
  onPromptChange,
  onNegativePromptChange,
}: {
  prompt: string;
  negativePrompt: string;
  onPromptChange: (value: string) => void;
  onNegativePromptChange: (value: string) => void;
}) {
  return (
    <>
      <label className="block text-sm">
        <span className="mb-1 block text-on-surface-variant">正向提示词</span>
        <textarea className="field min-h-28" value={prompt} onChange={(event) => onPromptChange(event.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-on-surface-variant">负面提示词</span>
        <textarea className="field min-h-20" value={negativePrompt} onChange={(event) => onNegativePromptChange(event.target.value)} />
      </label>
    </>
  );
}
