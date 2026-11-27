import 'server-only';
import seed from './eth-flow-history-seed.json';
import recovered from './eth-flow-recovered-closes.json';
import {fetchEthFundFeed,mergeEthFlowHistory,buildEthAutomaticModel} from './eth-capital-flows-source.mjs';
import type {EthHistory,EthFeed} from './eth-capital-flows-source.mjs';
import {CapitalFlowSourceError} from './capital-flows-source.mjs';
import {createDurableFlowPublisher} from './durable-flow-publication.mjs';
import {privateFlowStore} from './private-flow-store';

const historySeed={...seed,points:[...seed.points,...recovered.points],recovery:recovered.provenance} as EthHistory;
const publication=createDurableFlowPublisher({id:'eth',store:privateFlowStore('eth'),seed:historySeed,retainAll:true,
  fetchSource:fetchEthFundFeed,
  build:(previous,raw,asOf)=>{
    const feed=raw as EthFeed;
    const history=mergeEthFlowHistory(previous,feed,asOf);
    return {history,model:buildEthAutomaticModel(history,feed,asOf)};
  },
});
export async function getEthAutomaticModel(force=false){
  try{return await publication(force);}
  catch(error){
    if(error instanceof Error&&'digest' in error)throw error;
    throw new CapitalFlowSourceError(`ETH source unavailable: ${error instanceof Error?error.message:'unknown error'}`);
  }
}
