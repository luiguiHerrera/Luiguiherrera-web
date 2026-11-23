import 'server-only';
import {getEthAutomaticModel} from './get-eth-capital-flows';
import snapshot from './capital-flows-published.json';
import type {CapitalFlowAssetPreview} from './capital-flows-preview-types';

export async function getEthFlowsPreview():Promise<CapitalFlowAssetPreview>{
  if(process.env.NODE_ENV!=='development')throw new Error('ETH preview is development-only');
  try{return await getEthAutomaticModel();}
  catch(error){
    const fallback=(snapshot as CapitalFlowAssetPreview[]).find(model=>model.id==='eth')!;
    return {...fallback,refreshStatus:'unavailable',lastRefreshError:error instanceof Error?error.message:'Fuente no disponible'};
  }
}
