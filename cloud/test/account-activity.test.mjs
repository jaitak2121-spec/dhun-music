import test from 'node:test';
import assert from 'node:assert/strict';
import {accountActivityInput,ACCOUNT_ACTIVITY_POLICY_VERSION} from '../lib/account-activity.mjs';
import {browserApproval,browserActivityApproval} from '../lib/browser-connection.mjs';
test('account activity accepts only platform/version and binds explicit consent to the signed connection',()=>{
  assert.deepEqual(accountActivityInput({platform:'android',version:'1.7.1-preview.42'}),{platform:'android',version:'1.7.1-preview.42'});
  for(const body of [null,[],{}, {platform:'web',version:'1'}, {platform:'mac',version:'x'}, {platform:'mac',version:'1',userId:'other'}, {platform:'mac',version:'1',song:'private'}])assert.throws(()=>accountActivityInput(body));
  for(const agree of [true,false])assert.doesNotThrow(()=>accountActivityInput({agree,policyVersion:ACCOUNT_ACTIVITY_POLICY_VERSION},true));
  for(const body of [{agree:'true',policyVersion:ACCOUNT_ACTIVITY_POLICY_VERSION},{agree:true,policyVersion:'old'},{agree:true,policyVersion:ACCOUNT_ACTIVITY_POLICY_VERSION,userId:'other'}])assert.throws(()=>accountActivityInput(body,true));
  process.env.DHUN_COOKIE_SECRET='test-only-secret';const now=Date.now(),code='A1B2C3D4',signed=browserApproval(code,now,true);
  assert.equal(browserActivityApproval(signed,code,now),ACCOUNT_ACTIVITY_POLICY_VERSION);
  assert.equal(browserActivityApproval(browserApproval(code,now),code,now),null);
  assert.equal(browserActivityApproval(signed,code,now+300000),null);
  assert.equal(browserActivityApproval(signed.replace('2026-11-19','2026-11-18'),code,now),null);
  assert.equal(browserActivityApproval(signed,'B1B2C3D4',now),null);
});
