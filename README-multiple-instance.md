Copyright (c) 2016 Intel Corporation 

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

Multi node run allows distributed testing. You can run multiple applications on the same machine or on a pool of machines. This run typically uses 3 scripts:
 - run_multiple_instance.sh  - Runs multiple instances of the server client and mongodb on the same machine or across different machines.
   	 - 2 run modes - bare metal run (default run mode 0) and container run (run mode 1)

 - multiple_instance_config.json - The input configuration file for multiple instances. Each instance requires these parameters:
 	  ````
 	  {
  		"server_ip":"127.0.0.1", //IP address where the server runs
  		"server_port":"9001",  // Port the server listens to
  		"db_name":"node-els-db1", // Database name
  		"db_ip":"127.0.0.1", // Database IP address
  		"db_port":"27018" // Port database listens to
 	  }
 	  ````
 - multiple_instance_post_process.py - Script to post process and summarize data from all the instances
    -  Post processes data from each instance to generate a summary data file.
    -  Generates live throughput and response time graphs.

 - a results_multiple_instance will be created after the run which contains all the result directories for which are designated by the date and time stamp.
 	- log directory with individual instance logs and master log designated by the date and time stamp.
 	- Master RTdata file - summarizes data (min,mean max, 95 and 99 percentile response time and Throughput) from all the instances for every given interval.
 	- Summary Throughput and response time graphs.
 	- Master summary file - Provides the combined throughput of all the instances, 99 percentile response time, the number of instances, concurrency used, a detailed summary of response times and each instance summary.

In addition there are 3 supporting scripts:
	- start-server.sh - Used to start server and mongodb during a bare metal run.
		- requires NODE_PATH (path to node binary) to be set before the run.
	- stop-server.sh - Used to stop server and mongodb during a bare metal run
	-container-startup.sh - Used to start containers.

Steps in a typical run:
	- The multiple_instance_config.json file is processed to create server and client config files for each instance.
	- The server code is copied to a remote server (IP provided in the config file) and each instance server is started.
	- A curl command is issued to check if every server instance is up and running.
	- Each instance client is started once all the servers are up.
	- Each client waits till all the instances have finished loading database.
	- The post processing script starts in the background once all the clients have their first summary data available.
	- The server and mongodb stops once post processing is completed.

Setup instructions:
Auto-login setup between the client and the server
    - SSH auto login needs to be set up between the client and the server.RSH and RCP uses this auto login to remote into the server and start the server.
      - Steps for auto login setup
        ````
		-$ ssh-keygen -t rsa -b 2048
		Generating public/private rsa key pair.
		Enter file in which to save the key (/home/username/.ssh/id_rsa):
		Enter passphrase (empty for no passphrase):
		Enter same passphrase again:
		Your identification has been saved in /home/username/.ssh/id_rsa.
		Your public key has been saved in /home/username/.ssh/id_rsa.pub.

		Copy your keys to the target server:
		$ ssh-copy-id userid@server
		userid@server's password:

		Finally check logging in…
		$ ssh userid@server
		````
	- Update multiple_instance_config.json file with server and DB configuration parameters

	- Run the main driver script (run_multiple_instance.sh)
	 	bash run_multiple_instance.sh 0
