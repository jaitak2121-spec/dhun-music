import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeSuggestions,searchSuggestions} from '../search-suggestions.mjs';
test('suggestions provide recent searches before typing and bounded unique completions while typing',()=>{
  assert.deepEqual(mergeSuggestions('', ['One','one','Two']),['One','Two']);
  assert.deepEqual(mergeSuggestions('da',['Daft Punk','Other'],['daft punk','Dancing','bad\nterm']),['da','Daft Punk','Dancing']);
  assert.equal(mergeSuggestions('x',[],Array.from({length:30},(_,i)=>`x ${i}`)).length,8);
});
test('source requests encode text and safely reject malformed or unavailable responses',async()=>{
  let destination;
  const rows=await searchSuggestions('a & b',{fetcher:async url=>{destination=url;return new Response(JSON.stringify(['a & b',['a and b','a and b','Another']]));}});
  assert.equal(destination.origin,'https://suggestqueries.google.com');assert.equal(destination.searchParams.get('q'),'a & b');assert.equal(destination.searchParams.get('ds'),'yt');
  assert.deepEqual(rows,['a and b','Another']);
  assert.deepEqual(await searchSuggestions('unavailable',{fetcher:async()=>{throw Error('offline');}}),[]);
  assert.deepEqual(await searchSuggestions('malformed',{fetcher:async()=>new Response('not JSON')}),[]);
  assert.deepEqual(await searchSuggestions('x',{fetcher:async()=>{throw Error('must not request one character');}}),[]);
  await assert.rejects(searchSuggestions('x'.repeat(161)));
});
