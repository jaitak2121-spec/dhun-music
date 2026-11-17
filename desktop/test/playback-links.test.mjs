import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackCommand} from '../playback-links.mjs';
test('shortcut links allow transport only and reject arbitrary resources',()=>{
 for(const command of ['play','pause','next','previous']){
  assert.equal(playbackCommand('dhun-music://'+command),command);
  assert.equal(playbackCommand('dhun-music://'+command+'/'),command);
 }
 for(const value of [null,{},'', 'https://example.com','dhun://audio/id','dhun-music://play?url=https://evil.example','dhun-music://play#anything','dhun-music://user@play','dhun-music://play/file','dhun-music://%70lay','dhun-music://play:123','dhun-music://unknown'])assert.equal(playbackCommand(value),null);
});
