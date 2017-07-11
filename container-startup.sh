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

SERVER_IP=$1
SERVER_PORT=$2
DB_SERVER_IP=$3
DB_PORT=$4
DB_NAME=$5
CPU_COUNT=$6
IMAGE_NAME=""  #if not set, workload uses image.jpeg by default

###################################################################################
# Check input arguments
###################################################################################
if [ ! -n "$SERVER_IP" ] || [ ! -n "$SERVER_PORT" ] || [ ! -n "$DB_SERVER_IP" ] || [ ! -n "$DB_PORT" ] || [ ! "$DB_NAME" ] || [ ! -n "$CPU_COUNT" ] ; then
    echo "Argument(s) passed to container-startup script missing. Aborting the run"
    exit 1
fi
###################################################################################
# Note: Requires mongodb to be running at the specified DB_SERVER_IP and DB_PORT ##
DB_URL=mongodb://${DB_SERVER_IP}:$DB_PORT/$DB_NAME
echo "$SERVER_PORT:`date +"%T.%3N"`"

mkdir ./mongodb$DB_PORT.template
mongod --bind_ip $SERVER_IP --dbpath ./mongodb$DB_PORT.template --port $DB_PORT  > /dev/null & 
sleep 5

###################################################################################
# Build list of docker aruments
###################################################################################
DOCKER_ARGS=" -p ${SERVER_PORT}:9000 --name cnodemongo-${SERVER_PORT} "

if [ -n "${DB_URL}" ]; then
  DOCKER_ARGS="$DOCKER_ARGS -e DB_URL=${DB_URL}"
fi

if [ -n "${CPU_COUNT}" ] && [ ${CPU_COUNT} -ne 0 ]; then
  DOCKER_ARGS="$DOCKER_ARGS -e CPU_COUNT=${CPU_COUNT}"
fi

if [ -n "${IMAGE_NAME}" ]; then
  DOCKER_ARGS="$DOCKER_ARGS -e IMAGE_NAME=\"${IMAGE_NAME}\""
fi

###################################################################################
# Start the container
###################################################################################
echo "`date`:docker run -itd ${DOCKER_ARGS} inode-npm"
docker run -itd ${DOCKER_ARGS} inode-npm

###################################################################################
# Check if the node application server is up and responding
###################################################################################
while true
do
  curl --noproxy ${SERVER_IP} --silent http://${SERVER_IP}:$SERVER_PORT/
  ret_value=$?
  if [ $ret_value == 0 ]; then
    echo "$SERVER_PORT:`date +"%T.%3N"`"
    break
  fi
done

