Docker installation on Ubuntu 16.04
-----------------------------------
(Please refer to https://docs.docker.com/engine/installation/linux/ubuntulinux/ for up-to-date instructions)

```
$ sudo apt-get update
$ sudo apt-key adv --keyserver hkp://p80.pool.sks-keyservers.net:80 --recv-keys 58118E89F3A912897C070ADBF76221572C52609D
$ sudo apt-add-repository 'deb https://apt.dockerproject.org/repo ubuntu-xenial main'
$ sudo apt-get update
$ apt-cache policy docker-engine
$ sudo apt-get install -y docker-engine
```
Docker should now be installed and ready to use.

For proxy users, please also make the following change https://docs.docker.com/engine/admin/systemd/#http-proxy (HTTP proxy section).

Docker image storage options
----------------------------
When you have a lot of images/containers running on your system, it easily eats up a lot of your disk space. As a solution to this, docker offers an option to store your images in a location of your choice. Please read the `--graph` or `-g` option from the official documentation to implement the same
https://docs.docker.com/v1.11/engine/reference/commandline/daemon/#daemon-configuration-file

Create a common network for the containers
------------------------------------------
```
$ docker network create node-dc-net
```

Building and running the mongo container
--------------------------------------
1. Build a mongo image
```
$ docker build -t imongo -f Dockerfile-mongo .
```
_If using proxy, please add a build-arg for the http_proxy: `$ docker build -t imongo -f Dockerfile-mongo --build-arg http_proxy=http://proxy_addr:port .`_

2. Create the mongo container in the background
```
$ docker run -it -d -p 27017:27017 --net node-dc-net --name cmongo imongo
```

You can also alternatively choose to deploy mongodb database on bare-metal, directly on your host, but be sure to provide the right mongodb address to your node server configuration. For example:

```
$ mkdir mongodb.$DB_PORT
$ mongod --quiet --dbpath ./mongodb.27017 --bind_ip cmongo --port 27017 > /dev/null &
```

Providing the dbpath here is purely optional, it gives you a way to gracefully shutdown the mongodb instance using this path when you need to end the instances.


Building and running the node container (example, cluster)
--------------------------------------
1. Build a node image
```
$ docker build -t inode -f Dockerfile-node-cluster .
```
_If using proxy, please add a build-arg for the http_proxy: `$ docker build -t inode -f Dockerfile-node-cluster --build-arg http_proxy=http://proxy_addr:port .`_

2. Run the node container
```
$ docker run -itd -p $NODE_SERVER_PORT:9000 --net node-dc-net -e CPU_COUNT=${cpu_count} -e DB_URL=mongodb://${db_ip}:$DB_PORT/node-dc-eis-db-$NODE_SERVER_PORT --name cnodemongo-$NODE_SERVER_PORT inode
```
* NODE_SERVER_PORT and DB_PORT are any available ports for the node server and mongo database that you choose to publish respectively. Be sure to set these values in your environment in your preferred way (a script or export commands).
* The environment variables, CPU_COUNT and DB_URL are passed as parameters here, and you are free to configure it to the mode you want. The default CPU_COUNT is set to 0 for monolithic mode, and DB_URL is set to the localhost database in Node-DC-EIS-cluster/config/configuration.js
* NODE_SERVER_PORT:9000 maps the NODE_SERVER_PORT of your container to 9000 on localhost making the container accessible to host for communication


If you were to hard code the above variables, it might looks something like:
```
$ docker run -itd -p 9000:9000 --net node-dc-net -e CPU_COUNT=0 -e DB_URL=mongodb://cmongo:27017/node-dc-eis-db-9000 --name cnodemongo-9000 inode

```

Alternately, you could also pin the containers to specific cores you want. As an example,

```
$ docker run -itd --cpuset-cpus 0,1,2,3 -p 9000:9000 --net node-dc-net -e DB_URL=mongodb://cmongo:27017/node-dc-eis-db-9000 --name cnodemongo-9000 inode
```

3. Check your work
Execute the node-cluster container bash to check that things are working properly.
```
$ docker exec -it cnodemongo-9000 bash
```
You're now inside the node server container. For simple sanity checks, do a `ps -aux | grep node` and see that the number of node servers are indeed the same as you set.

```
$ exit
```

Check for your node-database connection. It's a good idea to ensure that you're able to reach the database through your container

```
$curl --noproxy ${db_ip} --silent http://${db_ip}:$NODE_SERVER_PORT/
```
Should return OK

You can also use the db host name to perform this check: 
```
$ curl --noproxy cmongo --silent http://cmongo:27017/
```


Building and running the node container (microservices mode - skip if you did cluster mode)
------------------------------------------------------------

Build a node-microservice image
``` Bash
$ docker build -t inodemicroservice -f Dockerfile-node-microservices .
```

If using proxy, please use
```
$ docker build -t inodemicroservice -f Dockerfile-node-microservices --build-arg http_proxy=http://proxy_addr:port .
```

Now create the node-microservice container in the background
```
$ docker run -it -d -p 3000 --net node-dc-net --name cnodemicroservice inodemicroservice
```

Execute the node-microservice container bash for each of the services
```
$ docker exec -it cnodemicroservice bash
```
Also change the IPs for other services from localhost to node container's IP within the config file

Now, spawn a microservice container for each other service and reflect the change in mongo IP
```
$ docker exec -it cnodemicroservice bash
```
Repeat the container creation for the rest of the services
`family_service`, `health_service`, `comp_service`, `photo_service`, `db_loader_service`.

Building and running the client container
-----------------------------------------
Build the container image
```Bash
$ docker build -t iclient -f Dockerfile-client .
```

If using proxy, please use
```Bash
$ docker build -t iclient -f Dockerfile-client --build-arg http_proxy=http://proxy_addr:port .
```

If during the build, you get an error at "pip install" its likely a proxy setting issue. Please refer to the Dockerfile comment for the right syntax

Now create the client container in the background
```Bash
$ docker run -it -d -p 80 --net node-dc-net --name cclient iclient
```

Execute the client container bash

```Bash
$ docker exec -it cclient bash
```
Go to `Node-DC-EIS-client/config.json` and change `server_ipaddress` to node container's IP. You can retrieve the node container's IP similar to mongo's by typing `$ docker network inspect node-dc-net` and looking for `cnodemongo`'s IPv4 address and put the same in your config file (Note that for microservices, it is better to keep the record count to 9000 or less to get more stable scores).

You are now set to run the client from inside the docker client container:
```
$ cd Node-DC-EIS-client && python runspec.py -f config.json
```

The results of your benchmark will be available in the cclient container at `~/Node-DC-EIS-client/results_node_DC_EIS`.

Please note that these are docker specific instructions and you are free to play with the configuration parameters within the containers just as you would on your host.


How to shut everything off
-----------------------------------------
When you're done, you can destroy everything with
```
$ docker rm cmongo -f
$ docker rm cnodemongo-9000 -f
$ docker rm cclient -f
```

Known facts about the configurations
--------------------------------------
1. We have seen that hosting mongodb on a different host than the node server shows a dip in the cpu-utilization as the workload is memory-bound. Whether hosted on bare-metal or in a container, its preferred to keep the database on the same host as the node server.
2. We have seen a significant performance improvement using overlay2 as the storage driver for docker instead of aufs. Please keep this in mind while measuring the performance of the workload inside container("$docker info" provides you the information on the default storage driver in your system. Please refer to "https://docs.docker.com/engine/userguide/storagedriver/overlayfs-driver/#configure-docker-with-the-overlay-or-overlay2-storage-driver" to change your driver to overlay2.
