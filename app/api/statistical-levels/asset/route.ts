import { getStatisticalLevelsManifest, getStatisticalLevelsAsset, getStatisticalLevelsAssetSeasonality } from '@/lib/statistical-levels/get-statistical-levels-data';
import { createRuntimeSnapshot, parseRuntimeAssetQuery, validateRuntimeAsset, RUNTIME_SCHEMA } from '@/lib/statistical-levels/runtime-snapshot';

export async function GET(request:Request){
  try {
    const manifest=await getStatisticalLevelsManifest();
    const input=parseRuntimeAssetQuery(new URL(request.url),manifest);
    const snapshot=await createRuntimeSnapshot(manifest,getStatisticalLevelsAsset,getStatisticalLevelsAssetSeasonality);
    if(input.snapshot!==snapshot.id)return Response.json({error:'SNAPSHOT_CHANGED'},{status:409,headers:{'Cache-Control':'no-store'}});
    const [asset,seasonality]=await Promise.all([getStatisticalLevelsAsset(input.ticker),getStatisticalLevelsAssetSeasonality(input.ticker)]);
    const payload={schema:RUNTIME_SCHEMA,ticker:input.ticker,snapshot:snapshot.id,asset,seasonality};
    await validateRuntimeAsset(payload,input.ticker,snapshot);
    return Response.json(payload,{headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }catch{
    return Response.json({error:'ASSET_REQUEST_REJECTED'},{status:400,headers:{'Cache-Control':'no-store'}});
  }
}
