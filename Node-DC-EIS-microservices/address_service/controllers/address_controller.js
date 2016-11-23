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

var Address = require('../models/address');
var ObjectId = require('mongoose').Types.ObjectId;

/************************************************************
Local helper functions to populate database with random data
************************************************************/
function sendJSONResponse(res, status, content) {
  res.status(status);
  res.json(content);
};

/******************************************************
 API interface
******************************************************/
exports.findAll = function findAll(req, res) {
  Address.find()
  .exec(function sendJSON(err, addresses) {
    if (err) {
      console.log('*** Internal Error while retrieving all addresses.');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'findAll query failed. Internal Server Error'});
      return;
    }   

    if (!addresses) {
      sendJSONResponse(res, 200, { 
        message: 'No records found'});
      return;
    }   

    sendJSONResponse(res, 200, addresses);
  }); 
};

function collectZipCodes(addresses) {

  var zipCodeSet = new Set();
  for (var i in addresses) {
    var a_name = addresses[i].zipcode;
    zipCodeSet.add(a_name);
  }

  var idx = 0;
  var zipCodeArr = new Array(zipCodeSet.length);
  for (let zipcode of zipCodeSet) { 
    zipCodeArr[idx] = zipcode;
    idx++;
  }

  return(zipCodeArr);

}

exports.findByZipcode = function findByZipcode(req, res) {

  var zipcode=req.query.zipcode;

  if (!zipcode) {
    Address.find({},function sendJSON(err, addresses) {
      if (err) {
        console.log(err);
        sendJSONResponse(res, 500, {
          message: 'getAllZipcodes query failed. Internal Server Error'});
        return;
      }

      var zipCodeArr = collectZipCodes(addresses);
   
      sendJSONResponse(res, 200, zipCodeArr);
    });
  } else {
    Address.find({'zipcode': zipcode})
      .populate('_employee')
      .exec(function(err, data) {
      if (err) {
        console.log(err);
        sendJSONResponse(res, 500, {
          message: 'findByZipcode query failed. Internal Server Error'});
        return;
      }

      sendJSONResponse(res, 200, data);
    });
  }
};

exports.getAddressByEmployeeId = function(req, res) {

  var employee_id=req.query.employee_id || req.params.employee_id;

  //.populate('_employee').select({"first_name" : 1, "last_name" : 1})
  Address.findOne({'employee._id':  new ObjectId(employee_id)})
    .exec(function(err, data) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'getAddressByEmployeeId query failed. Internal Server Error'});
      return;
    }
    if (!data) {
      //console.log('No data found for employee id:' + employee_id);
    }
    sendJSONResponse(res, 200, data);
  });
  return;
};

exports.newAddress = function newAddress(req, res) {

  var employee_id = req.body._employee;
  var employeeObj = req.body.employee;
  if(!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'newAddress: Missing employee_id'
    });
    return;
  }

  var street =  req.body.street;
  var state =  req.body.state;
  var zipcode =  req.body.zipcode;
  var country = req.body.country;

  if(!zipcode) {
    sendJSONResponse(res, 400, {
      message: 'newAddress: Missing zipcode'
    });
    return;
  }

  var missing_field_flag = false;
  var warning_msg = {};
  var address = new Address();

  address.zipcode = zipcode;
  address._employee = employee_id;
  address.employee = employeeObj;
  address.employee._id = new ObjectId(employeeObj._id);

  if (street == undefined) {
    missing_field_flag = true;
  } else {
    address.street = street;
  }

  if(state == undefined){
    missing_field_flag = true;
  } else {
    address.state = state;
  }

  if(country == undefined){
    missing_field_flag = true;
  } else {
    address.country = country;
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Address input are missing";
    missing_field_flag = false;
  } else{
    warning_msg = "All fields from Address input are present";
  }
  
  address.save(function(err, data) {
    if(err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'newAddress save query failed. Internal error'
      });
      return;
    }
    sendJSONResponse(res, 200, {
      'address_id' : data._id,
      'warning_msg' : warning_msg
    });
  });
};

exports.deleteByEmployeeId = function deleteByEmployeeId(req, res) {
  var employee_id = req.params.employee_id;

  if (!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'deleteByEmployeeId query failed. Missing employee_id'
    });
    return;
  }

  Address.remove({'employee._id':  new ObjectId(employee_id)})
    .exec(function(err, data) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'deleteByEmployeeId query failed. Internal Server error'
      });
      return;
    }
    sendJSONResponse(res, 200, null);
  });
  return;
};
