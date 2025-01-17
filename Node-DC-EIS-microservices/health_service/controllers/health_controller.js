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

var Health = require('../models/health');
var ObjectId = require('mongoose').Types.ObjectId;

/************************************************************
Local helper functions to populate database with random data
************************************************************/
var sendJSONResponse = function(res, status, content) {
  res.status(status);
  res.json(content);
};

/******************************************************
 API interface
******************************************************/
exports.findAll = async function findAll(req, res) {
	try {
  	const data = await Health.find()
    sendJSONResponse(res, 200, data);
	} catch (err) {
    console.log('*** Internal Error while retrieving all compensation records.');
    console.log(err);
    sendJSONResponse(res, 500, { 
      message: 'findAll query failed. Internal Server Error'});
	}
};

exports.getHealthInformationByEmployeeId = async function getHealthInformationByEmployeeId(req, res) {

  const employee_id=req.query.employee_id || req.params.employee_id;

  try {
    const data = await Health.findOne({'_employee': new ObjectId(employee_id)});

    if (!data) {
      sendJSONResponse(res, 200, { 
        message: 'No records found'});
      return;
    }

		console.log('sending response from health service');
    sendJSONResponse(res, 200, data);
  } catch (err) {
      console.log('*** Internal Error while retrieving health records.');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'getHealthInformationByEmployeeId query failed. Internal Server Error'});
      return;
  }

  return;
};

exports.newHealth = async function newHealth(req, res) {
  const employee_id = req.body._employee;
  const employeeObj = req.body.employee;
  let missing_field_flag = false;
  let warning_msg = {};
  
  if(!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'newHealth: Missing employee_id'
    });
    return;
  }
  
  const paid_family_leave =  req.body.paid_family_leave;
  const long_term_disability_plan =  req.body.long_term_disability_plan;
  const short_term_disability_plan =  req.body.short_term_disability_plan;

  const health = new Health();
  health._employee = employee_id;
  health.employee = employeeObj;

  if (paid_family_leave == undefined) {
    missing_field_flag = true;
  } else {
    health.paid_family_leave = paid_family_leave;
  }

  if (long_term_disability_plan == undefined) {
    missing_field_flag = true;
  } else {
    health.long_term_disability_plan = long_term_disability_plan;
  }

  if (short_term_disability_plan == undefined) {
    missing_field_flag = true;
  } else {
    health.short_term_disability_plan = short_term_disability_plan;
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Health input are missing";
  } else{
    warning_msg = "All fields from Health input are present";
    missing_field_flag = false;
  }

	try {
  	const data = await health.save();
    sendJSONResponse(res, 200, {
      'health_id' : data._id,
      'warning_msg' : warning_msg
    });
	} catch (err) {
  	console.log(err);
    sendJSONResponse(res, 500, {
      message: 'newHealth save query failed. Internal error'
    });
	}
	
	return;
};

exports.deleteByEmployeeId = function deleteByEmployeeId(req, res) {
  var employee_id = req.params.employee_id;

  if (!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'deleteByEmployeeId query failed. Missing employee_id'
    });
    return;
  }

  Health.remove({'employee._id':  new ObjectId(employee_id)})
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
