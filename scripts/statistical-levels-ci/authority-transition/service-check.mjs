// Representative GitHub Check response. IDs/URLs are synthetic test data only.
export function serviceCheck(body,id=13001) {
  const base='https://api.github.com/repos/luiguiHerrera/Luiguiherrera-web/check-runs/'+id;
  return {id,node_id:'CR_MODEL_ONLY',url:base,html_url:'https://github.com/luiguiHerrera/Luiguiherrera-web/runs/'+id,
    details_url:null,started_at:null,check_suite:{id:14001},pull_requests:[],deployment:null,
    app:{id:15368,slug:'github-actions',name:'GitHub Actions',node_id:'APP_MODEL_ONLY'},
    ...body,output:{...body.output,annotations_count:0,annotations_url:base+'/annotations'}};
}
