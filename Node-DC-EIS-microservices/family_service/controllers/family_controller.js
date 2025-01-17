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
exports.findAll = async function findAll(req, res) {
	try {
  	const data = await Family.find();
    sendJSONResponse(res, 200, data);
	} catch (err) {
    console.log(err.message);
    sendJSONResponse(res, 500, { 
      message: 'findAll query failed. Internal Server Error'});
	}

  return;
};

exports.getFamilyInfoByEmployeeId = async function getFamilyInfo(req, res) {

  const employee_id=req.query.employee_id || req.params.employee_id;

  try {
    const data = await Family.findOne({'_employee': new ObjectId(employee_id)});

    if (!data) {
      sendJSONResponse(res, 200, { 
        message: 'No records found'});
      return;
    }

		console.log('sending response from family service');
   	sendJSONResponse(res, 200, data);
  } catch (err) {
      console.log('*** Internal Error while retrieving addresses records.');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'getFamilyInfoByEmployeeId query failed. Internal Server Error'});
      return;
  }

  return;
};

exports.newFamily = async function newFamily(req, res) {

  const employee_id = req.body._employee;
  const employeeObj = req.body.employee;
  let missing_field_flag = false;
  let warning_msg = {};
  
  if(!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'newFamily: Missing employee_id'
    });
    return;
  }

  const childrens =  req.body.childrens;
  const marital_status =  req.body.marital_status;

  const family = new Family();
  family._employee = employee_id;
  family.employee = employeeObj;

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

	try {
  	const data = await family.save();
    sendJSONResponse(res, 200, {
      'family_id' : data._id,
      'warning_msg' : warning_msg
    });
	} catch (err) {
    console.log(err);
    sendJSONResponse(res, 500, {
      message: 'newFamily save query failed. Internal error'
    });
    return;
	}
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
