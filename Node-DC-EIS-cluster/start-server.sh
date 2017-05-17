#!/bin/bash
#provide the path to Node dircetory before starting the run
#NODE_PATH=
if [ "x$NODE_PATH" == "x" ]; then
	echo "Node path is not set"
	exit 1
fi
export PATH=$NODE_PATH/bin:$PATH
echo "Hello from start server script"
#set proxy if it's not been set. 
if [ -f server-input.txt ]; then
	port=`grep db_port server-input.txt | cut -d':' -f2`
	if [ "x$port" == "x" ]; then
		echo "Mongodb port is not set. Instance will not be started"
		exit 1
	fi
	mongod --dbpath ./mongodb.template --port $port > /dev/null &
else
	echo "Expected - mongodb to be running at the port specified in server config"
fi
echo "Installing npm modules"
npm install
echo "Starting server"
node server-cluster.js &
exit 0
