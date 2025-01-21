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
exports.findAll = async function findAll(req, res) {
  try {
    const data = await Compensation.find();
    sendJSONResponse(res, 200, data);
  } catch (err) {
    console.log('*** Internal Error while retrieving all compensation records.');
    console.log(err);
    sendJSONResponse(res, 500, { 
      message: 'findAll query failed. Internal Server Error'});
  }

  return;
};

exports.getCompensationByEmployeeId = async function getCompensationByEmployeeId(req, res) {

  const employee_id=req.query.employee_id || req.params.employee_id;

  try {
    const data = await Compensation.findOne({'employee._id':  new ObjectId(employee_id)});
    if (!data) {
      sendJSONResponse(res, 200, {
        message: 'No records found'}
      );
      return;
    }

    sendJSONResponse(res, 200, data);

  } catch (err) {
    console.log(err);
    sendJSONResponse(res, 500, {
      message: 'getCompensationByEmployeeId query failed. Internal Server Error'});
    return;
  }

  return;
};

exports.newCompensation = async function newCompensation(req, res) {

  const employee_id = req.body._employee;
  const employeeObj = req.body.employee;
  let missing_field_flag = false;
  let warning_msg = {};
  
  if(!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'newCompensation: Missing employee_id'
    });
    return;
  }

  const pay =  req.body.pay;
  const stock =  req.body.stock;
  
  const compensation = new Compensation();
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

  try {
    const data = await compensation.save();
    sendJSONResponse(res, 200, {
      'compensation_id' : data._id,
      'warning_msg' : warning_msg
    });
  } catch (err) {
    console.log(err);
    sendJSONResponse(res, 500, {
      message: 'newCompensation save query failed. Internal error'
    });
  }
};

exports.deleteByEmployeeId = async function deleteByEmployeeId(req, res) {
  var employee_id = req.params.employee_id;

  if (!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'deleteByEmployeeId query failed. Missing employee_id'
    });
    return;
  }
  try {
    const result = await Compensation.deleteMany({'_employee': new ObjectId(employee_id)});
    sendJSONResponse(res, 200, result);
  } catch (err) {
    console.log(err);
    sendJSONResponse(res, 500, {
      message: 'deleteByEmployeeId query failed. Internal Server error'
    });
  }

  return;
};
