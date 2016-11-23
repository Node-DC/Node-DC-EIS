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
exports.findAll = function findAll(req, res) {
  Photo.find()
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

exports.getPhotoByEmployeeId = function getPhotoByEmployeeId(req, res) {

  var employee_id=req.query.employee_id || req.params.employee_id;

  Photo.findOne({'employee._id':  new ObjectId(employee_id)})
    .exec(function(err, data) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'exports.getPhotoByEmployeeId query failed. Internal Server Error'});
      return;
    }

    if (!data) {
      //console.log('No data found for employee id:' + employee_id);
    }

    sendJSONResponse(res, 200, data);
  });
  return;
};

exports.newPhoto = function newPhoto(req, res) {
  var employee_id = req.body._employee;
  var employeeObj = req.body.employee;
  var missing_field_flag = false;
  var warning_msg = {};

  if(!employee_id) {
    sendJSONResponse(res, 400, {
      message: 'newPhoto: Missing employee_id'
    });
    return;
  }

  var imageStr =  req.body.image;

  var photo = new Photo();

  if(imageStr == undefined){
    missing_field_flag = true;
  } else{
    photo.image = imageStr;
  }

  photo._employee = employee_id;
  photo.employee = employeeObj;
  photo.employee._id = new ObjectId(employeeObj._id);

  if(missing_field_flag) {
    warning_msg = "Some field from Photo input are missing";
    missing_field_flag = false;
  } else{
    warning_msg = "All fields from Photo input are present";
  }
  photo.save(function savePhoto(err, data) {
    if(err) {
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'newPhoto save query failed. Internal error'
      });
      return;
    }

    sendJSONResponse(res, 200, {
      'photo_id' : data._id,
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

  Photo.remove({'employee._id':  new ObjectId(employee_id)})
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
