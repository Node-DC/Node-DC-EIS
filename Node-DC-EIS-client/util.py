# Copyright (c) 2016 Intel Corporation 
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
from __future__ import absolute_import
from __future__ import print_function
import time
import os
start_MT = 0 
end_MT = 0
MT_req = 0

def get_current_time():
  """
  #  Desc  : Function returns current date and time
  #  Input : None
  #  Output: Return current date and time in specific format for all log messages
  """
  currentTime=time.strftime("%d-%m-%Y %H:%M:%S")
  return currentTime

def record_start_time():
  """
  # Desc  : Function to record start time
  # Input : None
  # Output: Returns start time of measuring time phase
  """
  global start_MT
  start_MT = time.time()
  

def record_end_time():
  """
  # Desc  : Function to record end time
  # Input : None
  # Output: Returns end time of measuring time phase
  """
  global end_MT
  end_MT = time.time()
  

def printlog(log,phase,url_type,request_num,url,start,end,response_time,total_length):
  """
  # Desc  : Function to Generate per request details in a templog file
  #         checks all the requests in MT phase are within the start and end time 
  #         of measuring time phase
  # Input : log file to collect per request data
  #         phase of each request(ramp-up, ramp-down, measuring-time)
  #         request number, URL , start and end time of each request,
  #         response time of each request
  # Output: Returns per request details in a templog file
  """
  global MT_req
  if phase =="MT":
    if not ((start >= start_MT and end_MT == 0) or (end_MT > start_MT and end <= end_MT)):
      phase = "RD"
    else:
      MT_req = MT_req + 1
  log_str = phase+","+str(request_num)+","+str(url)+","+str(start)+","+str(end)+","+str(response_time)+","+str(total_length)+","+str(url_type)
  print(log_str, file=log)
  log.flush()

def check_startfile(rundir):
  """
  # Desc  : Function to check if a file exists
  # Input : run directory
  # Output: Returns true if the file exists
  """
  while True:
    if(os.path.exists(os.path.join(rundir,"start.syncpt"))):
      break

def create_indicator_file(rundir,file_name,instance_id,string_towrite):
  """
  # Desc  : Function to create indicator files
  # Input : run directory, the file name to be created, instance ID, 
  #         string to be written in the new file created
  # Output: creates a new indicator file
  """
  print("[%s] Creating indicator file." % get_current_time())
  with open(os.path.join(rundir, '%s%s.syncpt' % (file_name, instance_id)),
            'w') as ind_file:
    if string_towrite:
        ind_file.write(string_towrite)


def calculate_throughput(log_dir,concurrency,cpuCount):
  """
  # Desc  : Function to calucalte throughput for each run
  # Input : run directory, concurrency ,the number of processes 
  # Output: generates a summary throughput file 
  """
  throughput = MT_req/(end_MT-start_MT)
  throughput = round(throughput,2)
  try:
    log = open(os.path.join(log_dir,"throughput_info.txt"), "w")
  except IOError as e:
    print("Error: %s File not found throughput_info.txt")
    return None
  print("Concurrency is:"+str(concurrency), file=log)
  print("Number of processess:"+str(cpuCount), file=log)
  print("Measuring time window start time is:"+str(start_MT), file=log) 
  print("Measuring time end time is:"+str(end_MT), file=log)
  print("Elapsed time is:"+str(end_MT-start_MT), file=log)
  print("Total measuring time requests:"+str(MT_req), file=log)
  print("Throughput is:"+str(throughput), file=log)
  log.close()

  