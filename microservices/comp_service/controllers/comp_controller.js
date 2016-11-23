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

var Compensation = require('../models/compensation');
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
  Compensation.find()
  .exec(function(err, data) {
    if (err) {
      console.log('*** Internal Error while retrieving all compensation records.');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'findAll query failed. Internal Server Error'});
      return;
    }   

    if (!data) {
      sendJSONResponse(res, 200, { 
        message: 'No records found'});
      return;
    }   

    sendJSONResponse(res, 200, data);
  }); 
};

exports.getCompensationByEmployeeId = function getCompensationByEmployeeId(req, res) {

  var employee_id=req.query.employee_id || req.params.employee_id;

  Compensation.findOne({'employee._id':  new ObjectId(employee_id)})
    .exec(function(err, data) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'exports.getCompensationByEmployeeId query failed. Internal Server Error'});
      return;
    }

    if (!data) {
      //console.log('No data found for employee id:' + employee_id);
    }

    sendJSONResponse(res, 200, data);
  });
  return;
};

exports.newCompensation = function newCompensation(req, res) {

  var employee_id = req.body._employee;
  var employeeObj = req.body.employee;
  var missing_field_flag = false;
  var warning_msg = {};
  
  if(!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'newCompensation: Missing employee_id'
    });
    return;
  }

  var pay =  req.body.pay;
  var stock =  req.body.stock;
  
  var compensation = new Compensation();
  compensation._employee = employee_id;
  compensation.employee = employeeObj;
  compensation.employee._id = new ObjectId(employeeObj._id);
  if(stock == undefined){
    missing_field_flag = true;
  } else{
    compensation.stock = stock;
  }

  if(pay == undefined){
    missing_field_flag = true;
  } else{
    compensation.pay = pay;
  } 
  
  if(missing_field_flag) {
    warning_msg = "Some field from Compensation input are missing";
    missing_field_flag = false;
  } else{
    warning_msg = "All fields from Compensation input are present";
  }

  compensation.save(function saveCompensation(err, data) {
    if(err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'newCompensation save query failed. Internal error'
      });
      return;
    }

    sendJSONResponse(res, 200, {
      'compensation_id' : data._id,
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

  Compensation.remove({'employee._id':  new ObjectId(employee_id)})
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
