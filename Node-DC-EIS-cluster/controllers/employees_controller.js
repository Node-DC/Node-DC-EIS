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

// Setting up IPC for cache resets
if (appConfig.cpu_count != 0 && process.send) {
  process.on('message', function(msg) {
    if (msg.event && msg.event === 'reset_cache') {
      console.log('Resetting cache');
      employeeCache.reset();
    }
  });
}

function sendResponse(res, status, content, view) {
  view = view || 'employees';
  res.format({
    'json': function() {
      sendJSONResponse(res, status, content);
    },
    'html': function() {
      res.status(status);
      res.render(view, {content: content, reqPath: res.req.path});
    },
    'default': function() {
      res.status(406).send('Not Acceptable');
    }
  });
}

function sendImageResponse(res, status, content) {
  res.status(status);
  if(status != 200) {
        res.json(content);
  } else {
    // We assume that all images in DB are JPEGs
    res.set('Content-Type', 'image/jpeg');
    res.send(content);
  }

}

function sendJSONResponse(res, status, content) {
  res.status(status);
  res.json(content);
};

/******************************************************
 API interface
******************************************************/

function resetCache() {
  if(!enable_caching){
    return;
  }

  if (appConfig.cpu_count != 0 && process.send) {
    console.log('Sending reset to parent');
    process.send({event: 'reset_cache'});
  } else {
    console.log('Resetting cache');
    employeeCache.reset();
  }
}

exports.resetCache = resetCache;

exports.addNewEmployee = async function addNewEmployee(req, res) {
  var missing_field_flag = false;
  var warning_msg;

  //Build Employee record
  var employeeObj;
  var addressObj;
  if (req.body.emp) {
		console.log('Found emp property instead of employee');
    employeeObj = req.body.emp;
	} else if (req.body.employee) {
    employeeObj = req.body.employee;
	}
	if (req.body.addr) {
		console.log('Found addr property instead of address');
    addressObj = req.body.addr;
	} else if (req.body.address) {
    addressObj = req.body.address;
	}
  var compensationObj = req.body.compensation;
  var familyObj = req.body.family;
  var healthObj = req.body.health;
  var photoObj = req.body.photo;
  if (enable_caching) {
    resetCache();
  }

  if(!employeeObj || !addressObj || !compensationObj || !familyObj || !healthObj || !photoObj){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee input'});
    return;
  }

  if(!employeeObj.first_name || !employeeObj.last_name){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee name input'});
    return;
  }

  if(!addressObj.zipcode){
    sendJSONResponse(res, 400, { 
      message: 'addNewEmployee: Missing employee address zipcode input'});
    return;
  }

  //Build Employee Object
  var employee = new Employee();
  employee.phone = employeeObj.phone;
  employee.first_name = employeeObj.first_name;
  employee.last_name = employeeObj.last_name;
  employee.email = employeeObj.email;
  employee.role = employeeObj.role;

 //Build Address Object
  var zipcode = addressObj.zipcode;
  var country = addressObj.country;
  var state = addressObj.state;
  var street = addressObj.street;

  if(country == undefined){
    missing_field_flag = true;
  } 

  if(state == undefined){
    missing_field_flag = true;
  } 

  if(street == undefined){
    missing_field_flag = true;
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
  var stock = compensationObj.stock;
  var pay = compensationObj.pay;

  if(stock == undefined){
    missing_field_flag = true;
  }

  if(pay == undefined){
    missing_field_flag = true;
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
  var childrens = familyObj.childrens;
  var marital_status = familyObj.marital_status;

  if(childrens == undefined){
    missing_field_flag = true;
  } 

  if(marital_status == undefined){
    missing_field_flag = true;
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
  var paid_family_leave = healthObj.paid_family_leave;
  var longterm_disability_plan = healthObj.longterm_disability_plan;
  var shortterm_disability_plan = healthObj.shortterm_disability_plan;
  if(paid_family_leave == undefined){
    missing_field_flag = true;
  } 

  if(longterm_disability_plan == undefined){
    missing_field_flag = true;
  } 

  if(shortterm_disability_plan == undefined){
    missing_field_flag = true;
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
  var image = photoObj.image;
  //Build Photo Object
  if(!image){
  try {
      var fileContents;
      var image_filename = appConfig.image_name;
      fileContents = fs.readFileSync(__dirname + '/../data/' + image_filename);
      image = fileContents.toString('base64');
    } catch (err) {
      console.log(err);
      return res.send({'message': 'image is null'});
      missing_field_flag = true; }

    if (!image) {
      console.log(err);
      console.log('image is null');
      return res.send({'message': 'image is null'});
      missing_field_flag = true;
    }
  }
  employee.photo ={
    image : image
  }
  if(missing_field_flag) {
    warning_msg = "Photo input is missing";
    missing_field_flag = false;
  }

  //Save employee record and capture employee_id 
  try {
    await employee.save();
    var returned_obj = {};
      returned_obj.employee_id = employee._id;
      if (warning_msg) {
        returned_obj.warning_msg = warning_msg;
      }
      
      sendJSONResponse(res, 200, {
        result: returned_obj });
  } catch (err) {
    console.log(err);
    sendJSONResponse(res, 500, { 
      message: 'Saving Employee: Internal error while saving employee record'});
	}

  return;
};

exports.deleteByEmployeeId = async function deleteByEmployeeId(req, res) {
  if (enable_caching) {
    resetCache();
  }

  var employee_id = req.params.id;
  if(!employee_id) {
    console.log("Missing employee_id");
    sendJSONResponse(res, 400, { 
      message: 'Missing input employee id'
    });
    return;
  }
  
	try {
    const oldEmployee = await Employee.deleteOne({'_id' : employee_id});
    sendJSONResponse(res, 200, {
      message: 'Employee record Successfully deleted'});     
	} catch (err) {
    console.log(err.message);
    sendJSONResponse(res, 500, { 
      message: 'Deleting Employee: Internal error while deleting employee record'});
	}

  return;
};

exports.findAll = async function findAll(req, res) {
  if (enable_caching) {
    var cacheKey = req.originalUrl;
    var cachedRes = employeeCache.get(cacheKey);
    if (cachedRes) {
      sendResponse(res, 200, cachedRes);
      return;
    }
  }

  try {
    const employees = await Employee.find({}).select('-address -compensation -health -family -photo');

    if (!employees) {
      sendJSONResponse(res, 200, {
        message: 'No records found'});
      return;
    }

    if(enable_caching) {
      employeeCache.set(cacheKey, employees);
    }

    sendJSONResponse(res, 200, employees);
  } catch (err) {
      console.log('*** Internal Error while retrieving employee records.');
      console.log(err);
      sendJSONResponse(res, 500, {
        message: 'findAll query failed. Internal Server Error'});
  }
  return;
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

exports.getAllIds = async function getAllIds(req, res) {
  let cacheKey = req.originalUrl;
  if (enable_caching) {
    var cachedRes = employeeCache.get(cacheKey);
    if (cachedRes) {
      sendResponse(res, 200, cachedRes);
      return;
    }
  }

  try {
    const data = await Employee.find({}).select('_id');
    let ids = null;
    if (data && data.length > 0) {
      ids = collectEmployeeIds(data);
    }

    if (enable_caching) {
      employeeCache.set(cacheKey, ids);
    }
    sendJSONResponse(res, 200, ids);
  } catch (err) {
    console.log(err.message);
    sendJSONResponse(res, 500, { 
      message: 'getAllIds query failed. Internal Server Error'});
  }

  return;
};

exports.findByZipcode = async function findByZipcode(req, res) {
  if (enable_caching) {
    var cacheKey = req.originalUrl;
    var cachedRes = employeeCache.get(cacheKey);
    if (cachedRes) {
      sendResponse(res, 200, cachedRes);
      return;
    }
  }
  var zipcode=req.query.zipcode;
  
  if (!zipcode) {
		try {
    	const data = await Employee.distinct("address.zipcode");
      
      var zipCodeArr = data;

      if (enable_caching) {
        employeeCache.set(cacheKey, zipCodeArr);
      }
      sendResponse(res, 200, zipCodeArr);
		} catch (err) {
      console.log(err);
      sendResponse(res, 500, {
        message: 'getAllZipcodes query failed. Internal Server Error'});
		}
    return;
  }
  
	try {
	  const addresses = await Employee.find({'address.zipcode' : zipcode});
    if (enable_caching) {
      employeeCache.set(cacheKey, addresses);
    }
    sendResponse(res, 200, addresses);
	} catch (err) {
    console.log(err);
    sendResponse(res, 500, {
      message: 'findByZipcode query failed. Internal Server Error'});
    return;
	}
};


exports.findByName = async function findByName(req, res) {
  const cacheKey = req.originalUrl;
  if (enable_caching) {
    var cachedRes = employeeCache.get(cacheKey);
    if (cachedRes) {
      sendResponse(res, 200, cachedRes);
      return;
    }
  }

  var first_name=req.query.first_name;
  var last_name=req.query.last_name;

  if (!first_name && !last_name) {
		try {
      const data = await Employee.distinct('last_name');
      if (enable_caching) {
        employeeCache.set(cacheKey, data);
      }
      sendResponse(res, 200, data);
		} catch (err) {
      console.log(err.message);
      sendResponse(res, 500, {
        message: `findAll query for distinct lastnames failed. Internal Server Error. ${err.message}`});
		}

    return;
  }
  
  let query = {};
  if (first_name) {
    query.first_name = first_name;
  }

  if (last_name) {
    query.last_name = last_name;
  }

	try {
    const employees = await Employee.find(query);
		if (employees && employees.length > 0 && enable_caching) {
      employeeCache.set(cacheKey, employees);
		}
    sendResponse(res, 200, employees);
	} catch (err) {
    console.log(err.message);
    sendResponse(res, 500, {
      message: `findBy ${query} failed. Internal Server Error. ${err.message}` });
  }

  return;
};

exports.findById = async function findById(req, res) {
  if (enable_caching) {
    var cacheKey = req.originalUrl;
    var cachedRes = employeeCache.get(cacheKey);
    if (cachedRes) {
      sendResponse(res, 200, cachedRes, 'employee');
      return;
    }
  }

  var eid=req.params.id || req.query.id;
	try {
    const employee = await Employee.findOne({'_id': eid});
    let result = {};
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
    result.photo = employee.photo;

    if (enable_caching) {
      employeeCache.set(cacheKey, result);
    }
    sendResponse(res, 200, result, 'employee');
	} catch (err) {
    console.log('*** Internal Error while retrieving an employee record:');
    console.log(err.message);
    sendResponse(res, 500, {
      message: 'findById failed. Internal Server Error' },
      'employee');
	}

  return;
};

exports.findPhotoById = async function findPhotoById(req, res) {
  var eid = req.params.id || req.query.id || "";
  let cacheKey = req.originalUrl;

  if (enable_caching) {
    var cachedRes = employeeCache.get(cacheKey);

    if (cachedRes) {
      sendImageResponse(res, 200, cachedRes);
      return;
    }
  }

  try {
    eid = new ObjectId(eid);
		const result = await Employee.findOne({'_id': eid});
		if (result) {
      if (enable_caching) {
        employeeCache.set(cacheKey, imgdata);
      }
      sendImageResponse(res, 200,result.photo.image);
			return;
    }
    sendImageResponse(res, 200, "");

  } catch(e) {
    console.log(err.message);
    sendImageResponse(res, 500, {
        message: 'findPhotoById failed. Internal Server Error' });
  }

  return;
};
