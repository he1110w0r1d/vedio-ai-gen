import { SectionHeader } from '../components/ui';
import { ProviderCard } from '../components/providers/ProviderCard';
import { ProviderForm } from '../components/providers/ProviderForm';
import { ProviderNoticeCard } from '../components/providers/ProviderNoticeCard';
import { useApp } from '../context/AppContext';

export function Providers() {
  const { providers, upsertProvider, deleteProviderKey, testProvider, setDefaultProvider, addCustomProvider } = useApp();

  return (
    <div>
      <SectionHeader title="供应商与 API Keys" subtitle="前端 Mock 管理 BYOK 配置，不会保存真实密钥到远端。" />
      <ProviderNoticeCard />
      <ProviderForm onSubmit={addCustomProvider} />
      <div className="grid gap-4 xl:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onSave={upsertProvider}
            onDeleteKey={deleteProviderKey}
            onTest={testProvider}
            onSetDefault={setDefaultProvider}
          />
        ))}
      </div>
    </div>
  );
}
