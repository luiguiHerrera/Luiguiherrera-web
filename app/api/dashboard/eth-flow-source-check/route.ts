import { extractEthRows } from '@/scripts/research/eth-etf-flows-preview.mjs';
import { buildEthFlowPreview } from '@/lib/dashboard/eth-etf-flows-preview.mjs';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';
export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') return new Response(null, {status:404});
  const url = 'https://farside.co.uk/ethereum-etf-flow-all-data/';
  try {
    const response = await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'LuiguiHerreraDashboard/1.0 (+https://www.luiguiherrera.com)',Accept:'text/html'}});
    if (!response.ok) return Response.json({source:url,status:response.status,automatic:false},{status:502});
    const chunks:Uint8Array[]=[]; let size=0;
    if (!response.body) throw new Error('Empty source');
    const reader=response.body.getReader(); try { for (;;) { const {value,done}=await reader.read(); if(done)break; size+=value.length; if(size>2_000_000)throw new Error('Oversized source');chunks.push(value); } } finally {await reader.cancel();}
    const model=buildEthFlowPreview({source:url,units:'USD millions',retrievedAt:new Date().toISOString(),rows:extractEthRows(Buffer.concat(chunks).toString('utf8'))});
    return Response.json({source:url,status:response.status,cutoffDate:model.cutoffDate,sessions:model.points.length,coverage:model.coverage,latest:model.points.at(-1)?.flow,automatic:true});
  } catch(error) {return Response.json({source:url,automatic:false,reason:error instanceof Error?error.message:'Unavailable'},{status:503});}
}
