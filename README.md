-------------------------------------------------------------------------------
Objective 
--------------------------------------------------------------------------- 
Develop workloads representing realistic use cases of Node.js in Data Center with open collaboration from community, Node.js experts and companies playing important roles in Node.js evolution and production deployments in Data Centers. 

Workloads APIs, functionalities and metrics should be very useful to evluate performance of complete software stack of Node.js, Operating Systems, containers, virtulization, network stacks as well as data center choices relevant for hardware developers, deployments, researchers and Node.js community. 

Node-DC-EIS (Node.js - Data Center - Employee Information Services) 
--------------------------------------------------------------------------- 
This is first in series of upcoming workloads for modelling various use cases of Node.js in Data Center (Node-DC). This workload is modelling various functionalities of Employee Information Services implemented in Node.js in Data Center.

Open for contributions to take from v0.9 to v1.0  
--------------------------------------------------------------------------- 
Following changes are required to take from v0.9 to v1.0
  - Feedback from community
  - Change from Mongoose to MongoDB driver
	
Following changes are optional but good to have:
  - Options for alternate DB choices
  - Changing client from Python to Node.js 
  - Option for time based rampup, measurement, and rampdown windows inaddition to current total requests 
  - Aggregating response time samples every n sec interval instead of postprocessing at the end of complete run
  - Containerize the client, server and DB for easy testing and setup of the workload 

Contributing  
--------------------------------------------------------------------------- 
If you want to contribute code to this project, first you need to fork the project. The next step is to send a pull request (PR) for review to this repository. For small changes, you can implement at first step and for large changes, it is encouraged to send the architecure and data flow before investing lots of time in implementation. The PR will be reviewed by the project team members. You need at least one "Look Good To Me (LGTM)" or other positive signals from the project members. Once you have gained the required signals the project maintainers will merge the PR.

Workload modes  
--------------------------------------------------------------------------- 
This workload has two modes 

  - Cluster mode (includes monolithic mode when setting CPU count = 1)


  - Micro-services mode

-------------------------------------------------------------------------------
Content and Setup  
---------------------------------------------------------------------------
This is a Node-DC-EIS workload code, which contains following directories,
Server Codebase:
  - cluster, and
  - microservices

Client driver codebase
  - node-dc-eis-client

NOTE : 
If proxy needs to be set up, make sure the it has been properly set.
  (npm config set proxy http://proxy.example.com:8080)
  (npm config set https-proxy http://proxy.example.com:8080)
 
Linux Client: Required Modules and installations
------------------------------------------------------------------------------- 
- Install Python 2.7.10
- NumPy version '1.8.2' (command: pip install numpy)
- Matplotlib '1.4.2'    (command: sudo apt-get install python-matplotlib)
- requests '2.10.0'     (command: sudo pip install requests)
- eventlet '0.19.0'     (command: sudo pip install eventlet)

Note: Please make sure above modules are installed without any error. 
      Install any missing modules as per your system configuration.

Windows Client: Required Modules and installations
------------------------------------------------------------------------------- 
- Python 2.7.12 (2.7.10 – confirmed to work) 
  Download it from https://www.python.org/downloads/. 
	Download “Windows x86 MSI installer
  Once you have downloaded the Python MSI, navigate to the download 
	location on your computer, double clicking the file and pressing Run 
	when the dialog box pops up.

- Follow the instructions in the dialog box
- Once python is installed add Python to System Path Variable in the System 
 environment variables
- If you are behind a proxy set your proxy
- Install pip.py from https://pip.pypa.io/en/stable/installing/ and follow the 
  instruction for running it
- Make sure that pip is installed and is in your path before continuing 
  installation
- NumPy version '1.11.2' (command: pip install numpy)
- Matplotlib 1.5.3       (command: pip install matplotlib)
- requests '2.11.1'      (command: pip install requests)
- eventlet '0.19.0'      (command: pip install eventlet)

Note: 
  Please make sure above modules are installed without any error. 
  Install any missing modules as per your system configuration.

Server setup:
--------------------------------------------------------------------------- 
Install the following:
  - node.js (www.nodejs.org)
  - mongodb (https://www.mongodb.com/download-center#community)

Server Preparation:
--------------------------------------------------------------------------- 
  - Make sure node.js and npm (node package manager) have been installed.
  - Make sure mongodb is running or start mongod server manually listening 
	  at default port (27017).

- Windows Server Specific
  - Make Directory - C:\data\db.

- Linux Server Specific
  - Make Directory – ~/data/db

- Both(This may or maynot be required as per your mongodb setting)
  - Navigate to data/db or data\db.
  - Run “mongod”, leave this terminal open to maintain the process.
  - (Optional)In a separate terminal run “mongo” to confirm database is 
	  active.
  - Set PATH pointing to node.js binary you installed.
  - Make sure npm is in your PATH.
 
Starting server in various modes
--------------------------------------------------------------------------- 
NOTE: Each server mode starts at different default port.

Running application server in Cluster mode (default port: 9000): 
  - Change directory to cluster,
	- run “npm install” to install all dependencies (don't use sudo). 
  - Run “node server-cluster.js”

  NOTE: In cluster mode you (User) may have to increase the concurrency value 
        in order to achive high CPU/platform utilisation.
        In cluster mode you can control the number CPU's by changing the configuration file in the cluster mode. If not set, it takes the default number of CPU's available.

Running application server in microservices mode (default port: 3000):
	- run “npm install” to install all dependencies for each service directory
	  (don't use sudo), and start each service seperately
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

Note: 1) For micro-sevices mode, it's possible to deploy each service on 
      different machine (seperate IP address). Please take a look at the 
	  following file for any such changes,
      2) In this mode you (User) may have to increase the concurrency value 
      in order to achive platform utilisation.

      microservices/employee_service/config/configuration.js file.
	  In this mode employee_service acts as a main receiver and delegator for 
	  all incoming requests.
	  This mode works but if there are any questions, please reach out to us.

--------------------------------------------------------------------------- 
Testing:
--------------------------------------------------------------------------- 
Make sure you have access to the node_dc_eis-client, which contains client 
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

Known Issues:
--------------------------------------------------------------------------- 
- We have encounterd some issue while running on CentOS. 
  Most issue are observed while installing python and related dependencies
- Tool "pip" is not install by default with python
- Proxy errors while using pip and npm 
- NPM is not build if use your own build of nodejs

Platforms Tested ON:
--------------------------------------------------------------------------- 
  Linux Client:
  - Intel(R) Core (™) i7-4770 CPU @ 3.40 GHz
  - Debian (jessie)
  - Ubuntu 15.10

  Linux Server
  Verified on
  - Intel(R) Core(TM) i7-4790 CPU @ 3.60GHz
  - Ubuntu 15.10, 16 Gig RAM
  - Node.js version v4.4.5 / v5.5.0
  - MongoDB version 3.2.10

  Windows Client – 8.1 Enterprise
  - Intel Core i5-4300U @ 1.9GHz
  - Memory 4GB
  - 51GB of storage free

  Windows Server 2012 R2
  - Intel XEON E5-2699 v3 @ 2.3GHz
  - Memory 256GB
  - ~2TB of storage free
  - Node.js version 6.9.1
  - MongoDB version 3.2.10

Known issues/limitations:
--------------------------------------------------------------------------- 
If you try to populate with very high number of DB records, you may encounter
following issues,
0) On the Server side, server may run out of memory causing core-dump
  - If you see [GC in old space requested], restart node server 
  with --max_old_space_size=5000 This will set the heap space to 5 GB, large databases take up more space 
  while the records are loaded.   
1) On the client side, initial request to populate the DB may fail due 
   to HTTP timeout. 
2) Upper limit for the database records is number of unique lastnames(777) * lastname_ratio(default: 25)
#NODE-DC-EIS
