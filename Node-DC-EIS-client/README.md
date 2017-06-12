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

This client directory contains,
 - runspec.py- A toplevel runspec script; the main script to launch workload.
 - node_els-testurls.py - The benchmark driver file which sends actual requests using python's requests module.
 - config.json - The input configuration file.
 - process_time_based_output.py - Script to post process and summarize time based run data
 - summary_file_sample.txt - Sample file of the summary file that is generated after a run.
 - a results sub directory will be created after the run which contains all the result directories which are designated by the date and timestamp.
 

## Client help:
      - Run the main script “python runspec.py <optional parameters example -t, -n, -c ,-h>”.
        - You will need to change the IP address and port of your server in ‘runspec.py’ or in config.json. 
        - Takes additional command line parameters.
        - Default parameters in the script or can be read from a configuration file with -f/--config option (command line has the maximum priority).
        -h gives the available options.
        - the server ip address and port can be changed in config.json or directly in runspec.py
        -This script sends requests using python's requests module, generates log file and generates output graphs.
 
 
## Client result files
   - A temporary log file which contains details like request-number,write-time, read-time, response-time for every request.
   - A summary file which has client information, database information and a summary of the run (throughput, min max,average response time).
   - Two output graphs; one is the throughput graph and the second is the latency graph.

