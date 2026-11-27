// The private file is authoritative; Next/Runtime caches are only accelerators.
export function createDurableFlowPublisher({id,store,seed,fetchSource,build,intervalMs=3_600_000,retainAll=false,now=Date.now}) {
  let pending;
  async function publish(force) {
    let stored=await store.read();
    const instant=now(),asOf=new Date(instant).toISOString();
    const valid=entry=>entry?.value.schemaVersion===1&&entry.value.id===id
      &&Array.isArray(entry.value.history?.points)&&entry.value.history.points.length>0
      &&entry.value.model?.id===id&&entry.value.model.cutoffDate
      &&Number.isFinite(Date.parse(entry.value.checkedAt));
    if(stored&&!valid(stored))throw new Error('Invalid durable flow archive');
    if(!force&&stored&&instant-Date.parse(stored.value.checkedAt)<(stored.value.lastRefreshError?60_000:intervalMs)) {
      return result(stored.value);
    }
    let feed,failure;
    try{feed=await fetchSource();}catch(error){failure=error;}
    for(let attempt=0;attempt<4;attempt++) {
      const previous=stored?.value;
      let candidate;
      try {
        if(failure)throw failure;
        const {history,model}=build(previous?.history??seed,feed,asOf);
        if(!model.cutoffDate||previous?.model.cutoffDate>model.cutoffDate)throw new Error('Provider cutoff moved backwards');
        const byDate=new Map(history.points.map(point=>[point.date,point]));
        const revisions=[...(previous?.revisions??[])];
        for(const old of (previous?.history??seed).points) {
          if(!old.complete||!retainAll&&old.date<history.points[0].date)continue;
          const next=byDate.get(old.date);
          if(!next?.complete||!Number.isFinite(next.flow))throw new Error(`Complete flow observation lost: ${old.date}`);
          if(next.flow!==old.flow)revisions.push({date:old.date,previous:old.flow,revised:next.flow,
            reason:'Complete provider revision',sourceHash:model.sourceHash,retrievedAt:asOf});
        }
        candidate={schemaVersion:1,id,history,model,checkedAt:asOf,revisions};
      } catch(error) {
        if(!previous)throw error;
        candidate={...previous,checkedAt:asOf,lastRefreshError:error instanceof Error?error.message:'Flow refresh failed'};
      }
      try {
        await store.write(candidate,stored?.etag);
        return result(candidate);
      } catch(error) {
        if(!store.isConflict(error))throw error;
        stored=await store.read();
        if(!valid(stored))throw new Error('Archive conflict could not be read');
        // An older acquisition must not undo a newer close or same-day revision.
        if(Date.parse(stored.value.checkedAt)>=instant)return result(stored.value);
      }
    }
    if(valid(stored))return {...result(stored.value),lastRefreshError:'Archive update conflict; retained latest validated publication'};
    throw new Error('Flow archive changed repeatedly during publication');
  }
  function result(archive) {
    return archive.lastRefreshError?{...archive.model,lastRefreshError:archive.lastRefreshError}:archive.model;
  }
  return function getPublication(force=false) {
    if(!pending)pending=publish(force).finally(()=>{pending=undefined;});
    return pending;
  };
}

