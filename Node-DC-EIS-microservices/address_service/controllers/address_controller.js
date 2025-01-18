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
exports.findAll = async function findAll(req, res) {
  try {
    const addresses = await Address.find();
    sendJSONResponse(res, 200, addresses);
  } catch (err) {
    console.log('*** Internal Error while retrieving all addresses.');
    console.log(err);
    sendJSONResponse(res, 500, { 
      message: 'findAll query failed. Internal Server Error'});
    return;
  }
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

exports.findByZipcode = async function findByZipcode(req, res) {

  var zipcode=req.query.zipcode;

  if (!zipcode) {
    try {
      const addresses = await Address.find();
      const zipCodeArr = collectZipCodes(addresses);
      sendJSONResponse(res, 200, zipCodeArr);
    } catch (err) {
      console.log(err.message);
      sendJSONResponse(res, 500, {
        message: 'getAllZipcodes query failed. Internal Server Error'});
      return;
    }
  } else {
    try {
      const addresses = 
        await Address.find({'zipcode': zipcode})
          .populate('_employee')
          .exec();
      sendJSONResponse(res, 200, addresses);
    } catch (err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'findByZipcode query failed. Internal Server Error'});
      return;
    }
  }
};

exports.getAddressByEmployeeId = async function(req, res) {

  const employee_id=req.query.employee_id || req.params.employee_id;

  try {
    const data = await Address.findOne({'_employee': new ObjectId(employee_id)});

    if (!data) {
      sendJSONResponse(res, 200, { 
        message: 'No records found'});
      return;
    }

    console.log('sending response from address service');
    sendJSONResponse(res, 200, data);
  } catch (err) {
      console.log('*** Internal Error while retrieving addresses records.');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'getAddressByEmployeeId query failed. Internal Server Error'});
      return;
  }

  return;
};

exports.newAddress = async function newAddress(req, res) {

  const employee_id = req.body._employee;
  if(!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'newAddress: Missing employee_id'
    });
    return;
  }

  const street =  req.body.street;
  const state =  req.body.state;
  const zipcode =  req.body.zipcode;
  const country = req.body.country;

  if(!zipcode) {
    sendJSONResponse(res, 400, {
      message: 'newAddress: Missing zipcode'
    });
    return;
  }

  var missing_field_flag = false;
  var warning_msg = {};
  var address = new Address();
  const employeeObj = req.body.employee;

  address.zipcode = zipcode;
  address._employee = employee_id;
  address.employee = employeeObj;

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
  
  try {
    const data = await address.save();
    sendJSONResponse(res, 200, {
      'address_id' : data._id,
      'warning_msg' : warning_msg
    });
  } catch (err) {
    console.log(err);
    sendJSONResponse(res, 500, {
      message: 'newAddress save query failed. Internal error'
    });
    return;
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
    const result = await Address.deleteMany({'_employee': new ObjectId(employee_id)});
    sendJSONResponse(res, 200, result);
  } catch (err) {
    console.log(err);
    sendJSONResponse(res, 500, {
      message: 'deleteByEmployeeId query failed. Internal Server error'
    });
  }
  return;
};
