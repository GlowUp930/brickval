#!/usr/bin/env python3
"""Reproduce referral behavior against repository SQL in a disposable local PostgreSQL.

Requires PostgreSQL binaries; set BRICKVAL_AUDIT_PG_BIN if not using Homebrew 17.
Never connects to Supabase. Outputs observations, including known defects, not a release gate.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BIN = Path(os.environ.get('BRICKVAL_AUDIT_PG_BIN', '/opt/homebrew/opt/postgresql@17/bin'))

def run(*args, **kwargs):
    result = subprocess.run(args, text=True, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()

with tempfile.TemporaryDirectory(prefix='bv-audit-') as directory:
    base = Path(directory)
    data = base / 'data'
    run(str(BIN / 'initdb'), '-D', str(data), '-A', 'trust', '--no-locale', '-E', 'UTF8')
    run(str(BIN / 'pg_ctl'), '-D', str(data), '-l', str(base / 'postgres.log'),
        '-o', f"-k {base} -h '' -p 55439", '-w', 'start')
    try:
        def sql(query):
            return run(str(BIN / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                       '-h', str(base), '-p', '55439', '-d', 'postgres', input=query)

        # Only the unrelated Supabase bucket catalog is stubbed. Referral tables/RPCs are exact source.
        sql('CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean);')
        sql((ROOT / 'supabase/schema.sql').read_text())
        observations = {}
        sql("INSERT INTO users(id) VALUES ('owner'),('a'),('b'),('c'),('d'),('e'); INSERT INTO referral_codes(referrer_user_id,code) VALUES ('owner','ABCD2345');")
        observations['self_referral'] = json.loads(sql("SELECT claim_referral_code('owner','ABCD2345','self');"))
        observations['invalid_code'] = json.loads(sql("SELECT claim_referral_code('a','ZZZZ9999','a');"))
        for user in ['a', 'b', 'c']:
            sql(f"SELECT claim_referral_code('{user}','ABCD2345','device-{user}');")
        observations['claimed_not_qualified_balance'] = sql("SELECT count(*) FROM referral_credit_ledger;")
        observations['duplicate_account'] = json.loads(sql("SELECT claim_referral_code('a','ABCD2345','new-device');"))
        observations['duplicate_installation'] = json.loads(sql("SELECT claim_referral_code('d','ABCD2345','device-a');"))
        for user in ['a', 'b', 'c']:
            sql(f"SELECT qualify_referral('{user}','onboarding_completed');")
        observations['sequential_three_balance'] = sql("SELECT sum(amount) FROM referral_credit_ledger WHERE user_id='owner';")
        sql("SELECT qualify_referral('c','onboarding_completed');")
        sql("SELECT claim_referral_code('d','ABCD2345','device-d'); SELECT qualify_referral('d','onboarding_completed');")
        observations['repeat_and_fourth_friend_balance'] = sql("SELECT sum(amount) FROM referral_credit_ledger WHERE user_id='owner';")
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            debits = list(pool.map(lambda _: sql("SELECT consume_referral_bulk_credit('owner');"), range(8)))
        observations['concurrent_debit_successes'] = debits.count('t')
        observations['concurrent_debit_balance'] = sql("SELECT sum(amount) FROM referral_credit_ledger WHERE user_id='owner';")
        sql("UPDATE users SET is_pro=true WHERE id='owner';")
        observations['pro_usage_bypasses_free_limit'] = json.loads(sql("SELECT consume_feature_usage('owner','bulk_scan','lifetime',1);"))

        # Hold both transactions open after qualification. They see only one committed
        # friend plus their own completion, so neither sees the threshold of three.
        sql("INSERT INTO users(id) VALUES ('race-owner'),('r1'),('r2'),('r3'); INSERT INTO referral_codes(referrer_user_id,code) VALUES ('race-owner','RACE2345');")
        for user in ['r1', 'r2', 'r3']:
            sql(f"SELECT claim_referral_code('{user}','RACE2345','device-{user}');")
        sql("SELECT qualify_referral('r1','onboarding_completed');")
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda user: sql(f"BEGIN; SELECT qualify_referral('{user}','onboarding_completed'); SELECT pg_sleep(2); COMMIT;"), ['r2', 'r3']))
        observations['simultaneous_qualified_count'] = sql("SELECT count(*) FROM referral_attributions WHERE referrer_user_id='race-owner' AND status='qualified';")
        observations['simultaneous_reward_rows'] = sql("SELECT count(*) FROM referral_rewards WHERE referrer_user_id='race-owner';")
        sql("SELECT qualify_referral('r2','onboarding_completed'); SELECT qualify_referral('r3','onboarding_completed');")
        observations['replay_repairs_missing_reward'] = sql("SELECT count(*) FROM referral_rewards WHERE referrer_user_id='race-owner';")
        sql("DELETE FROM users WHERE id='a';")
        observations['deleted_installation_reusable'] = json.loads(sql("SELECT claim_referral_code('e','ABCD2345','device-a');"))
        sql("INSERT INTO users(id) VALUES ('new-account');")
        observations['new_account_can_self_grandfather'] = sql("SELECT claim_bulk_intro_grandfathering('new-account','arbitrary-new-device');")
        sql("INSERT INTO users(id) VALUES ('schema-rerun-new');")
        sql((ROOT / 'supabase/schema.sql').read_text())
        observations['schema_rerun_grandfathers_new_users'] = sql("SELECT bulk_intro_grandfathered FROM users WHERE id='schema-rerun-new';")
        # A retry uses the same durable authorization and never spends twice.
        sql("INSERT INTO users(id) VALUES ('session-owner'); INSERT INTO referral_credit_ledger(user_id,amount,reason) VALUES ('session-owner',3,'fixture');")
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda _: sql("SELECT authorize_bulk_scan('session-owner','one-session',1,now()+interval '10 minutes');"), range(8)))
        assert results == ['t']*8, results
        assert sql("SELECT sum(amount) FROM referral_credit_ledger WHERE user_id='session-owner';") == '2'
        sql("UPDATE users SET is_pro=true WHERE id='session-owner';")
        assert sql("SELECT authorize_bulk_scan('session-owner','pro-session',1,now()+interval '10 minutes');") == 't'
        assert sql("SELECT sum(amount) FROM referral_credit_ledger WHERE user_id='session-owner';") == '2'
        sql("UPDATE users SET is_pro=false WHERE id='session-owner';")
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(lambda n: sql(f"SELECT authorize_bulk_scan('session-owner','session-{n}',1,now()+interval '10 minutes');"), range(8)))
        assert results.count('t') == 2, results
        assert sql("SELECT sum(amount) FROM referral_credit_ledger WHERE user_id='session-owner';") == '0'
        sql("SELECT apply_subscription_entitlement('payer','revenuecat',true,100,'rc1'); SELECT apply_subscription_entitlement('payer','stripe:sub',true,100,'s1'); SELECT apply_subscription_entitlement('payer','revenuecat',false,200,'rc2');")
        assert sql("SELECT is_pro FROM users WHERE id='payer';") == 't'
        sql("SELECT apply_subscription_entitlement('payer','stripe:sub',false,200,'s2'); SELECT apply_subscription_entitlement('payer','revenuecat',true,100,'old');")
        assert sql("SELECT is_pro FROM users WHERE id='payer';") == 'f'

        sql("SELECT stage_account_deletion('e'); INSERT INTO users(id) VALUES ('f');")
        deleted_claim = json.loads(sql("SELECT claim_referral_code('f','ABCD2345','device-a');"))
        assert deleted_claim['status'] == 'installation_already_used'
        sql("SELECT stage_account_deletion('e');")  # retry is safe
        assert sql("SELECT count(*) FROM users WHERE id='e';") == '0'
        sql("SELECT apply_subscription_entitlement('e','revenuecat',true,999,'late-webhook');")
        assert sql("SELECT count(*) FROM users WHERE id='e';") == '0'

        # Restore the observed old production functions and missing columns locally.
        old = json.loads((ROOT / 'tests/fixtures/reliability-production-functions.json').read_text())
        for row in old:
            sql(row['definition'])
        sql("ALTER TABLE users DROP COLUMN bulk_intro_grandfathered; ALTER TABLE users DROP COLUMN bulk_intro_installation_hash; ALTER TABLE referral_attributions DROP COLUMN installation_hash; ALTER TABLE notification_devices DROP COLUMN language_code;")
        migration = (ROOT / 'supabase/migrations/20260905000000_reliability_repair.sql').read_text()
        sql("INSERT INTO users(id,created_at) VALUES ('historical','2026-08-01');")
        sql(migration)
        sql(migration)
        assert sql("SELECT bulk_intro_grandfathered FROM users WHERE id='historical';") == 't'
        assert sql("SELECT bulk_intro_grandfathered FROM users WHERE id='new-account';") == 'f'
        assert sql("SELECT count(*) FROM referral_rewards WHERE referrer_user_id='race-owner';") == '1'
        assert observations['simultaneous_reward_rows'] == '1'
        assert observations['replay_repairs_missing_reward'] == '1'
        assert observations['new_account_can_self_grandfather'] == 'f'
        assert observations['schema_rerun_grandfathers_new_users'] == 'f'
        assert observations['concurrent_debit_successes'] == 3
        assert observations['repeat_and_fourth_friend_balance'] == '3'
        print('Referral concurrency, idempotent session charges, Pro credit preservation, provider ordering, and old-schema migration/replay passed.')
    finally:
        run(str(BIN / 'pg_ctl'), '-D', str(data), '-m', 'fast', '-w', 'stop')
