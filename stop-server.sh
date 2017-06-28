#!/bin/bash

# Copyright (c) 2016 Intel Corporation 
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

echo "Hello from stop server script"
cwd=$0
parent_dir=`dirname $cwd`

mongod --dbpath $parent_dir/mongodb.template --shutdown
if [ $? -ne 0 ]; then
  echo " Mongodb $parent_dir/mongodb.template did not shut down"
fi
server_input=$parent_dir/server-input.txt
if [ -f $server_input ]; then
    server_port=`grep server_port $server_input | cut -d ':' -f2`
    server_ip=`grep server_ip $server_input | cut -d ':' -f2`
    curl --silent --noproxy "$server_ip" http://"$server_ip":"$server_port"/stopserver > /dev/null
else
    echo "Could not find server input file.Stopping all node process for user:`whoami`"
    killall node
fi
