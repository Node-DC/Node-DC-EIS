/*
 Copyright (c) 2016 Intel Corporation 

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

'use strict';

var appConfig = require('./config/configuration');
var app_host = appConfig.app_host;
var port = appConfig.app_port;
const os = require('os');
var cpuCount = Number(appConfig.cpu_count);

function printHostInfo() {
  console.log('********************************');
  console.log('Server running at port:', port);
  console.log('********************************');
}

function startSingleNodeInstance() {
  var express = require('express');
  var mongoose = require('mongoose');
  var bodyParser = require('body-parser');
  var employeesCtrl = require('./controllers/employees_controller');
  var loaderCtrl = require('./controllers/loader');
  var app = express();

  // Connect to the database
  mongoose.connect(appConfig.db_url);
  var db = mongoose.connection;

  db.on('error', function(err) {
    // connection error!
    console.log(err.message);
    console.log('Mongoose connection error. Server exiting');
    process.exit(0);
  });

  db.once('open', function() {
    // we're connected!
    console.log('Mongoose connected to the database');
  });

  app.use(bodyParser.urlencoded({extended: true}));
  app.use(bodyParser.json());

  // Enable pug templating
  app.set('views', './views');
  app.set('view engine', 'pug');

  // Used to enable and browser-sync on developement
  app.locals.mode = app.get('env');

  app.get('/', function homeRoot(req, res) {
    res.status(200).send("OK");
  });

  //loads database
  app.get('/loaddb', loaderCtrl.initDb);

  //check the number of records in the DB
  app.get('/checkdb',loaderCtrl.isDBSet);

  //get all employee records
  app.get('/employees', employeesCtrl.findAll);

  //get employee by zipcode
  app.get('/employees/zipcode', employeesCtrl.findByZipcode);

  //get employee by name
  app.get('/employees/name', employeesCtrl.findByName);

  //get all the IDs in the DB
  app.get('/employees/id', employeesCtrl.getAllIds);

  //get employee by ID
  app.get('/employees/id/:id', employeesCtrl.findById);

  //get employee's photo by ID
  app.get('/employees/id/:id/photo.jpg', employeesCtrl.findPhotoById);

  //delete employee by ID
  app.delete('/employees/id/:id', employeesCtrl.deleteByEmployeeId);

  //add a new record in the DB
  app.post('/employees', employeesCtrl.addNewEmployee);

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
    systemInfo.appName = appName;
    systemInfo.version = versionInfo;
    var cpu_count = appConfig.cpu_count;
    if ((cpu_count === undefined) || (cpu_count < 0)) {
      cpu_count = os.cpus().length;
    }
    systemInfo.cpuCount = cpu_count;
    res.json(systemInfo);     
  });

  //stop the server
  app.get('/stopserver', function stopServer(req, res) {
    console.log('Exiting ...');
    res.json({message: 'Server stopped'});
    server.close();
    process.exit(0);
  });

  var server = app.listen({ host: app_host, port: port});

}

function startCluster(cpus) {
  const cluster = require('cluster');
  if (cluster.isMaster) {
    if ((cpus === undefined) || (cpus < 0)) {
      cpuCount = os.cpus().length;
    }

    printHostInfo();
    console.log('Setting up cluster with 1 Master (pid: ' + process.pid + ') and ' + cpuCount + ' workers..');

    var workers = [];
    for (var i=0 ;i < cpuCount; i++) {
      let worker = cluster.fork();
      workers.push(worker);

      worker.on('message', function(msg) {
        if(msg.event) {
          console.log('Broadcasting message');
          for(let wrk in workers) {
            workers[wrk].send(msg);
          }
        }
      });
    }

    cluster.on('online', function(worker) {
      console.log('Worker:' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function(worker, code, signal) {
      console.log('exit event occured. Stopping the server');
      process.exit(0);
    });
  } else {
    startSingleNodeInstance();
  }
} 

if (cpuCount === undefined || isNaN(cpuCount) || cpuCount === 0) {
  console.log('Starting a single instance of Node.js process with (pid: ' + process.pid + ')');
  printHostInfo();
  startSingleNodeInstance();
} else if (cpuCount !== 0) {
  startCluster(cpuCount); 
};
