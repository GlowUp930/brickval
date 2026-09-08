import assert from "node:assert/strict";
// Runs actual backend modules with controlled auth/database/provider boundaries.
// No live backend, provider, account, or subscription writes are made.
// Regression assertions cover local boundaries; they do not prove live integrations.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
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
let checks = 0;
function check(actual, expected) { assert.deepEqual(actual, expected); checks++; }
try {
  process.env.REVENUECAT_WEBHOOK_SECRET = 'audit-local-only';
  process.env.BRICKVALUE_NOTIFICATIONS_ENABLED = 'false';
  let pro = true, version = 0, current = true;
  globalThis.bvAudit.current = () => current;
  globalThis.bvAudit.db = {async rpc(name, args) {
    if (args.p_version_ms > version) { pro=args.p_active; version=args.p_version_ms; }
    return {data:true,error:null};
  }};
  const rc = await load('src/app/api/webhook/revenuecat/route.ts', {
    '@/lib/revenuecat-entitlement': `export async function fetchRevenueCatProEntitlement(){return globalThis.bvAudit.current();}`,
    '@/lib/apns': `export async function sendAPNsAlert(){throw new Error('Unexpected notification');}`,
  });
  async function webhook(type, timestamp) {
    const req=request({event:{id:`event-${type}`,type,app_user_id:'audit-user',entitlement_ids:['pro'],event_timestamp_ms:timestamp}});
    req.headers.set('authorization','Bearer audit-local-only');
    return (await rc.POST(req)).status;
  }
  check(await webhook('PRODUCT_CHANGE',200),200); check(pro,true);
  check(await webhook('BILLING_ISSUE',201),200); check(pro,true);
  current=false; check(await webhook('EXPIRATION',300),200); check(pro,false);
  current=true; await webhook('RENEWAL',100); check(pro,false);
  current=null; check(await webhook('RENEWAL',400),503); check(pro,false);

  process.env.STRIPE_WEBHOOK_SECRET='audit-local-only';
  globalThis.bvAudit.db={async rpc(){return {error:{message:'simulated outage'}};}};
  const stripe = await load('src/app/api/webhook/route.ts', {
    '@/lib/stripe': `export const stripe={webhooks:{constructEvent(){return {id:'evt',created:1,type:'customer.subscription.updated',data:{object:{id:'sub'}}};}},subscriptions:{async retrieve(){return {id:'sub',status:'active',customer:'cus',metadata:{clerk_user_id:'audit-user'}};}}};`,
  });
  const sr=request({}); sr.headers.set('stripe-signature','test');
  check((await stripe.POST(sr)).status,500);

  const pricing=await load('src/lib/compute-pricing.ts');
  const ebay={new_sales:[{price_usd:100}],used_sales:[{price_usd:80}],data_source:'listing'};
  const e=pricing.computePricing(ebay,null,'12345',false).pricing;
  check(e.hero_new_avg_usd,100); check(e.hero_used_avg_usd,80);check(e.new_data_source,'listing');
  const b=pricing.computePricing(ebay,{sold_new:{avg_price:'90'}},'12345',false).pricing;
  check(b.data_source,'sold');check(b.used_data_source,'listing');

  const scanAccess=await load('src/lib/scan-request-access.ts',{'@clerk/nextjs/server':auth});
  process.env.BRICKVALUE_RECOVERY_SECRET='audit-only';
  process.env.NODE_ENV='test'; delete process.env.VERCEL;
  globalThis.bvAudit.userId=null;
  let budget=true, unavailable=false;
  globalThis.bvAudit.db={async rpc(){return unavailable ? {error:'outage'} : {data:budget};},from(){return {async upsert(){return {error:null};},select(){const q={eq(){return q;},gt(){return q;},async maybeSingle(){return {data:null};}};return q;}};}};
  const guest=await scanAccess.scanRequestAccess(request({}));
  check(guest.userId.startsWith('guest:'),true);
  budget=false; check((await scanAccess.scanRequestAccess(request({}))).status,429);
  unavailable=true; check((await scanAccess.scanRequestAccess(request({}))).status,503);
  const expired=request({});expired.headers.set('authorization','Bearer expired');
  check((await scanAccess.scanRequestAccess(expired)).status,401);

  const region=await load('src/app/api/minifig/bulk-scan/identify-region/route.ts',{
    '@/lib/scan-request-access':`export async function scanRequestAccess(){return {userId:'audit-user'};}`,
    '@/lib/backend-error-reporting':`export async function reportBulkScanError(){}`,
    '@/lib/bulk-scan-session':`export function verifyBulkScanSession(){return {expiresAt:9999999999,scanSource:'camera',regionIds:['r1']};}`,
    '@/lib/brickognize':`export class BrickognizeUnavailableError extends Error{}; export async function identifyNonSet(){return {detections:[{id:'fig1',score:0.99,item_type:'minifig'}]};}`,
    '@/lib/bulk-minifig-lookup':`export async function lookupBulkMinifigures(){return [{figNumber:'fig1',result:{name:'figure',pricing:{hero_new_avg_usd:12}}}];}`,
    '@/lib/scan-gate':`export async function authorizeBulkScan(){globalThis.bvAudit.decisions++;return {allowed:false,usage:{}};} export async function consumeFeatureUsage(){throw new Error('Non-idempotent charging');}`,
  });
  globalThis.bvAudit.decisions=0;globalThis.bvAudit.db={async rpc(){return {data:true};}};
  function crop(){const f=new FormData();f.set('image',new Blob(['test'],{type:'image/jpeg'}),'crop.jpg');f.set('regionId','r1');f.set('sessionToken','signed-fixture');return new Request('http://localhost/identify-region',{method:'POST',body:f});}
  check((await region.POST(crop())).status,402);check((await region.POST(crop())).status,402);check(globalThis.bvAudit.decisions,2);
  const gate=await load('src/lib/scan-gate.ts');
  globalThis.bvAudit.db={from(){return {async upsert(){throw new Error('simulated outage');}};}};
  await assert.rejects(gate.consumeFeatureUsage('audit-user','bulk_scan'));checks++;

  const cache=await load('src/lib/cache.ts');let warnings=0;const warn=console.warn;
  console.warn=()=>warnings++;
  globalThis.bvAudit.db={from(){return {delete(){return {async lt(){return {error:{code:'outage'}};}};},async upsert(){return {error:{code:'outage'}};}};}};
  try {await cache.setCached('test',{});} finally {console.warn=warn;}
  check(warnings>0,true);
  const referrals=await load('src/lib/referrals.ts');let created=null;
  globalThis.bvAudit.db={from(table){if(table==='account_deletion_requests'){const q={select(){return q;},eq(){return q;},gt(){return q;},async maybeSingle(){return {data:null};}};return q;} return table==='users' ? {async upsert(){return {error:null};}} : {
    select(){const captured=created;const query={eq(){return query;},async maybeSingle(){return {data:captured ? {code:captured} : null};}};return query;},
    async insert(row){if(created)return {error:{code:'23505'}};created=row.code;return {error:null};},
  };}};
  const codes=await Promise.all([referrals.getOrCreateReferralCode('owner'),referrals.getOrCreateReferralCode('owner')]);check(codes[0],codes[1]);
  const deletion=await load('src/app/api/delete-account/route.ts', {
    '@clerk/nextjs/server': `export async function auth(){return {userId:'audit-user'};} export async function clerkClient(){return {users:{async deleteUser(){if(globalThis.bvAudit.deletionFails)throw new Error('provider outage');}}};}`,
    '@/lib/supabase': `export function getSupabase(){return globalThis.bvAudit.db;}`,
  });
  globalThis.bvAudit.db={async rpc(){return {error:null};},from(){return {update(){return {async eq(){return {error:{message:'receipt unavailable'}};}};}};}};
  check((await deletion.POST()).status,200);
  globalThis.bvAudit.deletionFails=true;
  check((await deletion.POST()).status,503);
  console.log(`${checks} reliability backend assertions passed.`);
} finally {
  globalThis.fetch=originalFetch;delete globalThis.bvAudit;
  await rm(temp,{recursive:true,force:true});
}
