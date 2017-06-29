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

For proxy users, please also make the following change
https://docs.docker.com/engine/admin/systemd/#http-proxy (HTTP proxy section)
Create a common network for the containers

Docker image storage options
----------------------------
When you have a lot of images/containers running on your system, it easily eats up a lot of your disk space. As a solution to this, docker offers an option to store your images in a location of your choice. Please read the --graph or -g option from the official documentation to implement the same
https://docs.docker.com/v1.11/engine/reference/commandline/daemon/#daemon-configuration-file

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

You can also choose to deploy mongodb database on bare-metal, but be sure to provide the right mongodb address to your node server configuration
An alternate way to start mongodb on your host would be to simply run
$mkdir mongodb.$DB_PORT
$mongod --quiet --dbpath ./mongodb.$DB_PORT --bind_ip ${db_ip} --port $DB_PORT > /dev/null &
where DB_PORT is the database port that you choose for this mongodb instance( default being 27017) and mongodb.$DB_PORT is the database directory path for this instance
While providing the dbpath is purely optional, it gives you a way to gracefully shutdown the mongodb instance using this path when you need to end the instances

Building and running the node container (example, cluster)
---------------------------------------------------------
#Build a node image
$docker build -t inode -f Dockerfile-node-cluster .
(If using proxy, please use
$docker build -t inode -f Dockerfile-node-cluster --build-arg http_proxy=http://proxy_addr:port . )

$docker run -itd -p $NODE_SERVER_PORT:9000 --net node-dc-net -e CPU_COUNT=${cpu_count} -e DB_URL=mongodb://${db_ip}:$DB_PORT/node-dc-eis-db-$NODE_SERVER_PORT --name cnodemongo-$NODE_SERVER_PORT inode
where NODE_SERVER_PORT and DB_PORT are any available ports for the node server and mongo database that you choose to publish respectively. Be sure to set these values in your environment in your preferred way(a script or export commands)
Note the environment variables, CPU_COUNT and DB_URL passed as parameters here, and you are free to configure it to the mode you want. The default CPU_COUNT is set to 0 for monolithic mode, and DB_URL is set to the localhost database in Node-DC-EIS-cluster/config/configuration.js
-p NODE_SERVER_PORT:9000 here maps the NODE_SERVER_PORT of your container to 9000 on localhost making the container accessible to host for communication

Alternately, you could also pin the containers to specific cores you want. As an example,
$docker run -itd --cpuset-cpus 0,1,2,3 -p $NODE_SERVER_PORT:9000 --net node-dc-net -e DB_URL=mongodb://${db_ip}:$DB_PORT/node-dc-eis-db-$NODE_SERVER_PORT --name cnodemongo-$NODE_SERVER_PORT inode

#Execute the node-cluster container bash
$docker exec -it cnode bash
You're now inside the node server container
For simple sanity checks, do a "ps -aux | grep node" and see that the number of node servers are indeed the same as you set
$exit

#Check for your node-database connection
It's a good idea to ensure that you're able to reach the database through your container
$curl --noproxy ${db_ip} --silent http://${db_ip}:$NODE_SERVER_PORT/
Should return OK

Building and running the node container (microservices mode)
------------------------------------------------------------

#Build a node-microservice image
$docker build -t inodemicroservice -f Dockerfile-node-microservices . 
(If using proxy, please use $docker build -t inodemicroservice -f Dockerfile-node-microservices --build-arg http_proxy=http://proxy_addr:port . )

#Now create the node-microservice container in the background
$docker run -it -d -p 3000 --net node-dc-net --name cnodemicroservice inodemicroservice

#Execute the node-microservice container bash for each of the services
$docker exec -it cnodemicroservice bash 
Also change the IPs for other services from localhost to node container's IP within the config file

#Now, spawn a microservice container for each other service and reflect the change in mongo IP
$docker exec -it cnodemicroservice bash

#Repeat the container creation for the rest of the services 
family_service, health_service, comp_service,photo_service,db_loader_service

Building and running the client container
-----------------------------------------

#Build the container image
$docker build -t iclient -f Dockerfile-client .
(If using proxy, please use
$docker build -t iclient -f Dockerfile-client --build-arg http_proxy=http://proxy_addr:port . )
If during the build, you get an error at "pip install" its likely a proxy setting issue. Please refer to the Dockerfile comment for the right syntax

#Now create the client container in the background
$docker run -it -d -p 80 --net node-dc-net --name cclient iclient

#Execute the client container bash
$docker exec -it cclient bash
Go to Node-DC-EIS-client/config.js and change server_ipaddress to node container's IP 
You can retrieve the node container's IP similar to mongo's. Simply type $docker network inspect node-dc-net
Look for cnode's IPv4 address and put the same in your config file
(Note that for microservices, it is better to keep the record count to 9000 or less to get more stable scores)

#You are now set to run the client
$python runspec.py -f config.json 

Please note that these are docker specific instructions and you are free to play with the configuration parameters within the containers just as you would on your host.

Known facts about the configurations
--------------------------------------
1. We have seen that hosting mongodb on a different host than the node server shows a dip in the cpu-utilization as the workload is memory-bound. Whether hosted on bare-metal or in a container, its preferred to keep the database on the same host as the node server.
2. We have seen a significant performance improvement using overlay2 as the storage driver for docker instead of aufs. Please keep this in mind while measuring the performance of the workload inside container("$docker info" provides you the information on the default storage driver in your system. Please refer to "https://docs.docker.com/engine/userguide/storagedriver/overlayfs-driver/#configure-docker-with-the-overlay-or-overlay2-storage-driver" to change your driver to overlay2.
