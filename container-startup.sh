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

export SERVER_IP=$1
export SERVER_PORT=$2
export DB_SERVER_IP=$3
export DB_PORT=$4
export DB_NAME=$5
export CPU_COUNT=$6

if [ "x$SERVER_IP" = "x" ] || [ "x$SERVER_PORT" = "x" ] || [ "x$DB_SERVER_IP" = "x" ] || [ "x$DB_PORT" = "x" ] || [ "x$DB_NAME" = "x" ] || [ "x$CPU_COUNT" = "x" ] ; then
    echo "Argument(s) passed to container-startup script missing. Aborting the run"
    exit 1
fi
#requires mongodb to be running at the specified DB_SERVER_IP and DB_PORT
DB_URL=mongodb://${DB_SERVER_IP}:$DB_PORT/$DB_NAME
echo "$SERVER_PORT:`date +"%T.%3N"`"

mkdir ./mongodb$DB_PORT.template
mongod --bind_ip $SERVER_IP --dbpath ./mongodb$DB_PORT.template --port $DB_PORT  > /dev/null & 

sleep 5

if [ $CPU_COUNT -eq 0 ]; then
	docker run -itd -p $SERVER_PORT:9000 --net node-dc-net -e DB_URL=$DB_URL --name cnodemongo-$SERVER_PORT inode-npm
else 
	docker run -itd -p $SERVER_PORT:9000 --net node-dc-net -e DB_URL=$DB_URL -e CPU_COUNT=$CPU_COUNT --name cnodemongo-$SERVER_PORT inode-npm
fi

while true
do
  curl --noproxy ${SERVER_IP} --silent http://${SERVER_IP}:$SERVER_PORT/
  ret_value=$?
  if [ $ret_value == 0 ]; then
    echo "$SERVER_PORT:`date +"%T.%3N"`"
    break
  fi
done
