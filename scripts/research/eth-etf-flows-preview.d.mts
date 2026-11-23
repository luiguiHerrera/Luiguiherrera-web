import type { CapitalFlowAssetPreview } from '../../lib/dashboard/capital-flows-preview-types';
export const ETH_PREVIEW_FILE: string;
export function extractEthRows(html:string):string[][];
export function refreshEthPreview():Promise<CapitalFlowAssetPreview>;
