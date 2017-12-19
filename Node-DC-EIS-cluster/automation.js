
/*
 Copyright (c) 2017 Intel Corporation 

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

var _spawn = require('cross-spawn');
var Promise = require('bluebird');
var _waitOn = Promise.promisify(require('wait-on'));

var _config = require('./config/configuration.js');

var env = process.env;

function npmRun(args) {
  return _spawn(env.npm_node_execpath,
    [env.npm_execpath, '-s', 'run'].concat(args),
    {stdio: 'inherit'});
}

function npmRunSync(args) {
  return _spawn.sync(env.npm_node_execpath,
    [env.npm_execpath, '-s', 'run'].concat(args),
    { stdio: 'inherit' });
}


children = [];

function killChildren() {
  children.forEach(function(cc) {
    cc.kill();
  });
}

var mongoPort = '27017';
if(_config.db_url) {
  var match = _config.db_url.match(new RegExp('mongodb://([^/]+)/'));
  if(match.length > 1 && match[1]) {
    mongoPort = match[1];
  }
}

var npm_event = env.npm_lifecycle_event.split(':');

var node_env = (npm_event.length > 1 && npm_event[1]) ? npm_event[1] : 'prod';

children.push(npmRun('mongodb'));
_waitOn({
  resources: [
    'tcp:' + mongoPort
  ]
}).then(function() {
  children.push(npmRun('server:' + node_env));
  return _waitOn({
      resources: [
        'http://' + (_config.app_host || 'localhost') + ':' +
        (_config.app_port || '9000') +'/'
      ]
    });
}).then(function() {
  npmRunSync('runspec');
}).catch(function(err) {
  killChildren();
  console.error(err);
  process.exit(1);
}).then(function() {
  killChildren();
  process.exit(0);
});
