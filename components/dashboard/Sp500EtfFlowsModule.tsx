import { CapitalFlowPreviewCard } from './CapitalFlowPreviewCard';
import type { Sp500EtfFlowsPreviewData } from '@/lib/dashboard/sp500-etf-flows-types';

export function Sp500EtfFlowsModule({ data }: { data: Sp500EtfFlowsPreviewData | null }) {
  return <CapitalFlowPreviewCard data={{
    id:'sp500',title:'Flujos ETFs de S&P500',eyebrow:'Renta variable estadounidense',
    description:'Creaciones y reembolsos netos estimados en ETF que replican el S&P 500.',
    points:data?.points ?? [],cutoffDate:data?.cutoffDate ?? null,metricBasis:'daily-sum',kind:'estimated',
    vehicles:data?.included ?? [],sources:data?.funds.map(fund=>({name:fund.issuer,url:fund.url})) ?? [],
    notes:[
      'Se agregan SPY e IVV únicamente en fechas compatibles y completas. VOO continúa excluido hasta validar su histórico conjunto y el efecto de conversiones entre clases.',
      'Los acumulados suman flujos diarios, cada uno valorado al NAV de su sesión. Las creaciones y reembolsos pueden realizarse en especie; no equivalen necesariamente a efectivo nuevo.',
    ],
  }} />;
}
