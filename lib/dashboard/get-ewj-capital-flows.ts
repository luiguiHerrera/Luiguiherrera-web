import 'server-only';
import snapshot from './ewj-etf-flows-published.json';
import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';

// Reviewed derived statistics only. Keep the official workbook private and the
// effective close unchanged. This imported snapshot is not an automatic feed.
export function getPublishedEwjFlows(): CapitalFlowAssetPreview {
  return snapshot as CapitalFlowAssetPreview;
}
