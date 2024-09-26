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

from __future__ import absolute_import
from __future__ import print_function
import sys
import os
import time 
import csv
import numpy as np
import operator
import requests
import json
import util
import math
from collections import Counter
from six.moves import zip

#globals
min_resp =0
max_resp = 0
mean_resp = 0
percent99 = 0
percent95 = 0
total_bytes = 0

def process_tempfile(results_dir, interval, rampup_rampdown, request,
                     temp_log, instance_id, multiple_instance, queue):
    """
    # Desc  : Function to process each intermediate files.
    #         waits for interval and then calls process_data on the next templog file
    # Input : result directory where all the templog files are present,interval after which 
    #         control moves to the next templog file,total time for rampup and rampdown
    #         total time for the measurement, instance ID, flag to check multiple insatnce run 
    # Output: None
    """

    try:
        temp_log = open(os.path.join(results_dir, temp_log),"a")
    except IOError:
        print("[%s] Could not open templog file for writing." % util.get_current_time())
        sys.exit(1)

    temp_log.flush()

    while True:
      event = queue.get()
      if event[0] == 'EXIT':
        break
      _, tempfile, file_cnt = event
      try:
        temp_file = open(tempfile, "r")
      except IOError:
        print("[%s] Could not open %s file for reading." % (util.get_current_time(), tempfile))
        sys.exit(1)

      with temp_file:
        print("[%s] Processing Output File tempfile_[%d]." % (util.get_current_time(), file_cnt))
        process_data(temp_file, temp_log, results_dir, file_cnt, interval)

      if file_cnt == 0 and multiple_instance:
        util.create_indicator_file(os.path.dirname(os.path.dirname(results_dir)), "start_processing", instance_id, temp_log.name)
      os.remove(tempfile)

    print(("[%s] Closing main templog file." % (util.get_current_time())))
    temp_log.close()    

def process_data(temp_file,temp_log,results_dir,file_cnt,interval):
    """
    # Desc  : Function which opens temporary files one by one and process 
    #         them for intermediate results
    # Input : file pointer to the templog file which needs to be processed,the temporary file 
    #         where all the processed data is stored, results directory where 
    #         all the templog files are present
    # Output: Generates a summary output file with all the processed data
    """
    col_st = 3 #column number of start time
    col_et = 4 #column number of end time
    col_rt = 5 #column number of response time
    col_ct = 6 #column number of total data length
    col_type = 7 #column number of url type
    read_time = []
    res_arr = []
    total_length = []
    url_type = []
    abs_start = 0
    RUreq = 0
    MTreq = 0
    RDreq = 0
    csvReader = csv.reader(temp_file) 
    sortedlist = sorted(csvReader, key=lambda row: int(row[1]))
    for row in sortedlist:
      read_time.append(float(row[col_et]))
      res_arr.append(float(row[col_rt]))
      total_length.append(int(row[col_ct]))
      url_type.append(int(row[col_type]))
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
      calculate_total_bytes(total_length)
      total_length.sort()
      len_arr = np.array(total_length)
      mean_len = np.mean(len_arr)
      url_count = Counter(url_type)
      print(str(file_cnt)+","+str(min_resp)+","+str(mean_resp)+","+str(percent95)+","+str(percent99)+","\
      +str(max_resp)+","+str(abs_start)+","+str(max(read_time))+","+str(RUreq)+","+str(MTreq)+","+str(RDreq)+","+str(len(res_arr))+","+\
      str(len(res_arr)/int(interval))+","+str(mean_len)+","+str(url_count[1])+","+str(url_count[2])+","+str(url_count[3])+","+str(total_bytes), file=temp_log)
    print(("[%s] Writing tempfile_[%d] data to summary file." % (util.get_current_time(), file_cnt)))
    temp_log.flush()

#function to calculate total bytes received during each sample run
def calculate_total_bytes(total_length_array):
    """
    # Desc  : function to calculate total bytes received during each run
    # Input : Array of length for each run
    # Output: Returns total bytes received for each run
    """
    global total_bytes
    respa = np.array(total_length_array)
    total_bytes = np.sum(total_length_array)

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

def post_process(temp_log,output_file,results_dir,interval,memlogfile,no_graph, concurrency):
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
  total_bytes_arr=[]
  abs_start =0
  print(("[%s] Post_process phase." % (util.get_current_time())))
  try:
    logfile = open(os.path.join(results_dir,temp_log), "r")
  except IOError as e:
    print(("Error: %s File not found." % temp_log))
    return None
  csvReader = csv.reader(logfile)
  try: 
     processed_filename = os.path.join(results_dir,output_file)
     processed_file = open(processed_filename, 'w')
  except IOError as e:
    print(("Error: %s Could not create file." % output_file))
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
      total_bytes_arr.append(float(row[17]))
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
  total_bytes_received = np.sum(total_bytes_arr)
  try: 
     throughput_filename = os.path.join(results_dir,"throughput_info.txt")
     throughput_file = open(throughput_filename, 'r')
  except IOError as e:
    print(("Error: %s Could not open file." % throughput_filename))
    return None
  for line in throughput_file:
    if "Throughput" in line:
      throughput = line.strip('\n').split(':')[1]
  throughput_file.close()
  print("\n====Report Summary====")
  print("Primary Metrics:")
  print('Response time 99 percentile = ' + str(round(percent99,3)) +" sec")
  print('Throughput = ' + str(throughput) + " req/sec")
  print('Concurrency = ' + str(concurrency))
  print("\n====Report Summary====", file=processed_file)
  print("Primary Metrics:", file=processed_file)
  print('Throughput = ' + str(throughput)+" req/sec", file=processed_file)
  print('99 percentile = ' + str(round(percent99,3)) +" sec", file=processed_file)
  print("--------------------------------------\n")
  print("Detailed summary:", file=processed_file)
  print('Min Response time = ' + str(round(minimum,3)) +" sec", file=processed_file)
  print('Mean Response time = ' + str(round(mean,3)) +" sec", file=processed_file)
  print('Max Response time = ' + str(round(maximum,3)) +" sec", file=processed_file)
  print('95 percentile = ' + str(round(percent95,3)) +" sec", file=processed_file)
  print('Total bytes recieved = ' + str(total_bytes_received) +" bytes", file=processed_file)
  print(("[%s] Post processing is done.\n" % (util.get_current_time())))
  processed_file.flush()

  if not no_graph:
    import matplotlib
    matplotlib.use(matplotlib.get_backend())
    import matplotlib.pyplot as plt

    #plot graphs. Plots three graphs, latency graph, throughput graph and a memory usage graph. These files are stored in the result directory  
    print(("[%s] Plotting graphs." % (util.get_current_time())))
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
    print(("The response-time graph is located at  " +os.path.abspath(os.path.join(results_dir,'resptime.png'))))

    plt.figure("Throughput")
    plt.grid(True)
    plt.plot(write_arr,throughput_arr, linewidth=2, linestyle='-', marker='.', color='r', label='throughput')
    plt.title('Throughput')
    plt.ylabel('Throughput in req/s')
    plt.xlabel('Time in s')
    plt.legend(loc=9, bbox_to_anchor=(0.5, -0.1),ncol=1,prop={'size':10})
    plt.tight_layout(pad=3)
    plt.savefig(os.path.join(results_dir, 'throughput.png')) 
    print(("\nThe throughput graph is located at  " +os.path.abspath(os.path.join(results_dir,'throughput.png'))))

    if os.path.exists(os.path.join(results_dir,memlogfile+".csv")):
      with open(os.path.join(results_dir,memlogfile+".csv")) as f:
        reader=csv.reader(f, delimiter=',')
        write_arr, rss_values, heapTotal_values, heapUsed_values = list(zip(*reader))
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
        print(("\nThe memory usage graph is located at  " +os.path.abspath(os.path.join(results_dir,'memory_usage.png'))))
    print(("[%s] Plotting graphs done." % (util.get_current_time())))
  
def process_time_based_output(results_dir,interval,rampup_rampdown,request,temp_log,output_file,memlogfile,instance_id,multiple_instance,no_graph, queue, concurrency):
    """
    # Desc  : Main function which handles all the Output Processing
    #         This function is run by the Child Function
    # Input : Results directory, interval for generating summary, time interval for 
    #         rampup-rampdown phase,time interval for MT phase, output summary file,
    #         memory logfile, instance ID, flag to check multiple instance run
    # Output: None
    """
    print(("[%s] Starting process for post processing." % (util.get_current_time())))
    process_tempfile(results_dir, interval, rampup_rampdown, request, temp_log,
                     instance_id, multiple_instance, queue)
    if multiple_instance:
      util.create_indicator_file(os.path.dirname(os.path.dirname(results_dir)),"done_processing", instance_id, "")
    # #Post Processing Function
    post_process(temp_log,output_file,results_dir,interval,memlogfile,no_graph, concurrency)
    print(("[%s] Exiting process for post processing." % (util.get_current_time())))
    sys.exit(0)
