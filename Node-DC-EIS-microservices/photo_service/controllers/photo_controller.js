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

var Photo = require('../models/photo');
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
  	const data = await Photo.find();
    sendJSONResponse(res, 200, data);
	} catch (err) {
    console.log('*** Internal Error while retrieving all compensation records.');
    console.log(err);
    sendJSONResponse(res, 500, { 
      message: 'findAll query failed. Internal Server Error'});
	}

	return;
};

exports.getPhotoByEmployeeId = async function getPhotoByEmployeeId(req, res) {
  const employee_id=req.query.employee_id || req.params.employee_id;
  try {
    const data = await Photo.findOne({'_employee': new ObjectId(employee_id)});

    if (!data) {
      sendJSONResponse(res, 200, { 
        message: 'No records found'});
      return;
    }

    sendJSONResponse(res, 200, data);
  } catch (err) {
      console.log('*** Internal Error while retrieving addresses records.');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'getPhotoByEmployeeId query failed. Internal Server Error'});
      return;
  }

  return;
};

exports.newPhoto = async function newPhoto(req, res) {
  const employee_id = req.body._employee;
  const employeeObj = req.body.employee;
  let missing_field_flag = false;
  let warning_msg = {};

  if(!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'newPhoto: Missing employee_id'
    });
    return;
  }

  const imageStr =  req.body.image;

  const photo = new Photo();
  photo._employee = employee_id;
  photo.employee = employeeObj;

  if(imageStr == undefined){
    missing_field_flag = true;
  } else{
    photo.image = imageStr;
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Photo input are missing";
    missing_field_flag = false;
  } else{
    warning_msg = "All fields from Photo input are present";
  }

	try {
  	const data = await photo.save();
    sendJSONResponse(res, 200, {
      'photo_id' : data._id,
      'warning_msg' : warning_msg
    });
	} catch (err) {
    console.log(err);
    sendJSONResponse(res, 500, {
      message: 'newPhoto save query failed. Internal error' });
	}
	
	return;
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
    const result = await Photo.deleteMany({'_employee': new ObjectId(employee_id)});
    sendJSONResponse(res, 200, result);
  } catch (err) {
    console.log(err);
    sendJSONResponse(res, 500, {
      message: 'deleteByEmployeeId query failed. Internal Server error'
    });
  }

  return;
};
