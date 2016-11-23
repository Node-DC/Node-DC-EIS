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
  'app_port' : process.env.PHOT_SERVER_PORT || 3005,
  'mongodb_timeout' : 30000
};
