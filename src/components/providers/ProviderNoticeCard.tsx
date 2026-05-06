import { InfoNotice } from '../common/InfoNotice';

export function ProviderNoticeCard() {
  return (
    <InfoNotice className="mb-5">
      平台仅提供统一创作工作台、资产管理和调用编排能力。用户通过本人 API Key 调用第三方供应商生成内容，相关费用、内容审核、版权归属、商用授权和使用限制均以对应第三方供应商的服务条款为准。平台不对第三方模型生成内容的版权、合规性或商用授权作额外承诺。请不要在代码中写入真实 API Key。
    </InfoNotice>
  );
}
