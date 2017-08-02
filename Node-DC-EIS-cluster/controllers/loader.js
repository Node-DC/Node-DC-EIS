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

var Employee = require('../models/employee');
var appConfig = require('../config/configuration');
var fs = require('fs');
var readline = require('readline');
var async = require('async');
var resetCache = require('./employees_controller').resetCache;

var fnames = [];
var lnames = [];
var addresses = [];

var states = [ 'AL', 'OR', 'CA', 'WA', 'NJ', 'TN', 'DE', 'FL', 'TX', 'ID' ];
var street_suffixes = [ 'Way', 'Drive', 'Rd', 'Lane', 'Court', 'Street', 'Ave', 'Plaza' ];
var directions = [ 'E', 'W', 'N', 'S', 'SE', 'SW', 'NE', 'NW' ];

function sendJSONResponse(res, status, content) {
  res.status(status);
  res.json(content);
};

function read_in_addresses(callback) {
  console.log('Constructing list of Addresses');
  if (addresses.length  === 0) {
    var rd = readline.createInterface({
      input: fs.createReadStream('./data/people.streets'),
      output: process.stdout,
      terminal: false
    });
  
    rd.on('line', function processLine(line) {
      var aptnum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
      var street_dir = directions[Math.floor(Math.random() * (directions.length))];
      var street_sfx = street_suffixes[Math.floor(Math.random() * (street_suffixes.length))];
      var addr =  aptnum + ", " + street_dir + " " + street_sfx;
      addresses.push(addr);
    });
    rd.on('close', function close() {
      rd.close();
      callback();
    });
  }
  else {
    callback();
  } 
}

function read_in_lastnames(callback) {
  console.log('Constructing list of last names');
  if (lnames.length  === 0) {
    var rd = readline.createInterface({
      input: fs.createReadStream('./data/people.lname'),
      output: process.stdout,
      terminal: false
    });
  
    rd.on('line', function pushLine(line) {
      lnames.push(line);
    });
    rd.on('close', function close() {
      rd.close();
      callback();
    });
  }
  else {
    callback();
  } 
}

function read_in_firstnames(callback) {
  console.log('Constructing list of first names');
  if (fnames.length  === 0) {
    var rd = readline.createInterface({
      input: fs.createReadStream('./data/people.fname'),
      output: process.stdout,
      terminal: false
    });
  
    rd.on('line', function pushLine(line) {
      fnames.push(line);
    });
    rd.on('close', function close() {
      rd.close();
      callback();
    });
  }
  else {
    callback();
  } 
}

function start_here(count, callback) {
  read_in_firstnames(function readInLastNames() {
    read_in_lastnames(function readInAddresses() {
      read_in_addresses(callback);
    });
  });
};

function generateZipCodes(zipcount) {
  //Build list of zipcodes to be used
  var zipCodeArr = new Array(zipcount);
  for (var z=0; z < zipcount; z++) {
    zipcode = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;
    zipCodeArr[z] = zipcode;
  }
  return(zipCodeArr);
}

exports.initDb = function initDB(req, res) {
  var count = req.query.count;
  var zipcount = req.query.zipcode;
  var lastnamecount = req.query.lastname;
  
  if ( (count === undefined) || (count === 0) || isNaN(count) ) {
    count = appConfig.count;
  }

  if ( (zipcount === undefined) || (zipcount === 0) || isNaN(zipcount)) {
    zipcount = appConfig.zipcount;
  }

  if ( (lastnamecount === undefined) || (lastnamecount === 0) || isNaN(lastnamecount)) {
    lastnamecount = appConfig.lastnamecount;
  }

  if ( (count === undefined) || (count === 0)) {
    count = 1;
  }

  if ( (zipcount === undefined) || (zipcount === 0)) {
    zipcount=1;
  } else {
    zipcount = count / zipcount;
  }

  if ( (lastnamecount === undefined) || (lastnamecount === 0)) {
    lastnamecount=1;
  } else {
    lastnamecount = count / lastnamecount;
  }

  //Cleanup the database
  Employee.remove().exec();
  resetCache();

  var zipCodeArr = generateZipCodes(zipcount);

  start_here({'count': count}, function startHere() {
  var saved_record=0;
  var last_marital_status = true;
  var last_shortterm_disability_plan = false;
  var last_longterm_disability_plan = true;
  var last_paid_family_leave_status = true;

  var e_count=0;
  var zipcode_current_index=0;
  var lastname_current_index=0;
  var original_lname_len=lnames.length;
  if (lnames.length <= lastnamecount) {
    var new_namecount = lastnamecount - lnames.length;
    var idx = 0;
    for (var ii=0; ii < new_namecount; ii++) {
      var new_name = lnames[idx]+ii.toString();
      idx++;
      if (idx > original_lname_len){
        idx = 0;
      }
      lnames.push(new_name);
     }
  }
  for (var ii=0; ii < count; ii++) {
    //Build Employee record
    var employee = new Employee();
    employee.phone = Math.floor(Math.random() * (9999999999 - 1111111111 + 1)) + 1111111111;
    employee.first_name = fnames[Math.floor(Math.random() * (fnames.length))];
    employee.email = employee.first_name + ii.toString() + '@example.com';

    if (lastname_current_index >= lnames.length) {
      lastname_current_index=0;
    }

    var lastname = lnames[lastname_current_index]; 
    lastname_current_index++;

    employee.last_name = lastname;

    var aptnum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    var street_dir = directions[Math.floor(Math.random() * (directions.length))];
    var street_sfx = street_suffixes[Math.floor(Math.random() * (street_suffixes.length))];
    var street = aptnum + ", " + street_dir + " " + street_sfx;
    var state = states[Math.floor(Math.random() * (states.length))];

    if (zipcode_current_index >= zipCodeArr.length) {
      zipcode_current_index=0;
    }
    var zipcode = zipCodeArr[zipcode_current_index]; 
    zipcode_current_index++;
       
    employee.address = {
      street : street,
      zipcode : zipcode,
      state : state,
      country : 'USA'
    }
   
    var pay = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    var stock = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;

    employee.compensation = {
      pay : pay,
      stock : stock
    }

    last_marital_status = !last_marital_status;
    var marital_status = last_marital_status;
    var childrens = Math.floor(Math.random() * (5 - 3 + 1)) + 1;

    employee.family = {
      marital_status : marital_status,
      childrens : childrens
    }

    last_shortterm_disability_plan = !last_shortterm_disability_plan;
    last_longterm_disability_plan = !last_longterm_disability_plan;
    last_paid_family_leave_status = !last_paid_family_leave_status;

    employee.health = {
      shortterm_disability_plan : last_shortterm_disability_plan,
      longterm_disability_plan : last_longterm_disability_plan,
      paid_family_leave : last_paid_family_leave_status
    }

    var imageStr = null;
    try {
      var fileContents;
      var image_filename = appConfig.image_name;
      fileContents = fs.readFileSync(__dirname + '/../data/' + image_filename);
      imageStr = fileContents.toString('base64');
    } catch (err) {
      console.log(err);
      res.send({'message': 'image is null: Internal error while saving employee record'});
      return;
     }

    if (!imageStr) {
      console.log(err);
      console.log('image is null: Internal error while saving employee record');
      res.send({'message': 'image is null: Internal error while saving employee record'});
      return;
    }
    employee.photo ={
      image : imageStr
    }
            
        //Save employee record and capture employee_id 
    employee.save(function saveEmployee(err, data) {
      if (err) {
        console.log(err);
        console.log('Saving Employee: Internal error while saving employee record');
        res.send({'message': 'Saving Employee: Internal error while saving employee record'});
        return;
      }
      employee_id = data._id;
      e_count++;
      if (e_count == count) {
        res.send({'message' : count + ' records are populated'});
      }
      })
    } //End of a for loop
  });
};

exports.isDBSet = function isDBSet(req, res) {
  //Check if Employees.count(), Addresses.count(), etc. matches as expected
  var dbcount = req.query.count;
  var e_count = 0; 
  var result = {};
  Employee.count({},function countEmployee(err,count){
    if(err) {
        console.log(err);
        res.send({'message': 'Employee count failed'});
        return;
    }
  e_count = count;
  result['count'] = count;
  if (e_count == dbcount)  {  
    res.send({'db_status': 200, 'message': 'Database is set' , 'result': result});
  } else {
    res.send({'db_status': 201, 'message': 'Database generation is still in progress','result': result });
  }
  });
  return;
};
