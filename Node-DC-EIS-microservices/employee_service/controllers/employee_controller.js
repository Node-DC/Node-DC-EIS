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

var fs = require('fs');
var readline = require('readline');
var appConfig = require('../config/configuration');
var Employee = require('../models/employee');
var remoteSvc = require('./remote_svc_controller');
var request = require('request');
var async = require('async');

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
function remoteServicePostCall(service_url, data, callback) {
  //Remote call to save the record
  request({
    headers: {'content-type' : 'application/json'},
    url: service_url, 
    method: 'POST',
    json: data
  }, function(error, response, result) {
    if(error) {
      console.log(error);
      return callback(error, null);
    }

    if (response.statusCode != 200) {
      console.log('Remote service error:' + response.statusCode + ':' + service_url);
      return callback(error, null);
    }

    callback();
  });
};

function remoteServiceDeleteCall(service_url, callback) {
  request({
    headers: {'content-type' : 'application/json'},
    url: service_url, 
    method: 'DELETE'
  }, function(error, response, result) {
    if(error) {
      console.log(error);
      return callback(error, null);
    }

    if (response.statusCode != 200) {
      console.log('Remote service error:' + response.statusCode + ':' + service_url);
      return callback(error, null);
    }

    callback();
  });
};

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
  //zipcode and last_name are required fields
  if(!emp || !addr){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee and address input'});
    return;
  }

  if(!emp.phone || !emp.first_name || !emp.last_name || !emp.email || !emp.role){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee input'});
    return;
  }

  if(!addr.zipcode){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee:zipcode input'});
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
  var address = {
    'zipcode' : addr.zipcode
  }

  if(addr.country == undefined){
    missing_field_flag = true;
  } else{
    address.country = addr.country;
  }

  if(addr.state == undefined){
    missing_field_flag = true;
  } else{
    address.state = addr.state;
  }

  if(addr.street == undefined){
    missing_field_flag = true;
  } else{
    address.street = addr.street;
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Address input are missing";
    missing_field_flag = false;
  }

  //Build Compensation Object
  var comp = {}
  if(com.stock == undefined){
    missing_field_flag = true;
  } else{
    comp.stock = com.stock;
  }

  if(com.pay == undefined){
    missing_field_flag = true;
  } else{
    comp.pay = com.pay;
  }  

  if(missing_field_flag) {
    warning_msg = "Some field from Compensation input are missing";
    missing_field_flag = false;
  } 
  //Build Family Object
  var family = {};
  if(fam.childrens == undefined){
    missing_field_flag = true;
  } else {
    family.childrens = fam.childrens;
  }

  if(fam.marital_status == undefined){
    missing_field_flag = true;
  } else {
    family.marital_status = fam.marital_status;
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Family input are missing";
    missing_field_flag = false;
  }

  //Build Health Object
  var health = {};
  if(heal.paid_family_leave == undefined){
    missing_field_flag = true;
  } else {
    health.paid_family_leave = heal.paid_family_leave;
  }

  if(heal.longterm_disability_plan == undefined){
    missing_field_flag = true;
  } else {
    health.longterm_disability_plan = heal.longterm_disability_plan;
  }

  if(heal.shortterm_disability_plan == undefined){
    missing_field_flag = true;
  } else {
    health.shortterm_disability_plan = heal.shortterm_disability_plan; 
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Health input are missing";
    missing_field_flag = false;
  }

  //Build Photo Object
  var photo = {};
  if(phot && phot.image){
    photo.image = phot.image;
  } else {
    missing_field_flag = true;
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
    var employee_obj = data;
    address._employee = employee_id;
    address.employee = employee_obj;
    comp._employee = employee_id;
    comp.employee = employee_obj;
    family._employee = employee_id;
    family.employee = employee_obj;
    health._employee = employee_id;
    health.employee = employee_obj;
    photo._employee = employee_id;
    photo.employee = employee_obj;

    async.parallel([
      function(callback) {
        //Remote call to save the record
        var service_url = appConfig.address_svc;
        var data = address;
        remoteServicePostCall(service_url, data, callback);
      },
      function(callback) {
        //Compensation
        var service_url = appConfig.compensation_svc;
        var data = comp;
        remoteServicePostCall(service_url, data, callback);
      },
      function(callback) {
        //family
        var service_url = appConfig.family_svc;
        var data = family;
        remoteServicePostCall(service_url, data, callback);
      },
      function(callback) {
        //health
        var service_url = appConfig.health_svc;
        var data = health;
        remoteServicePostCall(service_url, data, callback);
      },
      function(callback) {
        //Photo
        var service_url = appConfig.photo_svc;
        var data = photo;
        remoteServicePostCall(service_url, data, callback);
      }
    ], function(err) {
      if (err) {
        console.log('NewEmployee: Error occured with async.parallel');
        sendJSONResponse(res, 500, {
          message: 'async.parallel error while saving employee record'
        });
        return;
      }

      var returned_obj = {};
      returned_obj.employee_id = employee_id;
      if (warning_msg) {
        returned_obj.warning_msg = warning_msg;  
      }
      
      sendJSONResponse(res, 200, { 
        result: returned_obj
      });
    }); //End of async.parallel()
  }); //End of Employee.save()
};

exports.getAllEmployees = function(req, res) {
  Employee.find({})
  .exec(function(err, employees) {
    if (err) {
      console.log('*** Internal Error while retrieving employee records.');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'findAll query failed. Internal Server Error'});
      return;
    }

    if (!employees) {
      sendJSONResponse(res, 200, { 
        message: 'No records found'});
      return;
    }

    sendJSONResponse(res, 200, employees);
  });
};

exports.getEmployeeById = function(req, res) {

  var employee_id=req.params.employee_id;
  if (!employee_id) {
    sendJSONResponse(res, 400, { 
      message: 'getEmployeeById: Missing query parameters'});
    return;
  }

  Employee.findOne({'_id': employee_id}, function(err, employee) {
    if (err) {
      console.log('*** Internal Error while retrieving an employee record:');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'findById failed. Internal Server Error' });
      return;
    }

    if (!employee) {
      sendJSONResponse(res, 200, {message: 'No records found'});
      return;
    }

    var result = {};
    result.employee = employee;
    var employee_id = employee._id;
    async.parallel([
      function(callback) {
        //Retrieve address information
        var address_svc_byemployeeid = appConfig.address_svc_byemployeeid;
        var remote_svc = address_svc_byemployeeid.replace(":employee_id", employee_id);
        request(remote_svc, function remoteSvc(error, response, data) {
          if(error) {
            console.log(error);
            return callback(error);
          }

          if (response.statusCode != 200) {
            console.log('Remote service error:' + response.statusCode + ':' + remote_svc);
            return callback(error);
          }

          result.address = JSON.parse(data);
          callback();
        });
      }, 
      function(callback) {
        //Retrieve compensation data
        var comp_svc_byemployeeid = appConfig.compensation_svc_byemployeeid;
        var remote_svc = comp_svc_byemployeeid.replace(":employee_id", employee_id);
        request(remote_svc, function remoteSVC(error, response, data) {
          if(error) {
            console.log(error);
            return callback(error);
          }

          if (response.statusCode != 200) {
            console.log('Remote service error:' + response.statusCode + ':' + remote_svc);
            return callback(error);
          }

          result.compensation = JSON.parse(data);
          callback();
        });
      }, 
      function(callback) {
        //Retrieve Family data
        var family_svc_byemployeeid = appConfig.family_svc_byemployeeid;
        var remote_svc = family_svc_byemployeeid.replace(":employee_id", employee_id);
        request(remote_svc, function remoteSVC(error, response, data) {
          if(error) {
            console.log(error);
            return callback(error);
          }

          if (response.statusCode != 200) {
            console.log('Remote service error:' + response.statusCode + ':' + remote_svc);
            return callback(error);
          }

          result.family = JSON.parse(data);
          callback();
        });
      }, 
      function(callback) {
        //Retrieve Health data
        var health_svc_byemployeeid = appConfig.health_svc_byemployeeid;
        var remote_svc = health_svc_byemployeeid.replace(":employee_id", employee_id);
        request(remote_svc, function remoteSVC(error, response, data) {
          if(error) {
            console.log(error);
            return callback(error);
          }

          if (response.statusCode != 200) {
            console.log('Remote service error:' + response.statusCode + ':' + remote_svc);
            return callback(error);
          }

          result.health = JSON.parse(data);
          callback();
        });
      },
      function(callback) {
        //Retrieve Employee photo data
        var photo_svc_byemployeeid = appConfig.photo_svc_byemployeeid;
        var remote_svc = photo_svc_byemployeeid.replace(":employee_id", employee_id);
        request(remote_svc, function remoteSVC(error, response, data) {
          if(error) {
            console.log(error);
            return callback(error);
          }

          if (response.statusCode != 200) {
            console.log('Remote service error:' + response.statusCode + ':' + remote_svc);
            return callback(error);
          }

          result.photo = JSON.parse(data);
          callback();
        });
      }
    ], function(err) {
      if (err) {
        console.log('getEmployeeById: Error occured with async.parallel');
        sendJSONResponse(res, 500, {
          message: 'async.parallel error while finding an employee record by ID'
        });
        return;
      }

      sendJSONResponse(res, 200, result);
      return;
    });
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

exports.getAllEmployeeIds = function getAllEmployeeIds(req, res) {

  var query = Employee.find();
  query.select('_id');
  query.exec(function callJSON(err, data) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'getAllEmployeeIds query failed. Internal Server Error'});
      return;
    }
    var ids = null;
    if (data) {
      ids = collectEmployeeIds(data);
    }
    sendJSONResponse(res, 200, ids);
  });
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

exports.getEmployeesByName = function getEmployeesByName(req, res) {

  var first_name=req.query.first_name;
  var last_name=req.query.last_name;

  if (!first_name && !last_name) {
    var query = Employee.find();
    query.select('last_name');
    query.exec(function(err, data) {
      if (err) {
        console.log(err);
        sendJSONResponse(res, 500, { 
          message: 'getEmployeesByName query failed. Internal Server Error'});
        return;
      }
      
      var lastNameArr = collectLastNames(data);

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

      if (!employees) {
        sendJSONResponse(res, 200, {message: 'No records found'});
        return;
      }
      sendJSONResponse(res, 200, employees);
    }); 
  }
};

exports.getEmployeesByZipcode = function getEmployeesByZipcode(req, res) {

  var zipcode = req.query.zipcode;

  var address_svc_byzipcode = appConfig.address_svc_byzipcode;
  var remote_svc = address_svc_byzipcode;
  if (zipcode) {
    remote_svc = address_svc_byzipcode + "?zipcode=" + zipcode;
  }

  request(remote_svc, function remoteSVC(error, response, addresses) {
    if(error) {
      sendJSONResponse(res, 500, { 
        message: 'Internal Error with Remote service:' + remote_svc});
      return;
    }

    if (response.statusCode != 200) {
      sendJSONResponse(res, response.statusCode, {
        message: 'Remote query failed.' + remote_svc});
      return;
    }

    if (!addresses) {
      sendJSONResponse(res, response.statusCode, {
        message: 'Remote query: No zipcodes found:' +  remote_svc});
      return;
    }

    sendJSONResponse(res, 200, addresses);
    return;
  });
};

exports.deleteByEmployeeId = function(req, res) {

  var employee_id = req.params.employee_id;

  if(!employee_id) {
    sendJSONResponse(res, 400, { 
      message: 'Delete Employee: Missing employee input'});
    return;
  }


  //Save employee record and capture employee_id 
  Employee.remove({'_id' : employee_id}, function(err, data) {
    if (err) {
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'Delete Employee: Internal error while saving employee record'});
      return;
    }

    async.parallel([
      function(callback) {
        //Remote call to delete the record
        var service_url = appConfig.address_svc + "/" + employee_id;
        remoteServiceDeleteCall(service_url, callback);
      },
      function(callback) {
        //Compensation
        var service_url = appConfig.compensation_svc + "/" + employee_id;
        remoteServiceDeleteCall(service_url, callback);
      },
      function(callback) {
        //family
        var service_url = appConfig.family_svc + "/" + employee_id;
        remoteServiceDeleteCall(service_url, callback);
      },
      function(callback) {
        //health
        var service_url = appConfig.health_svc + "/" + employee_id;
        remoteServiceDeleteCall(service_url, callback);
      },
      function(callback) {
        //Photo
        var service_url = appConfig.photo_svc + "/" + employee_id;
        remoteServiceDeleteCall(service_url, callback);
      }
    ], function(err) {
      if (err) {
        console.log('Delete Employee: Error occured with async.parallel');
        sendJSONResponse(res, 500, {
          message: 'async.parallel error while deleting employee record'
        });
        return;
      }

      sendJSONResponse(res, 200, null);
    }); //End of async.parallel()
  }); //End of Employee.save()
};
