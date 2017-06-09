#!/usr/bin/python
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

import sys
import os
import time 
import csv
import numpy as np
import operator
import requests
import json
import matplotlib
matplotlib.use(matplotlib.get_backend())
import matplotlib.pyplot as plt
import util

#globals
min_resp =0
max_resp = 0
mean_resp = 0
percent99 = 0
percent95 = 0

def process_tempfile(results_dir,interval,rampup_rampdown,request,temp_log,instance_id,multiple_instance):
    """
    # Desc  : Function to process each intermediate files.
    #         waits for interval and then calls process_data on the next templog file
    # Input : result directory where all the templog files are present,interval after which 
    #         control moves to the next templog file,total time for rampup and rampdown
    #         total time for the measurement, instance ID, flag to check multiple insatnce run 
    # Output: None
    """

    file_cnt=0
    try:
        temp_log = open(os.path.join(results_dir,temp_log),"a")
    except IOError:
        print ("[%s] Could not open templog file for writing." % (util.get_current_time()))
    print >> temp_log, "File#,MinResp,MaxResp,MeanResp,95percentile,99percentile,Startime,Endtime,#RUReq,#MTReq,#RDReq,TotalReq,Throughput"
    temp_log.flush()
    time.sleep(60)
    while True:
        tempfile = os.path.join(results_dir,"tempfile_"+str(file_cnt))
        if(os.path.exists(tempfile)): 
          time.sleep(interval)
          try:
            temp_file = open(tempfile,"r")
            print ("[%s] Processing Output File tempfile_[%d]." % (util.get_current_time(),file_cnt))
            process_data(temp_file,temp_log,results_dir,file_cnt)
            temp_file.close()
            if(file_cnt == 0 and multiple_instance):
              util.create_indicator_file(os.path.dirname(os.path.dirname(results_dir)),"start_processing", instance_id, temp_log.name)
            os.remove(tempfile)
            file_cnt +=1
          except IOError:
            print ("[%s] Could not open templog file for reading." % (util.get_current_time()))
            sys.exit(1)
        else:
          break

    print ("[%s] Closing main templog file." % (util.get_current_time()))
    temp_log.close()    

def process_data(temp_file,temp_log,results_dir,file_cnt):
    """
    # Desc  : Function which opens temporary files one by one and process 
    #         them for intermediate results
    # Input : file pointer to the templog file which needs to be processed,the temporary file 
    #         where all the processed data is stored, results directory where 
    #         all the templog files are present
    # Output: Generates a summary output file with all the processed data
    """
    col_st = 3; #column number of start time
    col_et = 4
    col_rt = 5; #column number of response time
    col_url = 2; #column number of url
    read_time = []
    res_arr = []
    abs_start = 0
    RUreq = 0
    MTreq = 0
    RDreq = 0
    csvReader = csv.reader(temp_file) 
    sortedlist = sorted(csvReader, key=lambda row: int(row[1]))
    for row in sortedlist:
      read_time.append(float(row[col_et]))
      res_arr.append(float(row[col_rt]))
      if "RU" in row[0]:
        RUreq = RUreq + 1 
      if "MT" in row[0]: 
        MTreq = MTreq + 1
      if "RD" in row[0]:
        RDreq = RDreq + 1
      if abs_start == 0:
        abs_start = float(row[col_st])
    if(len(res_arr) > 0):
      calculate(res_arr) 
      print >> temp_log,str(file_cnt)+","+str(min_resp)+","+str(mean_resp)+","+str(percent95)+","+str(percent99)+","\
      +str(max_resp)+","+str(abs_start)+","+str(max(read_time))+","+str(RUreq)+","+str(MTreq)+","+str(RDreq)+","+str(len(res_arr))+","+\
      str(len(res_arr)/(max(read_time)-abs_start))
    print ("[%s] Writing tempfile_[%d] data to summary file." % (util.get_current_time(), file_cnt))
    temp_log.flush()

#function to calculate 95, 99 percentile, min, max, mean response time
def calculate(response_array): 
    """
    # Desc  : function to calculate 95, 99 percentile, min, max, mean response time
    # Input : Array of response times for each run
    # Output: Returns 95, 99 percentile, min, max, mean response times for each run
    """
    global percent99
    global min_resp
    global max_resp
    global mean_resp
    global percent95
    response_array.sort() 
    respa = np.array(response_array)
    percent95 = np.percentile(respa, 95)
    percent99 = np.percentile(respa, 99)
    min_resp = np.amin(respa)
    max_resp = np.amax(respa)
    mean_resp = np.mean(respa)

def post_process(temp_log,output_file,results_dir,interval,memlogfile):
  """
  # Desc  : Main function for post processing of log file to summarize the results.
  #         Calculates MIN, MAX,MEAN response time, throughput, 
  #         99 percentile and error details of each run, Generates 3 graphs for
  #         throughput, response time and memory usage for each run
  # Input : Temporary summary file to process the data from, output summary file,
  #         Results directory, interval for generating summary, memory logfile
  # Output: Generates a summary for eah run and 3 graphs for
  #         throughput, response time and memory usage for each run
  """
  arr_95 =[]
  arr_99 =[]
  min_arr=[]
  max_arr=[]
  mean_arr=[]
  read_arr=[]
  no_arr=[]
  throughput_arr=[]
  write_arr=[]
  abs_start =0
  print ("[%s] Post_process phase." % (util.get_current_time()))
  try:
    logfile = open(os.path.join(results_dir,temp_log), "r")
  except IOError as e:
    print("Error: %s File not found." % temp_log)
    return None
  csvReader = csv.reader(logfile)
  try: 
     processed_filename = os.path.join(results_dir,output_file)
     processed_file = open(processed_filename, 'w')
  except IOError as e:
    print("Error: %s Could not create file." % output_file)
    return None

  for row in csvReader:
    if row[0].isdigit():
      arr_95.append(float(row[3]))
      arr_99.append(float(row[4]))
      min_arr.append(float(row[1]))
      max_arr.append(float(row[5]))
      mean_arr.append(float(row[2]))
      write_arr.append(float(row[6]))
      read_arr.append(float(row[7]))
      no_arr.append(float(row[11]))
      throughput_arr.append(float(row[12]))
  minimum = min(min_arr)
  maximum = max(max_arr)
  sortmarr = sorted(mean_arr)
  npmean_arr =np.array(sortmarr)
  mean = np.mean(npmean_arr)
  sortarr99 = sorted(arr_99)
  nparr_99 = np.array(sortarr99)
  percent99 = np.mean(nparr_99)
  sortarr95 = sorted(arr_95)
  nparr_95 = np.array(sortarr95)
  percent95 = np.mean(nparr_95)
  requests = sum(float(i) for i in no_arr)
  end_time = float(read_arr[-1])
  try: 
     throughput_filename = os.path.join(results_dir,"throughput_info.txt")
     throughput_file = open(throughput_filename, 'r')
  except IOError as e:
    print("Error: %s Could not open file." % throughput_filename)
    return None
  for line in throughput_file:
    if "Throughput" in line:
      throughput = line.strip('\n').split(':')[1]
  throughput_file.close()
  print "\n====Report Summary===="
  print "Primary Metrics:"
  print 'Response time 99 percentile = ' + str(round(percent99,3)) +" sec"
  print 'Throughput = ' + str(throughput) + " req/sec"
  print >> processed_file, "\n====Report Summary===="
  print >> processed_file, "Primary Metrics:"
  print >> processed_file, 'Throughput = ' + str(throughput)+" req/sec"
  print >> processed_file, '99 percentile = ' + str(round(percent99,3)) +" sec"
  print "--------------------------------------\n"
  print >> processed_file, "Detailed summary:"
  print >> processed_file, 'Min Response time = ' + str(round(minimum,3)) +" sec"
  print >> processed_file, 'Mean Response time = ' + str(round(mean,3)) +" sec"
  print >> processed_file, 'Max Response time = ' + str(round(maximum,3)) +" sec"
  print >> processed_file, '95 percentile = ' + str(round(percent95,3)) +" sec"
  print ("[%s] Post processing is done.\n" % (util.get_current_time()))
  processed_file.flush()

  #plot graphs. Plots three graphs, latency graph, throughput graph and a memory usage graph. These files are stored in the result directory  
  print ("[%s] Plotting graphs." % (util.get_current_time()))
  #write_arr = list(range(int(abs_start), int(end_time), interval))
  plt.figure("Response Time")
  plt.grid(True)
  plt.plot(write_arr,min_arr, linewidth=1, linestyle='-', marker='.', color='b', label='Min resp')
  plt.plot(write_arr,mean_arr, linewidth=1, linestyle='-', marker='.', color='y', label='Mean Resp')
  plt.plot(write_arr,arr_95, linewidth=1, linestyle='-', marker='.', color='m', label='95 percentile')
  plt.plot(write_arr,arr_99, linewidth=1, linestyle='-', marker='.', color='r', label='99 percentile')
  plt.plot(write_arr,max_arr, linewidth=1, linestyle='-', marker='.', color='g', label='Max Resp')

  plt.title('Response time')
  plt.ylabel('Response time in s')
  plt.xlabel('Time in s')
  plt.legend(loc=9, bbox_to_anchor=(0.5, -0.1),ncol=5,prop={'size':10})
  plt.tight_layout(pad=3)
  plt.savefig(os.path.join(results_dir, 'resptime.png'))
  print("The response-time graph is located at  " +os.path.abspath(os.path.join(results_dir,'resptime.png')))

  plt.figure("Throughput")
  plt.grid(True)
  plt.plot(write_arr,throughput_arr, linewidth=2, linestyle='-', marker='.', color='r', label='throughput')
  plt.title('Throughput')
  plt.ylabel('Throughput in req/s')
  plt.xlabel('Time in s')
  plt.legend(loc=9, bbox_to_anchor=(0.5, -0.1),ncol=1,prop={'size':10})
  plt.tight_layout(pad=3)
  plt.savefig(os.path.join(results_dir, 'throughput.png')) 
  print("\nThe throughput graph is located at  " +os.path.abspath(os.path.join(results_dir,'throughput.png')))

  if os.path.exists(os.path.join(results_dir,memlogfile+".csv")):
   with open(os.path.join(results_dir,memlogfile+".csv")) as f:
      reader=csv.reader(f, delimiter=',')
      write_arr, rss_values, heapTotal_values, heapUsed_values = zip(*reader)
      plt.figure("Memory usage")
      plt.grid(True)
      plt.plot(write_arr,rss_values, linewidth=1, linestyle='-', marker='.', color='r', label='rss')
      plt.plot(write_arr,heapTotal_values, linewidth=1, linestyle='-', marker='.', color='b', label='heapTotal')
      plt.plot(write_arr,heapUsed_values, linewidth=1, linestyle='-', marker='.', color='g', label='heapUsed')
      plt.title('Memory usage')
      plt.ylabel('Memory used in M')
      plt.xlabel('Time in s')
      plt.legend(loc=9, bbox_to_anchor=(0.5, -0.1),ncol=3)
      plt.tight_layout(pad=3)
      plt.savefig(os.path.join(results_dir,'memory_usage.png'))
      print("\nThe memory usage graph is located at  " +os.path.abspath(os.path.join(results_dir,'memory_usage.png')))
  print ("[%s] Plotting graphs done." % (util.get_current_time()))
  
def process_time_based_output(results_dir,interval,rampup_rampdown,request,temp_log,output_file,memlogfile,instance_id,multiple_instance):
    """
    # Desc  : Main function which handles all the Output Processing
    #         This function is run by the Child Function
    # Input : Results directory, interval for generating summary, time interval for 
    #         rampup-rampdown phase,time interval for MT phase, output summary file,
    #         memory logfile, instance ID, flag to check multiple instance run
    # Output: None
    """
    print ("[%s] Starting process for post processing." % (util.get_current_time()))
    process_tempfile(results_dir,interval,rampup_rampdown,request,temp_log,instance_id,multiple_instance)     
    if multiple_instance:
      util.create_indicator_file(os.path.dirname(os.path.dirname(results_dir)),"done_processing", instance_id, "")
    # #Post Processing Function
    post_process(temp_log,output_file,results_dir,interval,memlogfile)
    print ("[%s] Exiting process for post processing." % (util.get_current_time()))
    sys.exit(0)
