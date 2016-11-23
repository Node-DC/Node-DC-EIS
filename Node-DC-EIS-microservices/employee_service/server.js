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
var serviceName = "Employee";
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var appConfig = require('./config/configuration');
var employeeCtrl = require('./controllers/employee_controller');
var remoteSvc = require('./controllers/remote_svc_controller');
const os = require('os');
var app = express();

// Connect to the database
mongoose.connect(appConfig.db_url);

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', function homeRoot(req, res) {
  res.json({message: 'Hello from ' + serviceName + ' service.'});
});

//load the database
app.get('/loaddb',                 remoteSvc.loaddb);

//check the number of records in the database
app.get('/checkdb',                remoteSvc.checkdb);

//get all employee records
app.get('/employees',              employeeCtrl.getAllEmployees);

//get an employee record by employee ID
app.get('/employees/id/:employee_id', employeeCtrl.getEmployeeById);

//get an employee record by employee last name
app.get('/employees/name',         employeeCtrl.getEmployeesByName);

//get an employee record by zipcode
app.get('/employees/zipcode',      employeeCtrl.getEmployeesByZipcode);

//add a new employee record
app.post('/employees',             employeeCtrl.addNewEmployee);
app.delete('/employees/id/:employee_id', employeeCtrl.deleteByEmployeeId);

//Get all EmployeeIds to create a list
app.get('/employees/id',           employeeCtrl.getAllEmployeeIds);

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
  var appName = appConfig.app_mode;
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
  systemInfo.appName = appName;
  res.json(systemInfo);     
});

//stop the server
app.get('/stopserver', function stopServer(req, res) {
  console.log('Exiting ...');
  res.json({message: 'Server stopped'});
  server.close();
  process.exit(0);
});

var port = appConfig.employee_svc_port;;
var server = app.listen(port);

console.log('**************************************************');
console.log('Start Time:' + Date());
console.log(serviceName + ' Service is listening at port:', port);
console.log('**************************************************');
