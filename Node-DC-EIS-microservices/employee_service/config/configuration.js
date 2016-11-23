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

module.exports = {
  'db_url': process.env.MONGO_SERVER_URL || 'mongodb://127.0.0.1:27017/node-els-db',
  'employee_svc_port'             : process.env.EMPLOYEE_SERVER_PORT || 3000,
  'address_svc'                   : 'http://localhost:3001/addresses',
  'address_svc_byzipcode'         : 'http://localhost:3001/addresses/zipcode',
  'address_svc_byemployeeid'      : 'http://localhost:3001/addresses/:employee_id',
  'family_svc'                    : 'http://localhost:3002/families',
  'family_svc_byemployeeid'       : 'http://localhost:3002/families/:employee_id',
  'health_svc'                    : 'http://localhost:3003/health',
  'health_svc_byemployeeid'       : 'http://localhost:3003/health/:employee_id',
  'compensation_svc'              : 'http://localhost:3004/compensations',
  'compensation_svc_byemployeeid' : 'http://localhost:3004/compensations/:employee_id',
  'photo_svc'                     : 'http://localhost:3005/photos',
  'photo_svc_byemployeeid'        : 'http://localhost:3005/photos/:employee_id',
  'db_loader_svc_ipaddress'       : 'http://localhost:4001/loaddb',
  'checkdb_svc_ipaddress'         : 'http://localhost:4001/checkdb',
  'app_mode' : 'Micro-services',
  'mongodb_timeout' : 30000
};
