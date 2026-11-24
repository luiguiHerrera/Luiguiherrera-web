import 'server-only';
import {getCachedCapitalFlow} from './get-published-capital-flows';
import {CapitalFlowSourceError} from './capital-flows-source.mjs';
import {expectedEthFlowSession} from './eth-capital-flows-source.mjs';
import snapshot from './capital-flows-published.json';
import type {CapitalFlowAssetPreview} from './capital-flows-preview-types';

export async function getEthFlowsPreview():Promise<CapitalFlowAssetPreview>{
  if(process.env.NODE_ENV!=='development')throw new Error('ETH preview is development-only');
  try{
    const model=await getCachedCapitalFlow('eth');
    return {...model,refreshStatus:model.cutoffDate&&model.cutoffDate>=expectedEthFlowSession()?'current':'delayed'};
  }
  catch(error){
    if(!(error instanceof CapitalFlowSourceError))throw error;
    const fallback=(snapshot as CapitalFlowAssetPreview[]).find(model=>model.id==='eth')!;
    return {...fallback,refreshStatus:'unavailable',lastRefreshError:error instanceof Error?error.message:'Fuente no disponible'};
  }
}
