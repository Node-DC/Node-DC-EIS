/*
// Copyright (c) 2016 Intel Corporation 
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
*/

'use strict';
var serviceName = "Compensation";
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var appConfig = require('./config/configuration');
var compCtrl = require('./controllers/comp_controller');
var app = express();
const os = require('os');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', function homeRoot(req, res) {
  res.json({message: 'Hello from ' + serviceName + ' service.'});
});

//get all comepensation records
app.get('/compensations', compCtrl.findAll);

//get a compensation record by employee ID
app.get('/compensations/:employee_id', compCtrl.getCompensationByEmployeeId);

//add a new copensation record
app.post('/compensations', compCtrl.newCompensation);

//delete a compensation record by employee ID
app.delete('/compensations/:employee_id', compCtrl.deleteByEmployeeId);

//get memory usage data
app.get('/getmeminfo', function collectMemInfo(req, res) {
  var afterMemusage = process.memoryUsage();
  var memoryInfo = {};
  ['rss', 'heapTotal', 'heapUsed'].forEach(function(key) {
    var memoryLog = afterMemusage[key]/(1024 * 1024).toFixed(2);
    memoryInfo[key] = memoryLog;  
  }); 
  res.json({memoryInfo});    
});

//get system info(hardware,software and version details)
app.get('/getcpuinfo', function collectCpuInfo(req, res) {
  var hwInfo = {};
  var swInfo = {};
  var versionInfo = {};
  var systemInfo = {};
  var cpus = os.cpus();
  hwInfo.architecture = os.arch();  
  hwInfo.model = cpus[0]['model'];
  hwInfo.speed = cpus[0]['speed'];
  hwInfo.sys = cpus[0]['times']['sys'];
  hwInfo.irq = cpus[0]['times']['irq'];
  hwInfo.idle = cpus[0]['times']['idle'];
  hwInfo.user = cpus[0]['times']['user'];
  hwInfo.nice = cpus[0]['times']['nice'];
  hwInfo.endianness = os.endianness();
  hwInfo.totalmem = os.totalmem();
  hwInfo.freemem = os.freemem();
  swInfo.platform = os.platform();
  swInfo.release = os.release();
  swInfo.type = os.type();
  swInfo.uptime = os.uptime();
  versionInfo = process.versions
  systemInfo.hw = hwInfo;
  systemInfo.sw = swInfo;
  systemInfo.version = versionInfo;
  res.json(systemInfo);     
});

//stop the server
app.get('/stopserver', function stopServer(req, res) {
  console.log('Exiting ...');
  res.json({message: 'Server stopped'});
  server.close();
  process.exit(0);
});

async function main() {
  console.log('**************************************************');
  console.log('Start Time:' + Date());
  await mongoose.connect(appConfig.db_url);
  console.log('Connection open to the database');
  const port = appConfig.app_port;
  const server = app.listen(port);

  console.log('Start Time:' + Date());
  console.log(serviceName + ' Service is listening at port:', port);
  console.log('**************************************************');
};

main().catch( (err) => console.log(err.message));


