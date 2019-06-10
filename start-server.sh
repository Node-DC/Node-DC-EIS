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

#Provide the path to Node directory before starting the run
NODE_PATH=/opt/local/node-v6.10.0-linux-x64/bin

CPU_COUNT=$1

if [ "$#" == 2 ]; then
  NODE_PATH=$1
  CPU_COUNT=$2
fi

export PATH=$NODE_PATH:$PATH

IMAGE_NAME=""  #if not set, workload uses image.jpeg by default

if ! type npm  ||  ! type node ; then
	echo "Node or npm binary not found. Please set the PATH and try again"
	exit 1
fi

CPU_COUNT=$1
if [ -n "${CPU_COUNT}" ]; then
  export CPU_COUNT=${CPU_COUNT}
fi

if [ -n "${IMAGE_NAME}" ]; then
  export IMAGE_NAME=${IMAGE_NAME}
fi

echo "Hello from start server script"

# Set proxy if needed
# export http_proxy
# export https_proxy

if [ -f server-input.txt ]; then
  port=`grep db_port server-input.txt | cut -d':' -f2`
  if [ "x$port" == "x" ]; then
    echo "Mongodb port is not set. Instance will not be started"
    exit 1
  fi
  mongod --dbpath ./mongodb.template --port $port > ./mongodb.template/mongodb.$port.log &

  time_start=$(date +%s)
  while true
    do
      if grep "waiting for connections on port $port" ./mongodb.template/mongodb.$port.log ; then
        break;
      fi
      time_end=$(date +%s)
      time_diff=$(echo "$time_end - $time_start" | bc)
      if [ $time_diff -gt 20 ]; then
        echo "MongoDB did not start in time out interval"
        exit 1
      fi
    done
else
  echo "Expected - mongodb to be running at the port specified in server config"
  exit 1
fi
echo "Installing npm modules"
npm install
echo "Starting server"
node server-cluster.js &
sleep 5
exit 0
