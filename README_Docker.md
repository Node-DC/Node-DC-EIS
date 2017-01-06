Docker installation on Ubuntu 16.04
-----------------------------------
(Please refer to https://docs.docker.com/engine/installation/linux/ubuntulinux/ for up-to-date instructions)
$sudo apt-get update
$sudo apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D
$sudo apt-add-repository 'deb https://apt.dockerproject.org/repo ubuntu-xenial main'
$sudo apt-get update
$apt-cache policy docker-engine
$sudo apt-get install -y docker-engine
Docker should now be installed and ready to use

Create a common network for the containers
------------------------------------------
$docker network create node-dc-net

Building and running the mongo container
--------------------------------------
#Build a mongo image
$docker build -t imongo -f Dockerfile-mongo .
(If using proxy, please use
$docker build -t imongo -f Dockerfile-mongo --build-arg http_proxy=http://proxy_addr:port . )

#Now create the mongo container in the background
$docker run -it -d -p 27017 --net node-dc-net --name cmongo imongo

Building and running the node container (example, cluster)
---------------------------------------------------------
#Build a node image
$docker build -t inode -f Dockerfile-node-cluster .
(If using proxy, please use
$docker build -t inode -f Dockerfile-node-cluster --build-arg http_proxy=http://proxy_addr:port . )

#Now create the node-cluster container in the background
$docker run -it -d -p 9000-9090:9000-9090 --net node-dc-net --name cnode inode

#Execute the node-cluster container bash
$docker exec -it cnode bash
Go to Node-DC-EIS-cluster/config/configuration.js and change db_url from 127.0.0.1 to mongo container's IP
You can retrieve the mongo container's IP by doing "$docker network inspect node-dc-net
Look for cmongo's IPv4 address and put the same in your config file

#Now start the server in cluster mode when still within the container
$cd /home/nodeuser/Node-DC-EIS-cluster 
$npm install (Please use the proxy accordingly)
$node server-cluster.js (You can still run it in monolithic mode by changing the cpu_count to 1 in the config/configuration.js file)
#Server should now be running

For microservices, the instructions remain exactly the same as cluster, except for corresponding file and name changes.

Building and running the client container
-----------------------------------------

#Build the container image
$docker build -t iclient -f Dockerfile-client .
(If using proxy, please use
$docker build -t iclient -f Dockerfile-client --build-arg http_proxy=http://proxy_addr:port . )

#Now create the client container in the background
$docker run -it -d -p 80 --net node-dc-net --name cclient iclient

#Execute the client container bash
$docker exec -it cclient bash
Go to Node-DC-EIS-client/config.js and change server_ipaddress to node container's IP 
You can retrieve the node container's IP similar to mongo's. Simply type $docker network inspect node-dc-net
Look for cnode's IPv4 address and put the same in your config file

#You are now set to run the client
$python runspec.py -f config.json 

Please note that these are docker specific instructions and you are free to play with the configuration parameters within the containers just as you would on your host.
