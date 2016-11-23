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

var Family = require('../models/family');
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
  Family.find()
  .exec(function sendJSON(err, data) {
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

exports.getFamilyInfo = function getFamilyInfo(req, res) {

  var employee_id=req.query.employee_id || req.params.employee_id;

  Family.findOne({'employee._id':  new ObjectId(employee_id)})
    .exec(function findOneEmployee(err, data) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'exports.getFamilyInfo query failed. Internal Server Error'});
      return;
    }

    if (!data) {
      //console.log('No data found for employee id:' + employee_id);
    }

    sendJSONResponse(res, 200, data);
  });
  return;
};

exports.newFamily = function newFamily(req, res) {
  var employee_id = req.body._employee;
  var employeeObj = req.body.employee;
  var missing_field_flag = false;
  var warning_msg = {};
  
  if(!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'newFamily: Missing employee_id'
    });
    return;
  }

  var childrens =  req.body.childrens;
  var marital_status =  req.body.marital_status;

  var family = new Family();
  family._employee = employee_id;
  family.employee = employeeObj;
  family.employee._id = new ObjectId(employeeObj._id);

  if (childrens == undefined) {
    missing_field_flag = true;
  } else {
    family.childrens = childrens;
  }

  if (marital_status == undefined) {
    missing_field_flag = true;
  } else {
    family.marital_status = marital_status;
  }

  if(missing_field_flag) {
    warning_msg = "Some field from family input are missing";
    missing_field_flag = false;
  } else{
    warning_msg = "All fields from family input are present";
  }

  family.save(function saveFamily(err, data) {
    if(err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'newFamily save query failed. Internal error'
      });
      return;
    }

    sendJSONResponse(res, 200, {
      'family_id' : data._id,
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


  Family.remove({'employee._id':  new ObjectId(employee_id)})
    .exec(function removeEmployeeById(err, data) {
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
