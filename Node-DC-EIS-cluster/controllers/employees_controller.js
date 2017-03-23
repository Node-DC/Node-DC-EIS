/*
 Copyright (c) 2016 Intel Corporation 

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

'use strict';

var Employee = require('../models/employee');
var fs = require('fs');
var appConfig = require('../config/configuration');
var async = require('async');
var ObjectId = require('mongoose').Types.ObjectId;
var enable_caching = appConfig.enable_caching;
var employeeCacheLRU = require("lru-cache");
var cache_options = {
  max: appConfig.cache_max_size,
  maxAge: appConfig.cache_expiration
};
var employeeCache = employeeCacheLRU(cache_options);


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
exports.addNewEmployee = function addNewEmployee(req, res) {
  var missing_field_flag = false;
  var warning_msg;

  //Build Employee record
  var emp = req.body.employee;
  var addr = req.body.address;
  var com = req.body.compensation;
  var fam = req.body.family;
  var heal = req.body.health;
  var phot = req.body.photo;

  if (enable_caching) {
    employeeCache.reset();
  }

  //zipcode and last_name are required fields
  if(!emp || !addr){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee input'});
    return;
  }

  if(!emp.phone || !emp.first_name || !emp.last_name || !emp.email || !emp.role){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee input'});
    return;
  }

  if(!addr.zipcode){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee input'});
    return;
  }

  //Build Employee Object
  var employee = new Employee();
  employee.phone = emp.phone;
  employee.first_name = emp.first_name;
  employee.last_name = emp.last_name;
  employee.email = emp.email;
  employee.role = emp.role;

 //Build Address Object
  var address = {}; 
  var zipcode = addr.zipcode;

  if(addr.country == undefined){
    missing_field_flag = true;
  } else{
    var country = addr.country;
  }

  if(addr.state == undefined){
    missing_field_flag = true;
  } else{
    var state = addr.state;
  }

  if(addr.street == undefined){
    missing_field_flag = true;
  } else{
    var street = addr.street;
  }
  employee.address ={
    street : street,
    zipcode : zipcode,
    state : state,
    country : country
  }
  
  if(missing_field_flag) {
    warning_msg = "Some field from Address input are missing";
    missing_field_flag = false;
  }

  //Build Compensation Object
  var compensation = {}; 
  if(com.stock == undefined){
    missing_field_flag = true;
  } else{
    var stock = com.stock;
  }

  if(com.pay == undefined){
    missing_field_flag = true;
  } else{
    var pay = com.pay;
  }  
  
  if(missing_field_flag) {
    warning_msg = "Some field from Compensation input are missing";
    missing_field_flag = false;
  } 
  employee.compensation = {
    pay : pay,
    stock : stock
  }

  //Build Family Object
  var family = {};
  if(fam.childrens == undefined){
    missing_field_flag = true;
  } else {
    var childrens = fam.childrens;
  }

  if(fam.marital_status == undefined){
    missing_field_flag = true;
  } else {
    var marital_status = fam.marital_status;
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Family input are missing";
    missing_field_flag = false;
  }
  employee.family = {
    marital_status : marital_status,
    childrens : childrens
  }

  //Build Health Object
  var health = {};
  if(heal.paid_family_leave == undefined){
    missing_field_flag = true;
  } else {
    var paid_family_leave = heal.paid_family_leave;
  }

  if(heal.longterm_disability_plan == undefined){
    missing_field_flag = true;
  } else {
    var longterm_disability_plan = heal.longterm_disability_plan;
  }

  if(heal.shortterm_disability_plan == undefined){
    missing_field_flag = true;
  } else {
    var shortterm_disability_plan = heal.shortterm_disability_plan; 
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Health input are missing";
    missing_field_flag = false;
  }
  employee.health = {
    shortterm_disability_plan : shortterm_disability_plan,
    longterm_disability_plan : longterm_disability_plan,
    paid_family_leave : paid_family_leave
  }

  //Build Photo Object
  if(phot && phot.image ){
    var image = phot.image;
  } else {
    missing_field_flag = true;
  }
  employee.photo ={
    image : image
  }
  if(missing_field_flag) {
    warning_msg = "Photo input is missing";
    missing_field_flag = false;
  }

  //Save employee record and capture employee_id 
  employee.save(function(err, data) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'Saving Employee: Internal error while saving employee record'});
      return;
    }

    var employee_id = data._id;

    var returned_obj = {};
      returned_obj.employee_id = employee_id;
      if (warning_msg) {
        returned_obj.warning_msg = warning_msg;  
      }
      
      sendJSONResponse(res, 200, { 
        result: returned_obj
      });
  }); //End of Employee.save()
};

exports.deleteByEmployeeId = function deleteByEmployeeId(req, res) {
  if (enable_caching) {
    employeeCache.reset();
  }

  var employee_id = req.params.id;
  if(!employee_id) {
    console.log("Missing employee_id");
    sendJSONResponse(res, 400, { 
      message: 'Missing input employee id'
    });
    return;
  }
  
  Employee.remove({ '_id': employee_id }, function(err) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'Deleting Employee: Internal error while deleting employee record'});
      return;
    }
  sendJSONResponse(res, 200, {
    message: 'Employee record Successfully deleted'}
    );     
  }); //ENd of employee remove
};

exports.findAll = function findAll(req, res) {
  if (enable_caching) {
    var cachedRes = employeeCache.get(req);
    if (cachedRes) {
      sendJSONResponse(res, 200, cachedRes);
      return;
    }
  }

  Employee.find({})
  .exec(function(err, employees) {
    if (err) {
      console.log('*** Internal Error while retrieving employee records.');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'findAll query failed. Internal Server Error'});
      return;
    }

    if (enable_caching) {
      employeeCache.set(req, employees);
    }

    if (!employees) {
      sendJSONResponse(res, 200, { 
        message: 'No records found'});
      return;
    }
    sendJSONResponse(res, 200, employees);
  });
};

function collectEmployeeIds(data) {
  var ids = new Array(data.length);
  var idx = 0;
  for (var i of data) {
    ids[idx] = i._id;
    idx++;
  }
  return(ids);
}

exports.getAllIds = function getAllIds(req, res) {
  if (enable_caching) {
    var cachedRes = employeeCache.get(req);
    if (cachedRes) {
      sendJSONResponse(res, 200, cachedRes);
      return;
    }
  }

  var query = Employee.find();
  query.select('_id');
  query.exec(function callJSON(err, data) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'getAllIds query failed. Internal Server Error'});
      return;
    }

    var ids = collectEmployeeIds(data);

    if (enable_caching) {
      employeeCache.set(req, ids);
    }
    sendJSONResponse(res, 200, ids);
  });
};

function collectZipCodes(data) {
  var zipCodeArr = new Array(data.length);
  var idx = 0;
  for (var i of data) {
    zipCodeArr[idx] = i.address.zipcode;
    idx++;
  }
  return(zipCodeArr);
}

exports.findByZipcode = function findByZipcode(req, res) {
  if (enable_caching) {
    var cachedRes = employeeCache.get(req);
    if (cachedRes) {
      sendJSONResponse(res, 200, cachedRes);
      return;
    }
  }
  var zipcode=req.query.zipcode;
  
  if (!zipcode) {
    Employee.find(function findAddress(err, data) {
      if (err) {
        console.log(err);
        sendJSONResponse(res, 500, { 
          message: 'getAllZipcodes query failed. Internal Server Error'});
        return;
      }
      
      var zipCodeArr = collectZipCodes(data);

      if (enable_caching) {
        employeeCache.set(req, zipCodeArr);
      }
      sendJSONResponse(res, 200, zipCodeArr);
    });
  } else {
    Employee.find({'address.zipcode' : zipcode})
      .exec(function(err, addresses) {
      if (err) {
        console.log(err);
        sendJSONResponse(res, 500, { 
          message: 'findByZipcode query failed. Internal Server Error'});
        return;
      }

      if (enable_caching) {
        employeeCache.set(req, addresses);
      }
      sendJSONResponse(res, 200, addresses);
    });
  }
};

function collectLastNames(data) {
  var lastNameSet = new Set();
  for (var i of data) {
    var a_name = i.last_name;
    lastNameSet.add(a_name);
  }

  var idx = 0;
  var lastNameArr = new Array(lastNameSet.length);
  for (let newname of lastNameSet) { 
    lastNameArr[idx] = newname;
    idx++;
  }

  return(lastNameArr);
}

exports.findByName = function findByName(req, res) {
  if (enable_caching) {
    var cachedRes = employeeCache.get(req);
    if (cachedRes) {
      sendJSONResponse(res, 200, cachedRes);
      return;
    }
  }

  var first_name=req.query.first_name;
  var last_name=req.query.last_name;

  if (!first_name && !last_name) {
    var query = Employee.find();
    query.select('last_name');
    query.exec(function(err, data) {
      if (err) {
        console.log(err);
        sendJSONResponse(res, 500, { 
          message: 'findAll by Lastname query failed. Internal Server Error'});
        return;
      }

      var lastNameArr = collectLastNames(data);

      if (enable_caching) {
        employeeCache.set(req, lastNameArr);
      }
      sendJSONResponse(res, 200, lastNameArr);
      return;
    });
  }
  
  if (first_name && last_name) {
    Employee.find({'first_name': first_name, 'last_name': last_name}, function findEmployee(err, employees) {
      if (err) {
        console.log('*** Internal Error while retrieving an employee record:');
        console.log(err);
        sendJSONResponse(res, 500, { 
          message: 'findBy first and last name failed. Internal Server Error' });
        return;
      }

      if (enable_caching) {
        employeeCache.set(req, employees);
      }
      if (!employees) {
        sendJSONResponse(res, 200, {message: 'No records found'});
        return;
      }
      sendJSONResponse(res, 200, employees);
    }); 
  } else if (first_name && !last_name) {
    Employee.find({'first_name': first_name}, function(err, employees) {
      if (err) {
        console.log('*** Internal Error while retrieving an employee record:');
        console.log(err);
        sendJSONResponse(res, 500, { 
          message: 'findBy first name failed. Internal Server Error' });
        return;
      }

      if (enable_caching) {
        employeeCache.set(req, employees);
      }
      if (!employees) {
        sendJSONResponse(res, 200, {message: 'No records found'});
        return;
      }
      sendJSONResponse(res, 200, employees);
    }); 

  } else if (last_name && !first_name) {
    Employee.find({'last_name': last_name}, function(err, employees) {
      if (err) {
        console.log('*** Internal Error while retrieving an employee record:');
        console.log(err);
        sendJSONResponse(res, 500, { 
          message: 'findBy last name failed. Internal Server Error' });
        return;
      }

      if (enable_caching) {
        employeeCache.set(req, employees);
      }
      if (!employees) {
        sendJSONResponse(res, 200, {message: 'No records found'});
        return;
      }
      sendJSONResponse(res, 200, employees);
    }); 

  }
};

exports.findById = function findById(req, res) {
  if (enable_caching) {
    var cachedRes = employeeCache.get(req);
    if (cachedRes) {
      sendJSONResponse(res, 200, cachedRes);
      return;
    }
  }

  var eid=req.params.id || req.query.id;

  Employee.findOne({'_id': eid}, function findOneEmployee(err, employee) {
    if (err) {
      console.log('*** Internal Error while retrieving an employee record:');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'findById failed. Internal Server Error' });
      return;
    }

    if (!employee) {
      sendJSONResponse(res, 200, {
        message: 'No records found'
      });
      return;
    }

    var result = {};
    result.employee = {
      "_id" : employee._id,
      "last_name" : employee.last_name,
      "first_name" : employee.first_name,
      "phone" : employee.phone,
      "role" : employee.role,
      "email" : employee.email
    }
    result.address = employee.address;
    result.compensation = employee.compensation;
    result.family = employee.family;
    result.health = employee.health;

    if (enable_caching) {
      employeeCache.set(req, result);
    }
    sendJSONResponse(res, 200, result);
    return;
    }
  ); 
};

