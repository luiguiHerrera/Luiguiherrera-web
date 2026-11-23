export const runtime='nodejs';
export const maxDuration=45;
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview')return new Response(null,{status:404});
 const url='https://mcp.cryptoetf.today/mcp';let session='';
 async function rpc(method:string,params:Record<string,unknown>,id?:number){
  const response=await fetch(url,{method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(session?{'Mcp-Session-Id':session,'MCP-Protocol-Version':'2025-03-26'}:{})},body:JSON.stringify({jsonrpc:'2.0',method,params,...(id?{id}:{})})});
  const sid=response.headers.get('mcp-session-id');if(sid)session=sid;
  if(!response.ok)throw new Error('MCP HTTP '+response.status);
  if(response.status===202)return null;
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty MCP body');
  const chunks:Uint8Array[]=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2000000)throw new Error('Oversize MCP body');chunks.push(value);}}finally{await reader.cancel();}
  const text=Buffer.concat(chunks).toString('utf8');
  const json=(response.headers.get('content-type')??'').includes('text/event-stream')?text.split('\n').filter(line=>line.startsWith('data:')).map(line=>JSON.parse(line.slice(5))).find(item=>item.id===id):JSON.parse(text);
  if(json?.error)throw new Error(JSON.stringify(json.error));return json?.result;
 }
 try{
  await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'LuiguiHerreraDashboard',version:'1.0'}},1);
  await rpc('notifications/initialized',{});
  const list=await rpc('tools/list',{},2);
  const tool=list.tools.find((t:{name:string})=>t.name==='get_fund_flows');
  if(!tool)throw new Error('Published fund tool not available');
  const result=await rpc('tools/call',{name:tool.name,arguments:{asset:'ETH'}},3);
  return Response.json({source:url,schema:tool.inputSchema,data:result});
 }catch(error){return Response.json({source:url,error:error instanceof Error?error.message:'Unavailable'},{status:503});}
}
