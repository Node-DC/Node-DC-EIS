# Objective 
The Node-DC is an open source collaboration project to develop workloads representing realistic use cases of Node.js in the data center. It started in 2016 with collaboration from the open source community, Node.js experts and companies playing important roles in Node.js’s evolution and production deployments in the data centers. 

Workloads APIs, functionalities and metrics will be used to evaluate performance of the complete software stack for Node.js, Operating Systems, containers, virtualization, network stacks as well as various data center configuration choices. These are relevant for hardware and software developers, researchers and Node.js community. One priority for this project is to update the workloads in order to keep them up with the fast moving eco-system of Node.js. 

# Current Release
Latest code has been marked stable and released as v1.1.2

# Contributing and Community   

## Contribution to individual projects: 
If you want to contribute code to a project, first you need to fork the project. Next step is to send a pull request (PR) for review to the repository. For small changes, you can implement at first step and for large changes, it is recommended to initially send the architecture and data flow, before investing significant time into the detailed implementation. The PR will be reviewed by the project team members. You need one "Looks Good To Me (LGTM)" and no objections from the project members. Once you have gained the required approval, the project maintainers will merge the PR.

## Contribution to use cases: 
We are constantly evaluating the relevant use cases. The list below includes the current status and is evolving based on the continuous feedback we are receiving from the community and major datacenter deployments for Node.js: 

  - Node-DC-EIS (Node.js - Data Center - Employee Information Services): Current release is at v1.2.0.
    
  - Node-DC-SSR (Node.js - Data Center - Server Side Rendering): Current release is at v0.8.0.

  - We are looking for community suggestions for other relevant use cases

Feedback can be sent either by creating issues or sending e-mail listed at https://github.com/Node-DC

# Node-DC-EIS (Node.js - Data Center - Employee Information Services) 
 
This is first in a series of upcoming workloads for modelling use cases of Node.js in Data Center (Node-DC). This workload is modelling various functionalities of Employee Information Services implemented in Node.js in Data Center.

# Open for contributions  
  - Feedback from community
  - Change from Mongoose to MongoDB driver
  - Enable DB caching in microservices 
  - Enable clustering of microservices 
  - Increase unique lastnames from 777 to at least 5000 or more 
  
Following changes are being considered as optional:
  - Options for alternate DB choices
  - Unit tests as part of PR acceptance criterion 
  - Changing client from Python to Node.js 
  - Workload phases ramp-up, measurement, and ramp-down to be able to set for a given time instead of #requests 
  - Node internal stats like events in the loop etc.
  - Reduce the size of output file by processing response time samples every n sec interval instead of post-processing at the end of complete run
  - Containerize the client, server and DB for easy testing and setup of the workload 

# Node-DC-EIS Architecture  
Node-DC-EIS follows a 3-tier model and consists of three components client, Node.js server and DB.

## Client 
Client controls various phases like ramp-up, measurement and ramp-down as well as issuing requests, tracks response time and errors. At the end of run, it validates the runs and post-processes the transactions log producing final metrics and graphs.

## Node.js server 
Node.js server accepts all requests from client and responds back after retrieving employee information from the DB. Node.js cluster code is architected to scale by default. 

In Node.js server configuration file "Node-DC-EIS-cluster/config/configuration.js", parameter 'cpu_count' can be used to scale to various number of CPUs. 
  - Default value is '0' which will use single CPU core or called monolithic mode.
  - With the value of '-1', it will use all available CPUs. 
  - It will use number of processes as specified by any positive number 

## DB 
Employee Information is stored in DB (current implementation using MongoDB). For each run, DB is populated based on configuration parameters set in the "Node-DC-EIS/blob/master/Node-DC-EIS-client/config.json".     

# Node-DC-EIS Metrics  
Node-DC-EIS produces two primary metrics:
  - Throughput ( n Node-DC-EIS requests / second ): It is calculated by "requests in measurement phase / measurement time" 
  - p99 Response Time: It is 99 percentile of response time. 

Report also contains detailed response time data like minimum, maximum, average, p95 and p99 (99 percentile) of response time. 
Post-processing also produces response time graph as well as other histograms like memory utilization over the run length of the workload.  

# Node-DC-EIS default and configurable options for research and testing  
Node-DC-EIS sets all parameters by default to model typical Node.js server deployment. Many important parameters have been defined in the configuration files to make it easy to be able to evaluate, test and validate wide variety of deployments. 

Most parameters can be set in the client configuration file and these are passed to Node.js server and DB. But some parameters must be set at the start of Node.js server and DB. Such parameters must be defined in configuration files for respective components. 

## Parameters in client configuration file ( Node-DC-EIS/blob/master/Node-DC-EIS-client/config.json ) :
  - "MT_interval" : "100" // Total time for measuring time requests
  - "request" : "10000",  // Total number of requests to be issued
  - "concurrency" : "200", // That many requests can be issued in parallel
  - "run_mode" : "1",  // The type of run. 1 for time-based, 2 for request-based
  - "interval" : "10", // Data collection happens every interval specified in seconds
  - "rampup_rampdown": "100", // After this many requests, execution will enter measurement phase
  - "tempfile":"temp_log", // Default name of the log file
  - "total_urls":"100", // Number of urls which will be used to issue requests 
  - "server_ipaddress":"localhost", // Server IP address
  - "server_port":"9000",
  - "root_endpoint": "/",
  - "nameurl_count":"25", // 25 % of get_ratio type of requests are nameurl_count
  - "zipurl_count":"25", // 25 % of get_ratio type of requests are zipurl_count
  - "idurl_ratio":"50" // 50 % of get_ratio type of requests are idurl_count

  - "db_params":  // Parameters below are related to DB
  - "dbrecord_count": "10000", // DB is created with this many number of employee records
  - "name_ratio":"5", // DB is created such that each last name search will find ~this many employee records  
  - "zip_ratio":"5" // DB is created such that each last zipcode search will find ~this many employee records 

  - "url_params": // Parameters set the ratio for type of requests. total below must be 100 and post and delete must be equal to maintain approximately same number of empoyee records during a run
  - "get_ratio": "90", // Out of total requests this many requests are of getID type which has sub-breakup into name, zip and id urls
  - "post_ratio":"5", // Out of total requests this many requests are of post type
  - "delete_ratio":"5" // Out of total requests this many requests are of delete type

  - "memory_params": // Parameters below helps in profiling memory usages by Node.js server
  - "memstat_interval": "1", 
  - "memlogfile": "memlog_file"

## Parameters in Node.js server configuration file "Node-DC-EIS-cluster/config/configuration.js"

  - 'cpu_count' : 0, // default 0 means monolithic mode, -1 means total number of CPUs available
  - 'enable_caching' : false, // Caching of MongoDB in Node.js
  - 'cache_max_size' : 100000,
  - 'cache_expiration' : 1200000

# Node-DC-EIS Workload Modes  

This workload has two modes 

  - Cluster mode (includes a monolithic mode when setting CPU count by cpu_count = 0 in Node.js server configuration file)

  - Microservices mode

# Content  

Node-DC-EIS workload code, which contains following directories,
Server Codebase:
  - Node-DC-EIS-cluster, and
  - Node-DC-EIS-microservices

Client driver codebase
  - Node-DC-EIS-client

Multiple instance scripts
  - multiple_instance_config.json // Contains configuration
  - run_multiple_instance.sh      // Main driver script

#### NOTE : 
If proxy needs to be set up, make sure the it has been properly set.
  - (npm config set proxy http://proxy.example.com:8080)
  - (npm config set https-proxy http://proxy.example.com:8080)

# Client Setup  

## Required Modules and Installations
Install Python   (command: sudo apt-get python)
Install Pip for Python    (command: sudo apt-get python-pip)
Install the following modules  
  - NumPy       (command: pip install numpy)
  - Matplotlib  (command: sudo apt-get install python-matplotlib)
  - requests    (command: pip install requests)
  - eventlet    (command: pip install eventlet)

## NOTE: 
Please make sure above modules are installed without any error. 
Installing pip modules may require gaining access to the local directory by calling 'sudo chown -R $USER /usr/local'.

Install any missing modules as per your system configuration.

## On Linux OS this client has been tested successfully with following versions,
  - Python - v2.7.10
  - Pip    - v1.5.4
  - NumPy  - v1.8.2
  - Matplotlib - v1.4.2
  - requests - v2.10.0
  - eventlet - v0.19.0

## Windows Client: Required Modules and Installations

Download Python from https://www.python.org/downloads/   
  - Python 2.7.12 (2.7.10 – tested ). 

Download “Windows x86 MSI installer. Once you have downloaded the Python MSI, navigate to the download location on your computer, double clicking the file and pressing Run when the dialog box pops up.
  - Follow the instructions in the dialog box
  - Once python is installed add Python to System Path Variable in the System environment variables
  - If you are behind a proxy set your proxy
  - Install pip.py from https://pip.pypa.io/en/stable/installing/ and follow the instruction for running it
  - Make sure that pip is installed and is in your path before continuing installation
  - NumPy      (command: pip install numpy)
  - Matplotlib (command: pip install matplotlib)
  - requests   (command: pip install requests)
  - eventlet   (command: pip install eventlet)

#### NOTE: 
Please make sure above modules are installed without any error. 
Install any missing modules as per your system configuration.

On Windows, there is a limit of 512 file descriptors open at a time. Because of this, the client script will crash if the concurrency setting is higher than 512.

## On Windows OS this client has been tested successfully with following versions,
  - Python - v2.7.12
  - Pip    - v1.5.4
  - NumPy  - v1.11.2
  - Matplotlib - v1.5.3
  - requests - v2.11.1
  - eventlet - v0.19.0

# Server Setup  

Install the following:
  - node.js (www.nodejs.org)
  - mongodb (https://www.mongodb.com/download-center#community)

## Server Preparation:

  - Make sure node.js and npm (node package manager) have been installed.
  - Make sure mongodb is running or start mongod server manually listening at default port (27017).

  - Windows Server Specific
    - Make Directory - C:\data\db.
    - Make Directory - C:\data\log.
    - Create/edit mongod.cfg in your MongoDB install location (for example C:\MongoDB) with the following contents:
    ```
systemLog:
  destination: file
  path: C:\data\log\mongod.log
  storage:
    dbpath: C:\data\log
    ```
    - Set up MongoDB            (command: "C:\MongoDB\bin\mongod.exe" --config "C:\MongoDB\mongod.cfg" --install)
    - Start the MongoDB service (command: net start MongoDB)

  - Linux Server Specific
    - Make Directory – ~/data/db
    - Navigate to data/db or data\db.
    - Run “mongod”, leave this terminal open to maintain the process.
    - (Optional)In a separate terminal run “mongo” to confirm database is active.

  - Both ( This may or may not be required as per your mongodb setting)
    - Set PATH pointing to node.js binary you installed.
    - Make sure npm is in your PATH.
 
### Starting server in various modes

#### NOTE: 
Each server mode starts at different default port.

Running application server in Cluster mode (default port: 9000): 
  - Change directory to cluster,
  - run “npm install” to install all dependencies (don't use sudo). 
  - Run “node server-cluster.js”

#### NOTE: 
In cluster mode user may have to increase the concurrency value in order to achieve high CPU/platform utilization.

In cluster mode you can control the number CPU's by changing the configuration file in the cluster mode. If not set, it takes the default number of CPU's (number of logical threads) available.

Running application server in microservices mode (default port: 3000):
  - run “npm install” to install all dependencies for each service directory (don't use sudo), and start each service separately
  - To auto run npm install run the script 
    - python npm_install_all.py
    - Start each service in separate terminal window.

   $ cd <topdir>/Node-DC-EIS-microservices/employee_service;   
   $ node server.js (default port: 3000)

   $ cd <topdir>/Node-DC-EIS-microservices/address_service;
   $ node server.js (default port: 3001)

   $ cd <topdir>/Node-DC-EIS-microservices/family_service;
   $ node server.js (default port: 3002)

   $ cd <topdir>/Node-DC-EIS-microservices/health_service;
   $ node server.js (default port: 3003)

   $ cd <topdir>/Node-DC-EIS-microservices/comp_service;
   $ node server.js (default port: 3004)

   $ cd <topdir>/Node-DC-EIS-microservices/photo_service;
   $ node server.js (default port: 3005)

   $ cd <topdir>/Node-DC-EIS-microservices/db_loader_service;
   $ node server.js (default port: 4001)

#### NOTE: 

  1. For microservices mode, it's possible to deploy each service on different machine (seperate IP address). Please take a look at the following file for any such changes,
  2. In this mode you (User) may have to increase the concurrency value in order to achive platform utilisation.
       microservices/employee_service/config/configuration.js file.
     In this mode employee_service acts as a main receiver and delegator for all incoming requests.
     This mode works but if there are any questions, please reach out to us.

# Testing:

Make sure you have access to the Node-DC-EIS-client, which contains client 
driver program and other supporting files.

- config.json: 
  The input configuration file to set default parameters such as, 
  - Client parameters,
    - total time interval for each run/ numbers of total_requests to issue,
    - time interval for data collection
    - number of concurrent requests,
    - total number of dynamic urls to use,

  - Server parameters,
    - server ipaddress and port number. This can be changed either from the command line or in the config.json file.

  - Database parameters,
    - Total number of records to populate, etc.

  - Caching parameters,
    - Enable or disable cache for the database
    - Tweak cache size, and cache expiration timeframes.

- runspec.py: 
  A top-level runspec script; the main script to launch workload.
  This script initiates, track requests, generates log file, and output graphs.
  Use config.json for setting parameters. This needs to be use -f option. 
  User can override all parameters from the command line as well..
  - Invoke "runspec.py -h" for detail help

- node-dc-eis-testurls.py: 
  The workload driver file which sends actual requests using python's requests 
  module to the server.

- summary_file_sample.txt: 
  Sample summary file that is generated after a run.

#### NOTE
The validation report gives details of how many record were loaded in the database and how many records are present in the database after the run. There might be slight variation in the number of records after the run due to the additional requests in rampup or rampdown phase.

- results_node_dc_eis: 
  Sub directory with timestamp, will be created after the run.
    - Temporary log file with following details for every request,
      request-number, issue time, response time.
    - Summary file with,
      - client information, 
      - database information,
      - hardware,software,version details and 
      - summarized throughput, min max,average response time.
    - Three output graphs (throughput,latency  and memory utilization graph).

# Platforms Tested ON:

Linux Client:
  - Intel(R) Core (™) i7-4770 CPU @ 3.40 GHz
  - Debian (jessie)
  - Ubuntu 15.10

Windows Client – 8.1 Enterprise
  - Intel Core i5-4300U @ 1.9GHz
  - Memory 4GB
  - 51GB of storage free

Linux Server:
  - Intel(R) Core(TM) i7-4790 CPU @ 3.60GHz
  - Ubuntu 15.10, 16 Gig RAM
  - Node.js version v4.4.5 / v5.5.0
  - MongoDB version 3.2.10

Windows Server 2012 R2
  - Intel XEON E5-2699 v3 @ 2.3GHz
  - Memory 256GB
  - ~2TB of storage free
  - Node.js version 6.9.1
  - MongoDB version 3.2.10

# Known issues/limitations: 
  - Following issues are observed while installing python and related dependencies
    - Tool "pip" is not installed by default with Python
    - Proxy errors while using pip and npm 
    - Proxy errors while using request module in python.
    - Here is stackoverflow thread for various proxy setting issue and solutions
    - https://stackoverflow.com/questions/28521535/requests-how-to-disable-bypass-proxy
    - NPM is not build if use your own build of Node.js

  - If you try to populate with very high number of DB records, you may encounter following issues,
    - On the Server side, server may run out of memory causing core-dump
    - With --max_old_space_size=5000 This will set the heap space to 5 GB, large databases take up more space while the records are loaded.
    - On the client side, initial request to populate the DB may fail due to HTTP timeout.
    - Upper limit for the database records is number of unique lastnames(777) * lastname_ratio(default: 25)#NODE-DC-EIS
  - Most Linux based environments have default open files limitation to 1024. Please increase it to at least 100K.
    - A system file you are looking to update is /etc/security/limits.conf and updated setting is as follows,
    - * soft nofile 100000
    - * hard nofile 100000
  - If you are seeing 'Dropped packets' message in the system log (run 'dmesg' command), you may be hitting connection tracking limit in the Kernel. Please update this setting as follws,
    $ cat /proc/sys/net/netfilter/nf_conntrack_max (default value: 262144)
    - As a root, 
    $ echo 512000 > /proc/sys/net/netfilter/nf_conntrack_max or more if needed.

  - If the system is reaching network bandwidth limit, then the options are,
    - Try using higher bandwidth NIC (> 10G),
    - Try reducing data set size (by using small size images used by the server). Checkout configuration.js in the server code. Now there is a way to try using image file with different sizes.

