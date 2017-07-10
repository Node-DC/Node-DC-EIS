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
module.exports = {
  'cpu_count' : process.env.CPU_COUNT || 0,
  'db_url': process.env.DB_URL || 'mongodb://127.0.0.1:27017/node-els-db',
  'app_host' : process.env.SERVER_IP ,
  'app_port' : process.env.SERVER_PORT || 9000,
  'app_mode' : 'Cluster',
  'count': 10000, 
  'zipcount': 5,
  'lastnamecount': 5,
  'image_name' : process.env.IMAGE_NAME || 'image.jpeg',
  'mongodb_timeout' : 30000,
  'enable_caching' : false,
  'cache_max_size' : 100000,
  'cache_expiration' : 1200000
};
