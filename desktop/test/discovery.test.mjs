import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryQueries,diverseTracks,listeningTaste,discoverySeeds,discoveryShelves} from '../model.mjs';
const song=(n,title=`Song ${n}`,artist=`Artist ${n}`)=>({id:String(n).padStart(11,'0'),title,artist});
test('discovery requires explicit preferences and bounds untrusted IPC input',()=>{
  assert.deepEqual(discoveryQueries({language:'',artists:'',genres:''}),[]);
  assert.deepEqual(discoveryQueries({language:'Hindi',artists:' A, a, B, C, D ',genres:'acoustic'}),['A Hindi acoustic songs','B Hindi acoustic songs','C Hindi acoustic songs']);
  for(const input of [null,{},'bad',{language:3,artists:'',genres:''},{language:'x'.repeat(41),artists:'',genres:''}])assert.throws(()=>discoveryQueries(input));
});
test('seed interleaving, alternate upload deduplication, local exclusion and artist diversity',()=>{
  const a=song(1,'Hello (Official Audio)','A'),b=song(2,'Hello [Official Video]','A - Topic');
  const result=diverseTracks([[a,b,song(3,'Three','A'),song(4,'Four','A'),song(5,'Five','A')],[song(8),song(9),{...song(10),local:true}]], [song(9).id]);
  assert.deepEqual(result.map(s=>s.id),[a.id,song(8).id,song(3).id,song(4).id]);
  assert.deepEqual(diverseTracks([[a]],[],0),[]);
});

test('listening seeds favour qualified plays and favourites while early skips reduce preference',()=>{
  const taste={language:'Hindi',artists:'Chosen',genres:'acoustic'};
  const signals=[{id:song(1).id,artist:'Skipped',plays:1,skips:4},{id:song(2).id,artist:'Replayed',plays:5,skips:0},{id:'file:///private',artist:'Private file',plays:20,skips:0}];
  assert.equal(listeningTaste(taste,signals,[song(3,'Favourite','Loved')]).artists,'Chosen, Replayed, Loved');
  assert.equal(listeningTaste(taste,signals,[{...song(3,'Local','Private file'),local:true}]).artists,'Chosen, Replayed');
  assert.equal(listeningTaste(taste,[],[]).artists,'Chosen');
  assert.equal(listeningTaste(taste,[{id:song(1).id,artist:'Bad score',plays:NaN,skips:0}],[]).artists,'Chosen');
});

test('home removes long compilations and alternate versions, and keeps fresh discoveries separate',()=>{
  const original=song(1,'Hello (Official Audio)','A');
  const tracks=diverseTracks([[original,song(2,'Hello - Slowed','A'),song(3,'Hello (Cover)','B'),{...song(4),duration:3600},song(5,'Full Album 2026'),{...song(6),discoveryGroup:'fresh'}]],[],24);
  assert.deepEqual(tracks.map(t=>t.id),[original.id,song(6).id]);
  assert.deepEqual(discoveryShelves(tracks).map(s=>[s.title,s.tracks.length]),[['Made for you',1],['Fresh discoveries',1]]);
});
test('home rotates only positive song seeds and excludes local favourites and skipped songs',()=>{
  const signals=[{id:song(1).id,plays:5,skips:0},{id:song(2).id,plays:1,skips:5},{id:song(3).id,plays:2,skips:0}];
  assert.deepEqual(discoverySeeds(signals,[{...song(4),local:true}],0),[song(1).id]);
  assert.deepEqual(discoverySeeds(signals,[],1),[song(3).id]);
  assert.deepEqual(discoverySeeds([],[],3),[]);
});
