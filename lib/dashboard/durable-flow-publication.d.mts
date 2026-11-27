import type {CapitalFlowAssetPreview} from './capital-flows-preview-types';
import type {EthHistory} from './eth-capital-flows-source.mjs';
export type DurableFlowArchive={schemaVersion:1;id:string;history:EthHistory;model:CapitalFlowAssetPreview;checkedAt:string;lastRefreshError?:string;revisions:{date:string;previous:number;revised:number;reason:string;sourceHash?:string;retrievedAt:string}[]};
export type DurableFlowStore={read():Promise<{value:DurableFlowArchive;etag:string}|null>;write(value:DurableFlowArchive,etag?:string):Promise<void>;isConflict(error:unknown):boolean};
export function createDurableFlowPublisher(options:{id:string;store:DurableFlowStore;seed:EthHistory;fetchSource:()=>Promise<unknown>;build:(history:EthHistory,feed:unknown,asOf:string)=>{history:EthHistory;model:CapitalFlowAssetPreview};intervalMs?:number;retainAll?:boolean;now?:()=>number}):(force?:boolean)=>Promise<CapitalFlowAssetPreview>;
