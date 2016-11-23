#Copyright (c) 2016 Intel Corporation 
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


This client directory contains,
 - runspec.py- A toplevel runspec script; the main script to launch workload.
 - node_els-testurls.py - The benchmark driver file which sends actual requests using python's requests module.
 - config.json - The input configuration file.
 - summary_file_sample.txt - Sample file of the summary file that is genearted after a run.
 - results-node-els - Sub directory will be created after the run which contains all the result directories which are designated by the date and timestamp.
 
Make sure the following dependencies are installed:

   -Get the client files: git clone git@10.7.189.152:/home/git/node-els-client.git

Linux Client:  
 Required Modules and installations
  - Python 2.7.10 
  $ sudo apt-get install build-essential checkinstall
  $ sudo apt-get install libreadline-gplv2-dev libncursesw5-dev libssl-dev libsqlite3-dev tk-dev libgdbm-dev libc6-dev libbz2-dev
  $ wget https://www.python.org/ftp/python/2.7.10/Python-2.7.10.tgz
  $ tar xvf Python-2.7.10.tgz
  $ cd Python-2.7.10/
  $ ./configure 
  $ make
  $ sudo make install
  
  - NumPy version '1.8.2' command: pip install numpy
  - Matplotlib '1.4.2' command: sudo apt-get install python-matplotlib
  - requests '2.10.0' command : sudo pip install requests
  - eventlet '0.19.0' command : sudo pip install eventlet
Note: If there are any eroors in any modules and if there are additional modules to be installed, please install any missing modules.
 
Windows Client: 
  Required Modules and installations
  - Python 2.7.12 (2.7.10 – confirmed to work) Download it from https://www.python.org/downloads/
    Downlaod “Windows x86 MSI installer 
    Once you have downloaded the Python MSI, navigate to the download location on your computer, double clicking the file and pressing Run when the dialog box pops up.
    Follow the instructions in the dialog box
    Once python is installed add Python to System Path Variable in the Sytem environment variables
  - NumPy version '1.11.2' command: pip install numpy
  - Matplotlib 1.5.3 command :pip install matplotlib
  - requests '2.11.1' command : pip install requests
  - eventlet '0.19.0' command : pip install eventlet

Linux Server 
 Tested and verified on
  - Intel(R) Core(TM) i7-4790 CPU @ 3.60GHz
  - Ubuntu 15.10 16 Gig RAM
  - Node.js version 4.4.3
  - MongoDB version 3.2.10
  
Windows Server 2012 R2
 -Intel XEON E5-2699 v3 @ 2.3GHz
 -Memory 256GB
 -~2TB of storage free
 -Node.js version 6.9.1
 -MongoDB version 3.2.10
 -Windows Client – 8.1 Enterprise
 -Intel Core i5-4300U @ 1.9GHz
 -Memory 4GB
 -51GB of storage free
 
NOTE : If proxy needs to be set up,  make sure the it has been properly set.

Server:
   -Install the following:
     - node.js (www.nodejs.org)
     - mongodb (https://www.mongodb.com/download-center#community)
     - Get the server code: “git clone git@10.7.189.152:/home/git/node-els.git”
       Which contains the directories for monolithic, cluster and microservice models.
     
Steps to run (manual run):
  Preparation
   - Server:
      - Make sure node.js and npm (node package manager) have been installed.
      - Make sure mongodb is running or start mongod server manually.
          -Windows Server
             - Make Directory - C:\data\db.
         - Linux Server
             - Make Directory – ~/data/db
         -Both
             - Navigate to data/db or data\db.
            - Run “mongod”, leave this terminal open to maintain the process.
            - In a separate terminal run “mongo” to confirm database is active.
           
         - Set PATH pointing to node.js binary.
         - Make sure npm is in your PATH.
         - Change directory to monolithic/cluster/microservices and run “npm install” to install all workload dependencies.
  
Running the workload
--Server:
      - Start monolithic mode, go to the monolithic directory and run  “node server.js”
     - For cluster mode, go to the cluster directory and run “node server-cluster.js”
       -For Microservices mode navigate to the microservices directory. There are separate directory for each microservice. Go to individual directory, do an npm and install and start the server as “node server.js”
  --Client:
      - Run the main script “python runspec.py <optional parameters example -n, -c ,-h>”.
        - You will need to change the IP address and port of your server in ‘runspec.py’ or in config.json. 
        - Takes additional command line parameters.
        - Default parameters in the script or can be read from a configuration file with -f/--config option (commandline has the maximum priority).
        -h gives the available options.
        - the server ip address and port can be chnaged in config.json or directly in runspec.py
        -This script sends requests using python's requests module, generates log file and generates output graphs.
 
 
Result files
   - A temporary log file which contains details like request-number,write-time, read-time, response-time for every request.
   - A summary file which has client information, database information and a summary of the run (throughput, min max,average response time).
   - Two output graphs; one is the throughput graph and the second is thelatency graph.

