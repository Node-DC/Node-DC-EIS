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

var mongoose = require('mongoose');

var EmployeeSchema = new mongoose.Schema({
  first_name: {
    type: String,
    trim: true
  },
  last_name: {
    type: String,
    trim: true,
    index: true
  },
  phone: {
    type : Number
  },
  email: {
    type : String
  },
  role: {
    type: String,
    default: 'regular'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  address: {
   street: {
    type: String,
    trim: true
   },
   state: {
    type: String,
    trim: true
   },
   country: {
    type: String,
    trim: true
   },
   zipcode: {
    type: Number,
    trim: true,
    index: true
   }
  },
  compensation : {
   pay: {
    type: Number
   },
   stock: {
    type: Number
   }
  },
  family : {
    marital_status: {
     type: Boolean
    },
   childrens: {
    type: Number
   }
  },
  health : {
   shortterm_disability_plan: {
    type: Boolean
   },
   longterm_disability_plan: {
    type: Boolean
   },
   paid_family_leave: {
    type: Boolean
   }
  },
  photo : {
    image: {
    type: String
   }
  }  
});

module.exports = mongoose.model('Employee', EmployeeSchema);
