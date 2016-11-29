# Objective 
The Node-DC is an open source collaboration project to develop workloads representing realistic use cases of Node.js in the data center. It started in 2016 with collaboration from the open source community, Node.js experts and companies playing important roles in Node.js’s evolution and production deployments in the data centers. 

Workloads APIs, functionalities and metrics will be used to evaluate performance of the complete software stack for Node.js, Operating Systems, containers, virtualization, network stacks as well as various data center configuration choices. These are relevant for hardware and software developers, researchers and Node.js community. One priority for this project is to update the workloads in order to keep them up with the fast moving eco-system of Node.js. 

# Contributing and Community   

## Contribution to individual projects: 
If you want to contribute code to a project, first you need to fork the project. Next step is to send a pull request (PR) for review to the repository. For small changes, you can implement at first step and for large changes, it is recommended to initially send the architecture and data flow, before investing significant time into the detailed implementation. The PR will be reviewed by the project team members. You need one "Looks Good To Me (LGTM)" and no objections from the project members. Once you have gained the required approval, the project maintainers will merge the PR.

## Contribution to use cases: 
We are constantly evaluating the relevant use cases. The list below includes the current status and is evolving based on the continuous feedback we are receiving from the community and major datacenter deployments for Node.js: 

  - Node-DC-EIS (Node.js - Data Center - Employee Information Services) : Current status at v0.9 with v1.0 by Q1 2017
    
  - Node-DC-SSR (Node.js - Data Center - Server Side Rendering) : Under consideration as next candidate

  - We are looking for community suggestions for other relevant use cases

Feedback can be sent either by creating issues or sending e-mail listed at https://github.com/Node-DC

# Node-DC-EIS (Node.js - Data Center - Employee Information Services) 
 
This is first in a series of upcoming workloads for modelling use cases of Node.js in Data Center (Node-DC). This workload is modelling various functionalities of Employee Information Services implemented in Node.js in Data Center.

# Open for contributions to take from v0.9 to v1.0  
 
Following changes are being worked on from v0.9 to v1.0
  - Feedback from community
  - Change from Mongoose to MongoDB driver   
  - Increase unique lastnames from 777 to at least 5000 or more 
  
Following changes are being considered as optional:
  - Options for alternate DB choices
  - Unit tests as part of PR acceptance criterion 
  - Changing client from Python to Node.js 
  - Workload phases ramp-up, measurement, and ramp-down to be able to set for a given time instead of #requests 
  - Reduce the size of output file by processing response time samples every n sec interval instead of post-processing at the end of complete run
  - Containerize the client, server and DB for easy testing and setup of the workload 

# Node-DC-EIS Architecture  



# Node-DC-EIS Metrics  



# Node-DC-EIS default and configurable options for research and testing  



# Node-DC-EIS Workload Modes  

This workload has two modes 

  - Cluster mode (includes a monolithic mode when setting CPU count = 1)

  - Microservices mode


# Content  

Node-DC-EIS workload code, which contains following directories,
Server Codebase:
  - Node-DC-EIS-cluster, and
  - Node-DC-EIS-microservices

Client driver codebase
  - Node-DC-EIS-client

#### NOTE : 
If proxy needs to be set up, make sure the it has been properly set.
  - (npm config set proxy http://proxy.example.com:8080)
  - (npm config set https-proxy http://proxy.example.com:8080)

# Client Setup  

## Linux Client: Required Modules and Installations

  - Install Python 2.7.10
  - NumPy version '1.8.2' (command: pip install numpy)
  - Matplotlib '1.4.2'    (command: sudo apt-get install python-matplotlib)
  - requests '2.10.0'     (command: sudo pip install requests)
  - eventlet '0.19.0'     (command: sudo pip install eventlet)

#### NOTE: 
Please make sure above modules are installed without any error. 

Install any missing modules as per your system configuration.

## Windows Client: Required Modules and Installations

  - Python 2.7.12 (2.7.10 – tested ). Download it from https://www.python.org/downloads/. 
  
  Download “Windows x86 MSI installer
  
  Once you have downloaded the Python MSI, navigate to the download location on your computer, double clicking the file and pressing Run when the dialog box pops up.

  - Follow the instructions in the dialog box
  - Once python is installed add Python to System Path Variable in the System environment variables
  - If you are behind a proxy set your proxy
  - Install pip.py from https://pip.pypa.io/en/stable/installing/ and follow the instruction for running it
  - Make sure that pip is installed and is in your path before continuing installation
  - NumPy version '1.11.2' (command: pip install numpy)
  - Matplotlib 1.5.3       (command: pip install matplotlib)
  - requests '2.11.1'      (command: pip install requests)
  - eventlet '0.19.0'      (command: pip install eventlet)

#### NOTE: 

Please make sure above modules are installed without any error. 
Install any missing modules as per your system configuration.

# Server Setup  

Install the following:
  - node.js (www.nodejs.org)
  - mongodb (https://www.mongodb.com/download-center#community)

## Server Preparation:

  - Make sure node.js and npm (node package manager) have been installed.
  - Make sure mongodb is running or start mongod server manually listening at default port (27017).

  - Windows Server Specific
  	- Make Directory - C:\data\db.

  - Linux Server Specific
  	- Make Directory – ~/data/db

  - Both ( This may or may not be required as per your mongodb setting)
  	- Navigate to data/db or data\db.
  	- Run “mongod”, leave this terminal open to maintain the process.
  	- (Optional)In a separate terminal run “mongo” to confirm database is active.
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
	python npm_install_all.py
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

#### Note: 

	1. For microsevices mode, it's possible to deploy each service on different machine (seperate IP address). Please take a look at the following file for any such changes,
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
	  - numbers of total_requests to issue,
	  - number of concurrent requests,
	  - total number of dynamic urls to use,

	- Server parameters,
	  - server ipaddress and port number. This can be changed either from the command
		  line or in the config.json file.

	- Database parameters,
	  - Total number of records to populate, etc.

  - Caching parameters,
    - Enable or disable cache for the database
    - Tweak cache size, and cache expiration timeframes.

- runspec.py: 
  A top-level runspec script; the main script to launch workload.
  This script initiates, track requests, generates log file, and output 
	graphs.
	Use config.json for setting parameters. This needs to be use -f option. 
	User can override all parameters from the command line as well..
  - Invoke "runspec.py -h" for detail help

- node-dc-eis-testurls.py: 
  The workload driver file which sends actual requests using python's requests 
  module to the server.

- summary_file_sample.txt: 
  Sample summary file that is generated after a run.

  Note: The validation report gives details of how many record were loaded in the database and how many records are present in the database after the run. There might be slight variation in the number of records after the run due to the additional requests in rampup or rampdown phase.

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

Platforms Tested ON:
--------------------------------------------------------------------------- 
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

Known issues/limitations:
--------------------------------------------------------------------------- 
 
- Some issue while running on CentOS. 
- Following issues are observed while installing python and related dependencies
	  - Tool "pip" is not install by default with python
	  - Proxy errors while using pip and npm 
	  - NPM is not build if use your own build of nodejs

- If you try to populate with very high number of DB records, you may encounter following issues,
	  - On the Server side, server may run out of memory causing core-dump
	  - with --max_old_space_size=5000 This will set the heap space to 5 GB, large databases take up more space while the records are loaded.   
	  - On the client side, initial request to populate the DB may fail due to HTTP timeout. 
	  - Upper limit for the database records is number of unique lastnames(777) * lastname_ratio(default: 25)#NODE-DC-EIS
