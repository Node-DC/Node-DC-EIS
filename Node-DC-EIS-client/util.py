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
import time
import os
start_MT = 0 
end_MT = 0
MT_req = 0

def getCurrentTime():
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
  

def printlog(log,phase,request_num,url,start,end,response_time):
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
    MT_req = MT_req + 1
    if ((start >= start_MT and end_MT == 0) or (end_MT > start_MT and end <= end_MT)):
      print >> log, phase+","+str(request_num)+","+str(url)+","+str(start)+","+str(end)+","+str(response_time)
    else:
      phase = "RD"
      print >> log, phase+","+str(request_num)+","+str(url)+","+str(start)+","+str(end)+","+str(response_time)
  else:
    print >> log, phase+","+str(request_num)+","+str(url)+","+str(start)+","+str(end)+","+str(response_time)
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
  print ("[%s] Creating indicator file." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  ind_file = open(os.path.join(rundir,file_name+str(instance_id)+".syncpt"),'w')
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
  print >> log,"Concurrency is:"+str(concurrency)
  print >> log,"Number of processess:"+str(cpuCount)
  print >> log,"Measuring time window start time is:"+str(start_MT) 
  print >> log,"Measuring time end time is:"+str(end_MT)
  print >> log,"Elapsed time is:"+str(end_MT-start_MT)
  print >> log,"Total measuring time requests:"+str(MT_req)
  print >> log,"Throughput is:"+str(throughput)
  log.close()
  