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

const Employee = require('../models/employee');
const Address = require('../models/address');
const Compensation = require('../models/compensation');
const Family = require('../models/family');
const Health = require('../models/health');
const Photo = require('../models/photo');
const appConfig = require('../config/configuration');
const fs = require('fs');
const readline = require('readline');

let fnames = [];
let lnames = [];
let addresses = [];

const states = [ 'AL', 'OR', 'CA', 'WA', 'NJ', 'TN', 'DE', 'FL', 'TX', 'ID' ];
const street_suffixes = [ 'Way', 'Drive', 'Rd', 'Lane', 'Court', 'Street', 'Ave', 'Plaza' ];
const directions = [ 'E', 'W', 'N', 'S', 'SE', 'SW', 'NE', 'NW' ];

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
    //output: process.stdout,
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
    //output: process.stdout,
    console: false
  });
 
  const lines = [];
  for await (const line of rd) {
    lines.push(line);
  }

  await fileStream.close();
  return lines;
}

async function read_in_firstnames() {
  console.log('Constructing list of first names');
  console.log('------------------------');

  const fileStream = fs.createReadStream('./data/people.fname');
  const rd = readline.createInterface({
    input: fileStream,
    //output: process.stdout,
    console: false
  });
 
  const lines = [];
  for await (const line of rd) {
    lines.push(line);
  }

  await fileStream.close();
  return lines;
}

async function readTextInputs() {
  try {
    fnames= await read_in_firstnames();
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
exports.cleanUpDB = async function cleanUpDB(req, res) {
  try {
    const e = Employee.deleteMany().exec();
    const a = Address.deleteMany().exec();
    const f = Family.deleteMany().exec();
    const c = Compensation.deleteMany().exec();
    const h = Health.deleteMany().exec();
    const p = Photo.deleteMany().exec();

    const results = await Promise.all([
      e, a, f, c, h, p
    ]);
    sendJSONResponse(res, 200, results);
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

  //Cleanup the database
  async function main(count) {
    Employee.deleteMany().exec();
    Address.deleteMany().exec();
    Family.deleteMany().exec();
    Compensation.deleteMany().exec();
    Health.deleteMany().exec();
    Photo.deleteMany().exec();

    const zipCodeArr = generateZipCodes(zipcount);
    await readTextInputs(); // Read list of first, last and street names
    
    var saved_record=0;
    var last_marital_status = true;
    var last_shortterm_disability_plan = false;
    var last_longterm_disability_plan = true;
    var last_paid_family_leave_status = true;

    let e_count=0;
    let a_count=0;
    let c_count=0;
    let f_count=0;
    let h_count = 0;
    let p_count = 0;
    let zipcode_current_index=0;
    let lastname_current_index=0;
    let street_current_index=0;

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

    async function createRecords(count) {

      for (var ii=0; ii < count; ii++) { // Create count# of employee, etc records 

        try {
          // Employee record
          const phone = Math.floor(Math.random() * (9999999999 - 1111111111 + 1)) + 1111111111;
          const first_name = fnames[Math.floor(Math.random() * (fnames.length))];
          if (lastname_current_index >= lastnamecount) {
            lastname_current_index=0;
          }
          const last_name = lnames[lastname_current_index]; 
          lastname_current_index++;

          const email = first_name + ii.toString() + '@example.com';
          const employee = new Employee();
          employee.first_name = first_name;
          employee.last_name = last_name;
          employee.phone = phone;
          employee.email = email;
          await employee.save();
          e_count++;

          // Address record
          if (street_current_index >= addresses.length) {
            street_current_index=0;
          }

          const street = addresses[street_current_index];
          street_current_index++;

          const state = states[Math.floor(Math.random() * (states.length))];
          if (zipcode_current_index >= zipCodeArr.length) {
            zipcode_current_index=0;
          }

          const  zipcode = zipCodeArr[zipcode_current_index]; 
          zipcode_current_index++;

          const address = new Address();
          address.street = street;
          address.zipcode = zipcode;
          address.state = state;
          address.country = 'USA';
          address._employee = employee._id;
          address.employee = employee;
          await address.save();
          a_count++;

          // Compensation record
          const compensation = new Compensation();
          compensation.pay = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
          compensation.stock = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
          compensation._employee = employee._id;
          compensation.employee = employee;
          await compensation.save();
          c_count++;

          // Family record
          const family = new Family();
          last_marital_status = !last_marital_status;
          family.marital_status = last_marital_status;
          family.childrens = Math.floor(Math.random() * (5 - 3 + 1)) + 1;
          family._employee = employee._id;
          family.employee = employee;
          await family.save();
          f_count++;

          // Health record
          last_shortterm_disability_plan = !last_shortterm_disability_plan;
          last_longterm_disability_plan = !last_longterm_disability_plan;
          last_paid_family_leave_status = !last_paid_family_leave_status;

          const health = new Health();
          health.shortterm_disability_plan = last_shortterm_disability_plan;
          health.longterm_disability_plan = last_longterm_disability_plan;
          health.paid_family_leave = last_paid_family_leave_status;
          health._employee = employee._id;
          health.employee = employee;
          await health.save();
          h_count++;

          // Photo identification record
          let imageStr = null;
           var fileContents;
          fileContents = fs.readFileSync(__dirname + '/../data/image.jpeg');
          imageStr = fileContents.toString('base64');
          const photo = new Photo();
          photo.image = imageStr;
          photo._employee = employee._id;
          photo.employee = employee;
          await photo.save();
          p_count++;
          if ( (e_count == count) && (a_count == count) && (c_count == count) &&
            (f_count == count) && (h_count == count) && (p_count == count)) {
            res.send({'message' : count + ' records are populated'});
            return;
          }
          
        } catch (error) {
          console.error('Error saving record:', error.message);
          sendJSONResponse(res, 500, {
             message: 'Internal server error initDB function'
          });
          return;
        }
      }
    };
    createRecords(count);
  }

  main(count);
};

exports.isDBSet = function isDBSet(req, res) {
  //Check if Employees.count(), Addresses.count(), etc. matches as expected
  var count = req.query.count;
  var e_count = 0; //Get the employee count using async/await pattern
  var a_count = 0; //Get the addresses count
  var c_count = 0; //Get the compensations count
  var f_count = 0; //Get the families count
  var h_count = 0; //Get the health count
  var p_count = 0; //Get the photos count
  var result = {};
  
  async function getRecordCountInParallel() {
    const ecount = await Employee.countDocuments({});
    const acount = await Address.countDocuments({});
    const fcount = await Family.countDocuments({});
    const ccount = await Compensation.countDocuments({});
    const hcount = await Health.countDocuments({});
    const pcount = await Photo.countDocuments({});

    try {
      result['e_count'] = ecount;
      result['a_count'] = acount;
      result['c_count'] = ccount;
      result['f_count'] = fcount;
      result['h_count'] = hcount;
      result['p_count'] = pcount;
      result['count'] = count;
      if ( (ecount == count) && (acount == count) && 
        (ccount == count) && (fcount == count) && 
        (hcount == count) && (pcount == count)) {  
        res.send({'db_status': 200, 'message': 'Database is set' , 'result': result});
      } else {
        res.send({'db_status': 201, 'message': 'Database generation is still in progress','result': result });
      }
    } catch (error) {
      console.log('isDBSet: Error occured in getRecordCountInParallel:', error.message); 
      sendJSONResponse(res, 500, {
        message: 'Error in getRecordCountInParallel function'
      });
      return;
    }
    return;
  }

  getRecordCountInParallel();

};
