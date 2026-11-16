import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryQueries,diverseTracks,listeningTaste} from '../model.mjs';
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
