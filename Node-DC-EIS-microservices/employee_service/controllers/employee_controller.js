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
const http = require('http');
var appConfig = require('../config/configuration');
const Employee = require('../models/employee');
const Address = require('../models/address');
const Family = require('../models/family');
const Compensation = require('../models/compensation');
const Health = require('../models/health');
const Photo = require('../models/photo');

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
async function doGetRequest(url) {
  console.log('Making a GET call to a service at:', url);
  return new Promise( (resolve, reject) => {
    http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
      res.on('error', (error) => {
        reject(error);
      });
    });
  });
};

function doPostRequest(url, data) {
  console.log(`Making a POST call to a service at ${url} with input ${data}`);
  const postInput = JSON.stringify(data);

  // Input url format is: http://<hostname>:<port>/<endpoint>/...
  // Get the hostname, port and path from the url
  const urlSplit = url.split(/[/:]/);
  
  let hostname='';
  let port='';
  let path='/';
  for (let idx=0; idx < urlSplit.length; idx++) {
    if (idx < 3) {
      continue;
    }
    const token = urlSplit[idx];
    if (idx == 3) {
      hostname = token;
    } else if (idx == 4) {
      port = token;
    } else {
      path += token;
      if (idx < urlSplit.length-1) {
        path += '/';
      }
    }
  }

  const options = {
    hostname: hostname,
    port: port,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postInput.length
    }
  };

  return  new Promise( (resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (error) => {
      console.log('Error:', error.message);
      reject(error);
    });

    req.write(postInput);
    req.end();
  });
};

function doDeleteRequest(url) {
  console.log(`Making a DELETE call to a service at ${url}`);

  // Input url format is: http://<hostname>:<port>/<endpoint>/...
  // Get the hostname, port and path from the url
  const urlSplit = url.split(/[/:]/);
  
  let hostname='';
  let port='';
  let path='/';
  for (let idx=0; idx < urlSplit.length; idx++) {
    if (idx < 3) {
      continue;
    }
    const token = urlSplit[idx];
    if (idx == 3) {
      hostname = token;
    } else if (idx == 4) {
      port = token;
    } else {
      path += token;
      if (idx < urlSplit.length-1) {
        path += '/';
      }
    }
  }

  const options = {
    hostname: hostname,
    port: port,
    path: path,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  return  new Promise( (resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (error) => {
      console.log('Error:', error.message);
      reject(error);
    });

    req.end();
  });
};

// Exported API functions/methods
exports.addNewEmployee = async function addNewEmployeeAddress(req, res) {
  let missing_field_flag = false;
  let warning_msg;

  //Build Employee record
  const emp = req.body.emp;
  const addr = req.body.addr;
  let compensation = req.body.compensation;
  let family = req.body.family;
  let health = req.body.health;
  let photo = req.body.photo;

  if(!emp) {
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee input'});
    return;
  }

  if(!addr){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing address input'});
    return;
  }

  if(!compensation){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing compensation input'});
    return;
  }

  if(!family){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing family input'});
    return;
  }
  if(!health){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing health input'});
    return;
  }
  if(!photo){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing photo input'});
    return;
  }

  if(!emp.phone || !emp.first_name || !emp.last_name || !emp.email || !emp.role){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee input'});
    return;
  }

  if(!addr.zipcode){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee:addr.zipcode input'});
    return;
  }

  //Build Employee Object
  const employee = new Employee();
  employee.phone = emp.phone;
  employee.first_name = emp.first_name;
  employee.last_name = emp.last_name;
  employee.email = emp.email;
  employee.role = emp.role;

  //Build Address Object
  let address = {
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

  //Build Family Object
  if(family.childrens == undefined){
    missing_field_flag = true;
  }

  if(family.marital_status == undefined){
    missing_field_flag = true;
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Family input are missing";
    missing_field_flag = false;
  }

  //Build Compensation Object
  if(!compensation || compensation.stock == undefined){
    missing_field_flag = true;
  }

  if(!compensation || compensation.pay == undefined){
    missing_field_flag = true;
  }  

  if(missing_field_flag) {
    warning_msg = "Some field from Compensation input are missing";
    missing_field_flag = false;
  } 

  //Build Health Object
  if(!health || health.paid_family_leave == undefined){
    missing_field_flag = true;
  }

  if(!health || health.long_term_disability_plan == undefined){
    missing_field_flag = true;
  }

  if(!health || health.short_term_disability_plan == undefined){
    missing_field_flag = true;
  }

  if(missing_field_flag) {
    warning_msg = "Some field from Health input are missing";
    missing_field_flag = false;
  }

  //Build Photo Object
  if(!photo || photo == undefined) {
    missing_field_flag = true;
  }

  if(missing_field_flag) {
    warning_msg = "Photo input is missing";
    missing_field_flag = false;
  }

  try {
    await employee.save();
    address._employee = employee._id;
    address.employee = employee;

    // make a address service call to submit new data for an employee
    let service_url = appConfig.address_svc;
    const newAddressRec = doPostRequest(service_url, address);

    // make a family service call to submit new data for an employee
    family._employee = employee._id;
    family.employee = employee;
    service_url = appConfig.family_svc;
    const newFamilyRec = doPostRequest(service_url, family);

    // make a compensation service call to submit new data for an employee
    compensation._employee = employee._id;
    compensation.employee = employee;
    service_url = appConfig.compensation_svc;
    const newCompensationRec = doPostRequest(service_url, compensation);

    // make a health service call to submit new data for an employee
    health._employee = employee._id;
    health.employee = employee;
    service_url = appConfig.health_svc;
    const newHealthRec = doPostRequest(service_url, health);

    // make a photo service call to submit new data for an employee
    photo._employee = employee._id;
    photo.employee = employee;
    service_url = appConfig.photo_svc;
    const newPhotoRec = doPostRequest(service_url, photo);

    console.log('Issueed all post requests, waiting for the results');
    const results = await Promise.all([
      newAddressRec,
      newFamilyRec,
      newCompensationRec,
      newHealthRec,
      newPhotoRec,
    ]);
    
    let returnedObj = {
      employee_id: employee._id,
      results
    };
    if (warning_msg) {
      returnedObj.warning_msg = warning_msg;  
    }
      
    sendJSONResponse(res, 200, { result: returnedObj});

  } catch (err) {
  console.log(err.message);
    sendJSONResponse(res, 500, {
      message: 'Saving Employee: Internal error while saving employee record'});
    return;
  }
};

exports.getAllEmployees = async function(req, res) {
  try {
    const employees = await Employee.find();

    if (!employees) {
      sendJSONResponse(res, 200, { 
        message: 'No records found'});
      return;
    }

    sendJSONResponse(res, 200, employees);
  } catch (err) {
      console.log('*** Internal Error while retrieving employee records.');
      console.log(err);
      sendJSONResponse(res, 500, { 
        message: 'findAll query failed. Internal Server Error'});
      return;
  }
};

exports.getEmployeeById = async function(req, res) {

  const employee_id=req.params.employee_id;
  if (!employee_id) {
    sendJSONResponse(res, 400, { 
      message: 'getEmployeeById: Missing query parameters'});
    return;
  }


  async function getDetailsOfEmployee(employee_id) {
    try {
      // Get Address data
      const address_svc_byemployeeid = appConfig.address_svc_byemployeeid;
      let remote_svc_url = address_svc_byemployeeid.replace(":employee_id", employee_id);
      const addressDetails = doGetRequest(remote_svc_url);

      // Get family data
      const family_svc_byemployeeid = appConfig.family_svc_byemployeeid;
      remote_svc_url = family_svc_byemployeeid.replace(":employee_id", employee_id);
      const familyDetails = doGetRequest(remote_svc_url);

      // Get health data
      const health_svc_byemployeeid = appConfig.health_svc_byemployeeid;
      remote_svc_url = health_svc_byemployeeid.replace(":employee_id", employee_id);
      const healthDetails = doGetRequest(remote_svc_url);

      // Get compensation data
      const comp_svc_byemployeeid = appConfig.compensation_svc_byemployeeid;
      remote_svc_url = comp_svc_byemployeeid.replace(":employee_id", employee_id);
      const compensationDetails = doGetRequest(remote_svc_url);

      // Get photo data
      const photo_svc_byemployeeid = appConfig.photo_svc_byemployeeid;
      remote_svc_url = photo_svc_byemployeeid.replace(":employee_id", employee_id);
      const photoDetails = doGetRequest(remote_svc_url);

      console.log('Issueed all requests, waiting for the results');

      const results = await Promise.all([
        addressDetails,
        familyDetails,
        healthDetails,
        compensationDetails,
        photoDetails
      ]);
      
       sendJSONResponse(res, 200, results);

    } catch (error) {
      console.error(error.message);
       sendJSONResponse(res, 500, {
         message: 'http.get requests error while finding all records for an employee'
       });
       return;
    }
  } // end of async function

  try {
    const employee = await Employee.findOne({'_id': employee_id});
    if (!employee) {
      sendJSONResponse(res, 200, {message: 'No records found'});
      return;
    }
    getDetailsOfEmployee(employee._id);
  } catch (err) {
    console.log('*** Internal Error while retrieving an employee record:');
    console.log(err);
    sendJSONResponse(res, 500, { 
      message: 'findById failed. Internal Server Error' });
    return;
  }
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

exports.getEmployeesByName = async function getEmployeesByName(req, res) {

  var first_name=req.query.first_name;
  var last_name=req.query.last_name;

  try {
    if (!first_name && !last_name) {
      const data = await Employee.find({}).select('last_name');
      const lastNameArr = collectLastNames(data);
      sendJSONResponse(res, 200, lastNameArr);
    } else if (first_name && last_name) {
      const employyes = await Employee.find({
        'first_name': first_name,
        'last_name': last_name});
      sendJSONResponse(res, 200, employees);
    } else if (first_name && !last_name) {
      const employees = await Employee.find({'first_name': first_name});
      sendJSONResponse(res, 200, employees);
    } else if (last_name && !first_name) {
      const employees = await Employee.find({'last_name': last_name});
      sendJSONResponse(res, 200, employees);
    }
  } catch (err) {
     console.log(err);
    sendJSONResponse(res, 500, { 
      message: 'getEmployeesByName query failed. Internal Server Error'});
  }

  return;
};

exports.getEmployeesByZipcode = async function getEmployeesByZipcode(req, res) {

  var zipcode = req.query.zipcode;

  var address_svc_byzipcode = appConfig.address_svc_byzipcode;
  var remote_svc = address_svc_byzipcode;
  if (zipcode) {
    remote_svc = address_svc_byzipcode + "?zipcode=" + zipcode;
  }

  try {
    const addresses = await doGetRequest(remote_svc);
    sendJSONResponse(res, 200, addresses);
  } catch (error) {
    console.log(error.message);
    sendJSONResponse(res, 500, { 
      message: 'Internal Error with Remote service:' + remote_svc});
  }
  return;
};

exports.deleteByEmployeeId = async function(req, res) {

  const employee_id = req.params.employee_id;

  if(!employee_id) {
    sendJSONResponse(res, 400, { 
      message: 'Delete Employee: Missing employee input'});
    return;
  }

  try {
    let service_url = appConfig.address_svc + "/" + employee_id;
    const oldAddress = doDeleteRequest(service_url);

    service_url = appConfig.family_svc + "/" + employee_id;
    const oldFamily = doDeleteRequest(service_url);

    service_url = appConfig.compensation_svc + "/" + employee_id;
    const oldComp = doDeleteRequest(service_url);

    service_url = appConfig.health_svc + "/" + employee_id;
    const oldHealth = doDeleteRequest(service_url);

    service_url = appConfig.photo_svc + "/" + employee_id;
    const oldPhoto = doDeleteRequest(service_url);

    const oldEmployee = await Employee.deleteOne({'_id' : employee_id});

    const results = await Promise.all([
      oldAddress, oldFamily, oldComp, oldHealth, oldPhoto, oldEmployee
    ]);

    sendJSONResponse(res, 200, results);

  } catch (err) {
    console.log(err.message);
    sendJSONResponse(res, 500, { 
      message: 'Delete Employee: Internal error while saving employee record'});
    return;
  }
};

exports.loaddb = async function loaddb(req, res) {
  var count = req.query.count;
  var zipcount = req.query.zipcode;
  var lastnamecount = req.query.lastname;
  
  const service_url = appConfig.db_loader_svc_ipaddress+ "?count="+count+"&zipcode="+zipcount+"&lastname="+lastnamecount;
	try {
  	const updatedDB = await doGetRequest(service_url);
    sendJSONResponse(res, 200, updatedDB);
	} catch (err) {
    sendJSONResponse(res, 500, { 
    	message: `loadDB serice request failed with ${err.message} error`});
	}
  return;
};

exports.checkdb = async function checkdb(req, res) {
  let count = req.query.count;
  if ( (count === undefined) || (count === 0)) {
    count = appConfig.count;
  }
  if ( (count === undefined) || (count === 0)) {
    count = 1;
  }
  const service_url = appConfig.checkdb_svc_ipaddress+"?count="+count;
	try {
  	const results = await doGetRequest(service_url);
    sendJSONResponse(res, 200, JSON.parse(results));
	} catch (err) {
    sendJSONResponse(res, 500, { 
    	message: `checkDB serice request failed with ${err.message} error`});
	}
  return;
};

exports.cleanupdb = async function cleanupdb(req, res) {
  const service_url = appConfig.cleanupdb_svc_ipaddress;
	try {
  	const results = await doDeleteRequest(service_url);
    sendJSONResponse(res, 200, results);
	} catch (err) {
		console.log(err.message);
    sendJSONResponse(res, 500, { 
    	message: `checkDB serice request failed with ${err.message} error`});
	}
  return;
};
