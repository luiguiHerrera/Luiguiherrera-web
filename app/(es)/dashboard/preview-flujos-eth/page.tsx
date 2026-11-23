import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DashboardContent } from '../page';
import { getEthFlowsPreview } from '@/lib/dashboard/get-eth-flows-preview';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title:'Ethereum · Flujos de ETF | Preview', robots:{index:false,follow:false} };
export default async function EthFlowsPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <DashboardContent locale="es" previewEthFlows ethFlowsPreviewData={await getEthFlowsPreview()} />;
}
