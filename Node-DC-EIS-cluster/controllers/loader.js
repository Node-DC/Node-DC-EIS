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

async function read_in_addresses() {
  console.log('Constructing list of Addresses');
  console.log('------------------------');

  const fileStream = fs.createReadStream('./data/people.streets');
  const rd = readline.createInterface({
    input: fileStream,
    console: false
  });

  const lines = [];
  for await (const line of rd) {
      var aptnum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
      var street_dir = directions[Math.floor(Math.random() * (directions.length))];
      var street_sfx = street_suffixes[Math.floor(Math.random() * (street_suffixes.length))];
      var addr =  aptnum + ", " + street_dir + " " + line + " " + street_sfx;
      lines.push(addr);
  }

  await fileStream.close();
  return lines;
}

async function read_in_lastnames() {
  console.log('Constructing list of last names');
  console.log('------------------------');

  const fileStream = fs.createReadStream('./data/people.lname');
  const rd = readline.createInterface({
    input: fileStream,
    console: false
  });
 
  const lines = [];
  for await (const line of rd) {
    lines.push(line);
  }

  await fileStream.close();
  return lines;
};

async function read_in_firstnames() {
  console.log('Constructing list of first names');
  console.log('------------------------');

  const fileStream = fs.createReadStream('./data/people.fname');
  const rd = readline.createInterface({
    input: fileStream,
    console: false
  });
 
  const lines = [];
  for await (const line of rd) {
    lines.push(line);
  }

  await fileStream.close();
  return lines;
};

async function readTextInputs() {
  try {
    fnames = await read_in_firstnames();
    lnames = await read_in_lastnames();
    addresses = await read_in_addresses();
  } catch (error) {
    console.error("Error processing input files:", error.message);
  }
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

// Exports API functions/methods
exports.cleanUpDb = async function cleanUpDb(req, res) {
  try {
    await Employee.deleteMany().exec();
    sendJSONResponse(res, 200, {message: 'Database cleaned up.'});
  } catch (err) {
    console.log(err.message);
    sendJSONResponse(res, 400, { message: 'Error: cleanUpDB'});
  }

  return;
};

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

  async function main() {
    //Cleanup the database and local cache
    await Employee.deleteMany().exec();
    resetCache();
    var zipCodeArr = generateZipCodes(zipcount);
    await readTextInputs();
    var saved_record=0;
    var last_marital_status = true;
    var last_shortterm_disability_plan = false;
    var last_longterm_disability_plan = true;
    var last_paid_family_leave_status = true;

    var e_count=0;
    let zipcode_current_index=0;
    let lastname_current_index=0;
    let original_lname_len=lnames.length;

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

    async function createRecords(count) {
      for (var ii=0; ii < count; ii++) {
        try {
          // Employee Personal information
          let employee = new Employee();
          employee.phone = Math.floor(Math.random() * (9999999999 - 1111111111 + 1)) + 1111111111;
          const first_name = fnames[Math.floor(Math.random() * (fnames.length))];
          employee.first_name = first_name;
          employee.email = first_name + ii.toString() + '@example.com';

          if (lastname_current_index >= lnames.length) {
            lastname_current_index=0;
          }

          const lastname = lnames[lastname_current_index]; 
          lastname_current_index++;

          employee.last_name = lastname;

          // Employee Address
          const aptnum = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
          const street_dir = directions[Math.floor(Math.random() * (directions.length))];
          const street_sfx = street_suffixes[Math.floor(Math.random() * (street_suffixes.length))];
          const street = aptnum + ", " + street_dir + " " + street_sfx;
          const state = states[Math.floor(Math.random() * (states.length))];

          if (zipcode_current_index >= zipCodeArr.length) {
            zipcode_current_index=0;
          }
          const zipcode = zipCodeArr[zipcode_current_index]; 
          zipcode_current_index++;
          employee.address = {
            street : street,
            zipcode : zipcode,
            state : state,
            country : 'USA'
          }

          // Employee Compensation
          var pay = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
          var stock = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;

          employee.compensation = {
            pay : pay,
            stock : stock
          }

          // Employee Family status
          last_marital_status = !last_marital_status;
          var marital_status = last_marital_status;
          var childrens = Math.floor(Math.random() * (5 - 3 + 1)) + 1;

          employee.family = {
            marital_status : marital_status,
            childrens : childrens
          }

          // Employee health status
          last_shortterm_disability_plan = !last_shortterm_disability_plan;
          last_longterm_disability_plan = !last_longterm_disability_plan;
          last_paid_family_leave_status = !last_paid_family_leave_status;

          employee.health = {
            shortterm_disability_plan : last_shortterm_disability_plan,
            longterm_disability_plan : last_longterm_disability_plan,
            paid_family_leave : last_paid_family_leave_status
          }

          // Employee photo
          let imageStr = null;
          var fileContents;
          var image_filename = appConfig.image_name;
          fileContents = fs.readFileSync(__dirname + '/../data/' + image_filename);
          imageStr = fileContents.toString('base64');
          employee.photo ={
            image : imageStr
          }

          await employee.save();
          e_count++;
          if (e_count == count) {
            sendJSONResponse(res, 200, {message: `Database is populated with ${count} records`});
          }
        } catch (err) {
          throw new Error(err.message);
        }
      } // end of for loop
    } // end of createRecords()

    createRecords(count);
  }  // end of main()

  try {
    main(count);
  } catch (err) {
    console.log(err.message);
    sendJSONResponse(res, 500, {
      message: 'Internal server error in initDB function' });
  }
};

exports.isDBSet = async function isDBSet(req, res) {
  //Check if Employees.count(), Addresses.count(), etc. matches as expected
  const dbcount = req.query.count;
  try {
    const count = await Employee.countDocuments({});
    const result = {
      "count": count
    };
    if (count == dbcount)  {  
      res.send({'db_status': 200, 'message': 'Database is set' , 'result': result});
    } else {
      res.send({'db_status': 201, 'message': 'Database generation is still in progress','result': result });
    }
  } catch (err) {
    console.log(err.message);
    res.send({'message': 'Employee count failed'});
    return;
  }
  return;
};
