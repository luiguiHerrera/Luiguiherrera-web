import 'server-only';
import seed from './ewj-etf-flows-published.json';
import {fetchEwjFundFeed,buildEwjAutomaticModel} from './ewj-capital-flows-source.mjs';
import type {EwjHistory,EwjFundFeed} from './ewj-capital-flows-source.mjs';
import type {EthHistory} from './eth-capital-flows-source.mjs';
import {CapitalFlowSourceError} from './capital-flows-source.mjs';
import {createDurableFlowPublisher} from './durable-flow-publication.mjs';
import {privateFlowStore} from './private-flow-store';

const publication=createDurableFlowPublisher({id:'ewj',store:privateFlowStore('ewj'),
  seed:seed as unknown as EthHistory,intervalMs:86_400_000,fetchSource:fetchEwjFundFeed,
  build:(previous,raw,asOf)=>{
    const model=buildEwjAutomaticModel(previous as EwjHistory,raw as EwjFundFeed,asOf);
    return {history:model as unknown as EthHistory,model};
  },
});
export async function getEwjAutomaticModel(force=false) {
  try{return await publication(force);}
  catch(error){
    if(error instanceof Error&&'digest' in error)throw error;
    if(error instanceof CapitalFlowSourceError)throw error;
    throw new CapitalFlowSourceError(`EWJ source unavailable: ${error instanceof Error?error.message:'unknown error'}`);
  }
}
