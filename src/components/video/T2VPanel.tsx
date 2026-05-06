export function T2VPanel({
  prompt,
  camera,
  onPromptChange,
  onCameraChange,
}: {
  prompt: string;
  camera: string;
  onPromptChange: (value: string) => void;
  onCameraChange: (value: string) => void;
}) {
  return (
    <>
      <label className="block text-sm">
        <span className="mb-1 block text-on-surface-variant">视频提示词</span>
        <textarea className="field min-h-28" value={prompt} onChange={(event) => onPromptChange(event.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-on-surface-variant">镜头运动</span>
        <select className="field" value={camera} onChange={(event) => onCameraChange(event.target.value)}>
          <option>缓慢推进</option>
          <option>环绕运镜</option>
          <option>手持跟拍</option>
          <option>俯冲拉远</option>
        </select>
      </label>
    </>
  );
}
