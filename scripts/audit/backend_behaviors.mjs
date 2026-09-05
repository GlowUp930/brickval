// Runs actual backend modules with controlled auth/database/provider boundaries.
// No live backend, provider, account, or subscription writes are made.
// Observations characterize current behavior; they are not passing acceptance tests.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const temp = await mkdtemp(join(tmpdir(), 'bv-audit-backend-'));
const require = createRequire(import.meta.url);
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('Unexpected outbound network request in audit'); };
globalThis.bvAudit = {};
const next = `export const NextRequest = Request; export class NextResponse extends Response { static json(data, init) { return new NextResponse(JSON.stringify(data), init); } }`;
const auth = `export async function auth() { return {userId: globalThis.bvAudit.userId}; }`;
const db = `export const supabase = new Proxy({}, { get(_, key) { return globalThis.bvAudit.db[key]; } });`;
let serial = 0;
async function load(path, mocks = {}) {
  const outfile = join(temp, `${serial++}.cjs`);
  const replacements = {'next/server': next, './supabase': db, '@/lib/supabase': db, ...mocks};
  await build({entryPoints:[resolve(root,path)], outfile, bundle:true, platform:'node', format:'cjs',
    packages:'external', tsconfig:resolve(root,'tsconfig.json'), logLevel:'silent',
    plugins:[{name:'audit-boundaries', setup(builder) {
      builder.onResolve({filter:/.*/}, args => Object.hasOwn(replacements,args.path) ? {path:args.path, namespace:'audit'} : undefined);
      builder.onLoad({filter:/.*/,namespace:'audit'}, args => ({contents:replacements[args.path],loader:'js'}));
    }}]});
  return require(outfile);
}
const request = body => new Request('http://localhost/audit', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
const result = {};
try {
  process.env.REVENUECAT_WEBHOOK_SECRET = 'audit-local-only';
  process.env.BRICKVALUE_NOTIFICATIONS_ENABLED = 'false';
  let pro = true;
  globalThis.bvAudit.db = {from() {return {async upsert(row) {pro=row.is_pro; return {error:null};}};}};
  const rc = await load('src/app/api/webhook/revenuecat/route.ts', {
    '@/lib/supabase':db, '@/lib/apns':`export async function sendAPNsAlert(){ throw new Error('Unexpected notification'); }`,
  });
  async function webhook(type, timestamp) {
    const req=request({event:{id:`test-${type}`,type,app_user_id:'audit-user',entitlement_ids:['pro'],event_timestamp_ms:timestamp}});
    req.headers.set('authorization','Bearer audit-local-only');
    return (await rc.POST(req)).status;
  }
  await webhook('PRODUCT_CHANGE',200);
  result.product_change_revokes_active_pro = !pro;
  pro=true;
  await webhook('BILLING_ISSUE',200);
  result.billing_issue_revokes_without_checking_grace = !pro;
  await webhook('EXPIRATION',300);
  await webhook('RENEWAL',100);
  result.older_renewal_overwrites_newer_expiration = pro;

  const stripe = await load('src/app/api/webhook/route.ts', {
    '@/lib/supabase':db,
    '@/lib/stripe':`export const stripe={webhooks:{constructEvent(){ return {type:'customer.subscription.updated',data:{object:{status:'active',customer:'customer',metadata:{clerk_user_id:'audit-user'}}}}; }}};`,
  });
  process.env.STRIPE_WEBHOOK_SECRET='audit-local-only';
  globalThis.bvAudit.db={from(){return {async upsert(){return {error:{message:'simulated database outage'}};}};}};
  const stripeRequest=request({}); stripeRequest.headers.set('stripe-signature','local-audit-signature');
  result.stripe_database_failure_http_status=(await stripe.POST(stripeRequest)).status;

  const pricing = await load('src/lib/compute-pricing.ts');
  const computed = pricing.computePricing({new_sales:[{price_usd:100}],used_sales:[],data_source:'sold'},null,'12345',false,80);
  result.ebay_only_set_payload = computed.pricing;
  const mixed = pricing.computePricing({new_sales:[{price_usd:120}],used_sales:[],data_source:'listing'},
    {sold_new:{avg_price:'100',min_price:'90',max_price:'110',unit_quantity:3}},'12345',false,80);
  result.bricklink_sold_price_labeled_as = mixed.pricing.data_source;

  globalThis.bvAudit.userId=null;
  const noReporting=`export async function reportBulkScanError() {}`;
  const start = await load('src/app/api/minifig/bulk-scan/start/route.ts', {
    '@clerk/nextjs/server':auth, '@/lib/backend-error-reporting':noReporting,
    '@/lib/bulk-scan-input':`export function parseBulkScanInput(){return {ok:true,value:{image:{type:'image/jpeg',size:10},regions:[{regionId:'r1'}],scanSource:'camera'}};}`,
    '@/lib/google-vision-localizer':`export function googleVisionObjectLocalizationEnabled(){return false;} export async function localizeObjectsWithGoogleVision(){throw new Error('unexpected provider');}`,
    '@/lib/scan-gate':`export async function checkFeatureAccess(){globalThis.bvAudit.gateCalls++;return {allowed:false};}`,
  });
  globalThis.bvAudit.gateCalls=0;
  process.env.BRICKVALUE_RECOVERY_SECRET='local-audit-secret';
  const startRequest=new Request('http://localhost/audit',{method:'POST',body:new FormData()});
  const startResponse=await start.POST(startRequest);
  const session=await startResponse.json();
  result.anonymous_start={status:startResponse.status,sessionIssued:!!session.sessionToken,gateCalls:globalThis.bvAudit.gateCalls};

  const region = await load('src/app/api/minifig/bulk-scan/identify-region/route.ts', {
    '@clerk/nextjs/server':auth, '@/lib/backend-error-reporting':noReporting, '@/lib/supabase':db,
    '@/lib/bulk-scan-session':`export function verifyBulkScanSession(){return {scanSource:'camera',regionIds:['r1','r2']};}`,
    '@/lib/brickognize':`export class BrickognizeUnavailableError extends Error {} export async function identifyNonSet(){return {detections:[{id:'fig1',score:0.99,item_type:'minifig'}]};}`,
    '@/lib/bulk-minifig-lookup':`export async function lookupBulkMinifigures(){return [{figNumber:'fig1',result:{name:'audit figure',pricing:{hero_new_avg_usd:12}}}];}`,
    '@/lib/scan-gate':`export async function consumeFeatureUsage(){globalThis.bvAudit.debitCalls++;return {allowed:false,usage:{}};}`,
  });
  let debitLocks=0;
  globalThis.bvAudit.db={async rpc(name,args){return {data:args.p_limit===1 ? ++debitLocks===1 : true,error:null};}};
  globalThis.bvAudit.debitCalls=0;
  function crop() { const f=new FormData(); f.set('image',new Blob(['audit'],{type:'image/jpeg'}),'crop.jpg');f.set('regionId','r1');f.set('sessionToken','valid-session-fixture');return new Request('http://localhost/audit',{method:'POST',body:f}); }
  const anonymousRegion=await region.POST(crop());
  result.anonymous_priced_region={status:anonymousRegion.status,debitCalls:globalThis.bvAudit.debitCalls};
  globalThis.bvAudit.userId='audit-user';
  const first=await region.POST(crop()); const second=await region.POST(crop());
  result.denied_session_followup={firstStatus:first.status,secondStatus:second.status,secondBody:await second.json(),debitCalls:globalThis.bvAudit.debitCalls};

  globalThis.bvAudit.db={from(){return {async upsert(){throw new Error('simulated outage');}, select(){throw new Error('simulated outage');}};}};
  const gate=await load('src/lib/scan-gate.ts',{'./supabase':db});
  result.database_outage_allows_bulk=(await gate.consumeFeatureUsage('audit-user','bulk_scan')).allowed;
  const cache = await load('src/lib/cache.ts');
  let cacheWarnings=0;
  const originalWarn=console.warn;
  console.warn=()=>{cacheWarnings++;};
  globalThis.bvAudit.db={from(){return {delete(){return {async lt(){return {error:{message:'database failure'}};}};},async upsert(){return {error:{message:'database failure'}};}};}};
  try {
    await cache.setCached('audit-cache',{value:1});
    result.failed_cache_write_resolves_without_warning=cacheWarnings===0;
  } finally {console.warn=originalWarn;}

  const referrals=await load('src/lib/referrals.ts');
  let created=false;
  globalThis.bvAudit.db={from(table){return table==='users' ? {async upsert(){return {error:null};}} : {
    select(){const query={eq(){return query;},async maybeSingle(){return {data:null,error:null};}};return query;},
    async insert(){if(created)return {error:{code:'23505'}};created=true;return {error:null};},
  };}};
  result.concurrent_code_creation_results=(await Promise.allSettled([
    referrals.getOrCreateReferralCode('audit-owner'), referrals.getOrCreateReferralCode('audit-owner'),
  ])).map(x=>x.status);
  console.log(JSON.stringify(result,null,2));
} finally {
  globalThis.fetch=originalFetch;
  delete globalThis.bvAudit;
  await rm(temp,{recursive:true,force:true});
}
