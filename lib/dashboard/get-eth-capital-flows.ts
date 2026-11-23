import 'server-only';
import {unstable_cache} from 'next/cache';
import seed from './eth-flow-history-seed.json';
import {fetchEthFundFeed,mergeEthFlowHistory,buildEthAutomaticModel,expectedEthFlowSession} from './eth-capital-flows-source.mjs';
import type {EthHistory} from './eth-capital-flows-source.mjs';
import {CapitalFlowSourceError} from './capital-flows-source.mjs';

export const ETH_ARCHIVE_TAG='dashboard-eth-flow-archive-v1';
const BOOTSTRAP_DAY='2026-11-23';
const getArchiveFeed=unstable_cache(()=>fetchEthFundFeed(),[ETH_ARCHIVE_TAG,'feed'],{revalidate:3600});
const previousDay=(day:string)=>new Date(Date.parse(`${day}T12:00:00Z`)-86_400_000).toISOString().slice(0,10);

// Dated internal entries retain prior observations across requests/deployments.
// Limit cold-cache reconstruction; unrecoverable exchange sessions remain explicit gaps.
const getEthArchive=unstable_cache(async(day:string):Promise<EthHistory>=>{
  const boundary=new Date(Date.now()-35*86_400_000).toISOString().slice(0,10);
  if(day<BOOTSTRAP_DAY||day<boundary)return seed as EthHistory;
  const previous=await getEthArchive(previousDay(day));
  const feed=await getArchiveFeed();
  return mergeEthFlowHistory(previous,feed,new Date().toISOString(),day);
},[ETH_ARCHIVE_TAG,'day'],{revalidate:false});

export async function getEthAutomaticModel(){
  try{
    const asOf=new Date().toISOString();
    const [previous,feed]=await Promise.all([getEthArchive(previousDay(asOf.slice(0,10))),fetchEthFundFeed()]);
    const model=buildEthAutomaticModel(previous,feed,asOf);
    if(!model.cutoffDate||model.cutoffDate<expectedEthFlowSession(asOf))throw new Error('Latest ETH T+1 report is not complete');
    return model;
  }catch(error){
    if(error instanceof Error&&'digest' in error)throw error;
    throw new CapitalFlowSourceError(`ETH source unavailable: ${error instanceof Error?error.message:'unknown error'}`);
  }
}
