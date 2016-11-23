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
var request = require("request");
var appConfig = require('../config/configuration');

/******************************************************
 Local Helper function
******************************************************/
function sendJSONResponse(res, status, content) {
  res.status(status);
  res.json(content);
};

/******************************************************
 Remote API interface
******************************************************/
exports.loaddb = function loaddb(req, res) {
  var count = req.query.count;
  var zipcount = req.query.zipcode;
  var lastnamecount = req.query.lastname;
  
  var loader_svc = appConfig.db_loader_svc_ipaddress+ "?count="+count+"&zipcode="+zipcount+"&lastname="+lastnamecount;
  request(loader_svc, function loaderSVC(error, response, body) {
    if(error) {
      sendJSONResponse(res, 500, { 
        message: 'loadDB serice request failed. Internal Server Error'});
      return;
    }
    sendJSONResponse(res, response.statusCode, body);
    return;
  });
};


exports.checkdb = function checkdb(req, res) {
  var count = req.query.count;
  if ( (count === undefined) || (count === 0)) {
    count = appConfig.count;
  }
  if ( (count === undefined) || (count === 0)) {
    count = 1;
  }
  var checkdb_svc = appConfig.checkdb_svc_ipaddress+"?count="+count;
  request(checkdb_svc, function checkdbSVC(error, response, body) {
    if(error) {
      sendJSONResponse(res, 500, { 
        message: 'checkDB serice request failed. Internal Server Error'});
      return;
    }
    body = JSON.parse(body);
    sendJSONResponse(res, response.statusCode, body);
    return;
  });
};

