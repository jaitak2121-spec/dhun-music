import test from 'node:test';
import assert from 'node:assert/strict';
import {stationTracks,recommendationTitle} from '../model.mjs';
const song=(n,title,artist='Ed Sheeran')=>({id:String(n).padStart(11,'0'),title,artist,duration:200});
test('stations exclude seed versions, covers and recent song families',()=>{
  const result=stationTracks(song(1,'Perfect'),[song(2,'Photograph')],[song(3,'Perfect (Slowed + Reverb)'),song(4,'Perfect - Sped Up'),song(5,'Perfect (Cover)','Another artist'),song(6,'Photograph (Official Audio)'),song(7,'Shape of You')]);
  assert.deepEqual(result.map(t=>t.id),[song(7,'').id]);
});
test('stations interleave artists and cap each artist',()=>{
  const candidates=[song(2,'One','A'),song(3,'Two','A'),song(4,'Three','A'),song(5,'Four','B'),song(6,'Five','C')];
  assert.deepEqual(stationTracks(song(1,'Seed','Z'),[],candidates).map(t=>t.title),['One','Four','Two','Five']);
  assert.equal(stationTracks(song(1,'Seed'),[],candidates,0).length,0);
});
test('normalization preserves real titles and excludes long mixes and local tracks',()=>{
  assert.equal(recommendationTitle('Live Forever'),'live forever');
  assert.equal(recommendationTitle('Song (Acoustic Cover)'),'song');
  assert.deepEqual(stationTracks(song(1,'Seed'),[],[{...song(2,'Mix'),duration:3600},{...song(3,'Local'),local:true}]),[]);
});
