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
var Address = require('../models/address');
var Compensation = require('../models/compensation');
var Family = require('../models/family');
var Health = require('../models/health');
var Photo = require('../models/photo');
var appConfig = require('../config/configuration');
var fs = require('fs');
var readline = require('readline');
var async = require('async');

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
  Address.remove().exec();
  Family.remove().exec();
  Compensation.remove().exec();
  Health.remove().exec();
  Photo.remove().exec();

  var zipCodeArr = generateZipCodes(zipcount);

  start_here({'count': count}, function startHere() {
  var saved_record=0;
  var last_marital_status = true;
  var last_shortterm_disability_plan = false;
  var last_longterm_disability_plan = true;
  var last_paid_family_leave_status = true;

  var e_count=0;
  var a_count=0;
  var c_count=0;
  var f_count=0;
  var h_count = 0;
  var p_count = 0;
  var zipcode_current_index=0;
  var lastname_current_index=0;
  var employee_id;
  var employeeObj;
  original_lname_len = lnames.length;
  if(original_lname_len <= lastnamecount) {
    var new_namecount = lastnamecount - original_lname_len;
    var idx = 0;
    for (var ii = 0; ii < new_namecount; ii++) {
      var new_name = lnames[idx]+ii.toString();
      idx++;
      if (idx > original_lname_len) {
        idx = 0;
      }
      lnames.push(new_name);
    }
  }
  for (var ii=0; ii < count; ii++) {
    async.series([
      function(callback) {
        //Build Employee record
        var employee = new Employee();
        employee.phone = Math.floor(Math.random() * (9999999999 - 1111111111 + 1)) + 1111111111;
        employee.first_name = fnames[Math.floor(Math.random() * (fnames.length))];
        employee.email = employee.first_name + ii.toString() + '@example.com';

        if (lastname_current_index >= lastnamecount) {
          lastname_current_index=0;
        }
        var lastname = lnames[lastname_current_index]; 
        lastname_current_index++;

        employee.last_name = lastname;
        //Save employee record and capture employee_id 
        employee.save(function saveEmployee(err, data) {
          if (err) {
            console.log(err);
            console.log('Saving Employee: Internal error while saving employee record');
            return callback(err, null);
          }
          employee_id = data._id;
          employeeObj = data;
          e_count++;
          callback();
        });
      },
      function(callback) {
        //Save address for that employee _id
        var _employee = employee_id;
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

        var address = new Address();
        address.street = street;
        address.zipcode = zipcode;
        address.state = state;
        address.country = 'USA';
        address._employee = _employee;
        address.employee = employeeObj;
        address.save(function saveAddress(err, data) {
          if (err) {
            console.log(err);
            console.log('Saving Address: Internal error while saving employee record');
            return callback(err, null);
          }

          a_count++;
          employee_id = data._employee;
          employeeObj = data.employee;
          callback();
        });
      }, 
      function(callback) {
        //Save Compensation info for that employee _id
        var _employee = employee_id;
        var compensation = new Compensation();
        compensation.pay = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
        compensation.stock = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
        compensation._employee = _employee;
        compensation.employee = employeeObj;
        compensation.save(function saveCompensation(err, data) {
          if (err) {
            console.log(err);
            console.log('Saving Compensation: Internal error while saving employee record');
            return callback(err, null);
          }
          c_count++;
          employee_id = data._employee;
          employeeObj = data.employee;
          //console.log('New Comp for:' + employee_id);
          callback();
        });
      },
      function(callback) {
        //Save Family info for that employee _id
        var _employee = employee_id;
        var family = new Family();
        last_marital_status = !last_marital_status;
        family.marital_status = last_marital_status;
        family.childrens = Math.floor(Math.random() * (5 - 3 + 1)) + 1;
        family._employee = _employee;
        family.employee = employeeObj;
        family.save(function saveFamily(err, data) {
          if (err) {
            console.log(err);
            console.log('Saving Family: Internal error while saving employee record');
            return callback(err, null);
          }
          f_count++;
          employee_id = data._employee;
          employeeObj = data.employee;
          //console.log('New family for:' + employee_id);
          callback();
        });
      }, 
      function(callback) {
        //Save Health info for that employee _id
        var _employee = employee_id;
        last_shortterm_disability_plan = !last_shortterm_disability_plan;
        last_longterm_disability_plan = !last_longterm_disability_plan;
        last_paid_family_leave_status = !last_paid_family_leave_status;

        var health = new Health();
        health.shortterm_disability_plan = last_shortterm_disability_plan;
        health.longterm_disability_plan = last_longterm_disability_plan;
        health.paid_family_leave = last_paid_family_leave_status;
        health._employee = _employee;
        health.employee = employeeObj;
        health.save(function saveHealth(err, data) {
          if (err) {
            console.log(err);
            console.log('Saving Health: Internal error while saving employee record');
            return callback(err, null);
          }
          h_count++;
          employee_id = data._employee;
          employeeObj = data.employee;
          //console.log('New Health for:' + employee_id);
          callback();
        });
      },
      function(callback) {
        //Build the image as a string
        var _employee = employee_id;
        var imageStr = null;
        try {
          var fileContents;
          fileContents = fs.readFileSync(__dirname + '/../data/image.jpeg');
          imageStr = fileContents.toString('base64');
        } catch (err) {
          console.log(err);
          return callback(err, null);
        }

        if (!imageStr) {
          console.log(err);
          console.log('image is null: Internal error while saving employee record');
          return callback(err, null);
        }
        var photo = new Photo();
        photo.image = imageStr;
        photo._employee = employee_id;
        photo.employee = employeeObj;
        photo.save(function savePhoto(err, data) {
          if (err) {
            console.log(err);
            console.log('Saving Photo: Internal error while saving employee record');
            return callback(err, null);
          }
          p_count++;
          //console.log(p_count + ' New Photo  is saved:' + data._employee);
          callback();
        }); //End of Photo.save
      }
    ], function(err) {
        if(err) {
          console.log('Error while running async.series' + err);
        } else {
          if ( (e_count == count) && (a_count == count) && (c_count == count) &&
            (f_count == count) && (h_count == count) && (p_count == count)) {
           res.send({'message' : count + ' records are populated'});
          }
        }
      });
    } //End of a for loop
  });
};

exports.isDBSet = function isDBSet(req, res) {
  //Check if Employees.count(), Addresses.count(), etc. matches as expected
  var count = req.query.count;
  var e_count = 0; //Get the employee count using async.parallel
  var a_count = 0; //Get the addresses count
  var c_count = 0; //Get the compensations count
  var f_count = 0; //Get the families count
  var h_count = 0; //Get the health count
  var p_count = 0; //Get the photos count
  var result = {};

  async.parallel([
  function(callback) {
     Employee.count({},function countEmployee(err,count){
      if(err) {
        return callback(err, null);
      }
      e_count = count;
      callback();
     });
  },
  function(callback) {
    Address.count({},function countAddress(err,count){
      if(err) {
        return callback(err, null);
      }
      a_count = count;
      callback();
     });
  },
  function(callback) {
     Family.count({},function countFamily(err,count){
      if(err) {
        return callback(err, null);
      }
      f_count = count;
      callback();
     });
  },
  function(callback) {
     Compensation.count({},function countCompensation(err,count){
      if(err) {
        return callback(err, null);
      }
      c_count = count;
      callback();
     });
  },
  function(callback) {
     Health.count({},function countHealth(err,count){
      if(err) {
        return callback(err, null);
      }
      h_count = count;
      callback();
     });
  },
  function(callback) {
    //Photo
    Photo.count({},function countPhoto(err,count){
      if(err) {
        return callback(err, null);
      }
      p_count = count;
      callback();
     });
  }
  ], function(err) {
   if (err) {
    console.log('isDBSet: Error occured with async.parallel');
    sendJSONResponse(res, 500, {
        message: 'async.parallel error while isDBSet'
    });
    return;
   }
  result['e_count'] = e_count;
  result['a_count'] = a_count;
  result['c_count'] = c_count;
  result['f_count'] = f_count;
  result['h_count'] = h_count;
  result['p_count'] = p_count;
  result['count'] = count;
  if ( (e_count == count) && (a_count == count) && (c_count == count) &&
    (f_count == count) && (h_count == count) && (p_count == count)) {  
    res.send({'db_status': 200, 'message': 'Database is set' , 'result': result});
  } else {
    res.send({'db_status': 201, 'message': 'Database generation is still in progress','result': result });
  }
  }); //End of async.parallel()

  return;
};
