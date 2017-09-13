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

import argparse
import sys
import os
import csv
import json
import matplotlib
matplotlib.use(matplotlib.get_backend())
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import time
from threading import Thread
import numpy as np
from itertools import izip

instances = ""
rundir = ""
min_arr = []
max_arr = []
mean_arr = []
percent99_arr = []
percent95_arr = []
write_arr = []
throughput_arr = []
ax2 = 0
ax1 = 0
min_response=[]
throughput_list=[]
alldone=False
addlegend=True
concurrency=0
processes=0	
throughput_list = []
elapsedtime_list = []
concurrency_list = []
processes_list = []

def read_syncfile():
	"""
  	#  Desc  : Function reads sync point files to create a list of summary filename of each instance
 	#  Input : None
  	#  Output: None
  	"""
	RTdatafile_list = []
	for i in range(1,int(instances)+1):
		process_filename = os.path.join(rundir,"start_processing"+str(i)+".syncpt")
		if os.path.exists(process_filename):
			with open(process_filename) as file:
				file_name = file.readline()
				RTdatafile_list.append(file_name)
		else:
			print "File not found.Exiting run" +str(process_filename)
			sys.exit(1)
	process_summary(RTdatafile_list)

def process_summary(RTdatafile_list):
	"""
  	#  Desc  : Function processes summary data from each instance
 	#  Input : List of summary data files
  	#  Output: None
  	"""
	global min_arr
	global max_arr
	global mean_arr
	global percent99_arr
	global percent95_arr
	global write_arr
	global alldone
	global throughput_arr
	while True:
		min_samplelogs = 0
		RTdata_dict = {}
		for i in range(1,int(instances)+1):
			if os.path.exists(RTdatafile_list[i-1]):
				with open(RTdatafile_list[i-1]) as file:
					csvReader = csv.reader(file) 
					j = 0
					RTdata_dict[i] = {}
					for row in csvReader: 	
						if row[0].isdigit():
							RTdata_dict[i][j] = row[1:]
							j = j+1
					file.close()
					if min_samplelogs == 0:
						min_samplelogs = j
					elif j < min_samplelogs:
						min_samplelogs = j

			else:
				print "File not found %s", RTdatafile_list[i-1]
				sys.exit(1)
		min_arr=calculate_minresp(RTdata_dict,min_samplelogs)
		mean_arr=calculate_meanresp(RTdata_dict,min_samplelogs)
		percent95_arr=calculate_95percentileresp(RTdata_dict,min_samplelogs)
		percent99_arr=calculate_99percentileresp(RTdata_dict,min_samplelogs)
		max_arr=calculate_maxresp(RTdata_dict,min_samplelogs)
		throughput_arr=calculate_throughput(RTdata_dict,min_samplelogs)
		write_arr=list(range(0, int(min_samplelogs), 1))
		for i in range(1,int(instances)+1):
			if os.path.exists(os.path.join(rundir,"done_processing"+str(i)+".syncpt")):
				post_process_done=True
			else:
				post_process_done=False
		if post_process_done:
			throughput_total=print_throughput_summary(RTdatafile_list)
			print_summary(min_arr,mean_arr,percent95_arr,percent99_arr,max_arr,throughput_total)
			if not no_graph:
				alldone=True 
				thread_latency.join() 
				plot_respgraph(min_arr,mean_arr,max_arr,percent95_arr,percent99_arr,write_arr)
				plot_throughputgraph(throughput_arr,write_arr)
			break

def show_live_graph():
	"""
  	#  Desc  : Function creates live latency and throughput graph
 	#  Input : None
  	#  Output: None
  	"""
	global ax1 
	global ax2   
	print ("[%s] Plotting live graphs." % (time.strftime("%d-%m-%Y %H:%M:%S")))        
	fig = plt.figure()         
	ax1 = fig.add_subplot(1,1,1)
	ax2 = ax1.twinx()
	ani = animation.FuncAnimation(fig, animate, interval=1000)
	plt.show()

def animate(i):
	"""
  	#  Desc  : Function creates live latency and throughput graph
 	#  Input : None
  	#  Output: None
  	"""
	global alldone
	global addlegend
	xar = []
	minyar = []
	maxyar = []
	meanyar = []
	percent95_yar =[]
	percent99_yar =[]
	throughput_yar =[]
	if (alldone == True):
		print ("[%s] Plotting live graphs done." % (time.strftime("%d-%m-%Y %H:%M:%S")))
		plt.close()
	else:
		for i in range(len(write_arr)):
			xar.append(write_arr[i])
		for i in range(len(min_arr)):
			minyar.append(min_arr[i])
		ax1.plot(xar,minyar,'b',label='min-response',linewidth=2,marker='o')
		for i in range(len(max_arr)):
			maxyar.append(max_arr[i])
		ax1.plot(xar,maxyar,'g',label='max-response',linewidth=2,marker='o')
		for i in range(len(mean_arr)):
			meanyar.append(mean_arr[i])
		ax1.plot(xar,meanyar,'r',label='mean-response',linewidth=2,marker='o')
		for i in range(len(percent95_arr)):
			percent95_yar.append(percent95_arr[i])
		ax1.plot(xar,percent95_yar,'c',label='95percentile-response',linewidth=2,marker='o')
		for i in range(len(percent99_arr)):
			percent99_yar.append(percent99_arr[i])
		ax1.plot(xar,percent99_yar,'m',label='99percentile-response',linewidth=2,marker='o')
		for i in range(len(throughput_arr)):
			throughput_yar.append(throughput_arr[i])
		ax2.plot(xar,throughput_yar,'y',label='Throughput',linewidth=2,marker='o')
		if addlegend:
			ax1.legend(loc=2, frameon=False, fontsize=12)
			ax2.legend(loc=0, frameon=False, fontsize=12)
			ax1.legend(loc='upper center', bbox_to_anchor=(0.5, -0.05),fancybox=True, shadow=True, ncol=5, prop={'size':11})
			ax2.legend(loc='center left', bbox_to_anchor=(1, 1),fancybox=True, shadow=True, ncol=2, prop={'size':11})
			addlegend=False

def calculate_minresp(RTdata_dict,min_samplelogs):
	"""
  	#  Desc  : Function calculates average minimum response time for each instance
 	#  Input : Dictionary with processed data from each instance, Minimum number of samples that has been processed
  	#  Output: Returns average minimum-response-time for all the instances
  	"""
  	min_avglist = []
	for i in range(0,min_samplelogs):
		min_local_list = []
		ignore_minvalue = False
		min_avg = 0
		local_instances = 0
		for key in RTdata_dict:
			if i in RTdata_dict.get(key, {}):
				min_local_list.append(float(RTdata_dict[key][i][0]))
			else:
				ignore_minvalue = True
		if ignore_minvalue == False:
			min_avg = min(min_local_list)
			min_avglist.append(min_avg)
	return min_avglist

def calculate_maxresp(RTdata_dict,min_samplelogs):
	"""
  	#  Desc  : Function calculates average maximum-response-time for each instance
 	#  Input : Dictionary with processed data from each instance, Minimum number of samples that has been processed
  	#  Output: Returns average maximum-response-time list for all the instances
  	"""
  	max_avglist = []
	for i in range(0,min_samplelogs):
		max_local_list = []
		ignore_maxvalue = False
		max_avg = 0
		local_instances = 0
		for key in RTdata_dict:
			if i in RTdata_dict.get(key, {}):
				max_local_list.append(float(RTdata_dict[key][i][4]))
			else:
				ignore_maxvalue = True
		if ignore_maxvalue == False:
			max_avg = max(max_local_list)
			max_avglist.append(max_avg)
	return max_avglist

def calculate_meanresp(RTdata_dict,min_samplelogs):
	"""
  	#  Desc  : Function calculates average mean-response-time for each instance
 	#  Input : Dictionary with processed data from each instance, Minimum number of samples that has been processed
  	#  Output: Returns average mean-response-time list for all the instances
  	"""
	mean_avglist = []
	mean_local_list = []
	for i in range(0,min_samplelogs):
		mean_avg = 0
		local_instances = 0
		ignore_meanvalue = False
		for key in RTdata_dict:
			if i in RTdata_dict.get(key, {}):
				mean_local_list.append(float(RTdata_dict[key][i][1]))
			else:
				ignore_meanvalue = True
		if ignore_meanvalue == False:
			sortmarr = sorted(mean_local_list)
			npmean_arr =np.array(sortmarr)
			mean_avg = np.mean(npmean_arr)
			mean_avglist.append(mean_avg)
	return mean_avglist

def calculate_95percentileresp(RTdata_dict,min_samplelogs):
	"""
  	#  Desc  : Function calculates 95percentile-response-time for each instance
 	#  Input : Dictionary with processed data from each instance, Minimum number of samples that has been processed
  	#  Output: Returns average 95percentile-response-time list for all the instances
  	"""
	percentile95_avglist = []
	for i in range(0,min_samplelogs):
		percentile95_total = 0
		local_instances = 0
		ignore_percentile95 = False
		for key in RTdata_dict:
			if i in RTdata_dict.get(key, {}):
				local_instances = local_instances+1
				percentile95_total = percentile95_total + float(RTdata_dict[key][i][2])
			else:
				ignore_percentile95 = True
		if ignore_percentile95 == False:
			percentile95_avg = percentile95_total/local_instances
			percentile95_avglist.append(percentile95_avg)
	return percentile95_avglist

def calculate_99percentileresp(RTdata_dict,min_samplelogs):
	"""
  	#  Desc  : Function calculates 99percentile-response-time for each instance
 	#  Input : Dictionary with processed data from each instance, Minimum number of samples that has been processed
  	#  Output: Returns average 99percentile-response-time list for all the instances
  	"""
	percentile99_avglist = []
	for i in range(0,min_samplelogs):
		percentile99_total = 0
		local_instances = 0
		ignore_percentile99 = False
		for key in RTdata_dict:
			if i in RTdata_dict.get(key, {}):
				local_instances = local_instances+1
				percentile99_total = percentile99_total + float(RTdata_dict[key][i][3])
			else:
				ignore_percentile99 = True
		if ignore_percentile99 == False:
			percentile99_avg = percentile99_total/local_instances
			percentile99_avglist.append(percentile99_avg)
	return percentile99_avglist

def calculate_throughput(RTdata_dict,min_samplelogs):
	"""
  	#  Desc  : Function calculates average throughput for each instance
 	#  Input : Dictionary with processed data from each instance, Minimum number of samples that has been processed
  	#  Output: Returns average throughput list for all the instances
  	"""
	throughput_avglist = []
	for i in range(0,min_samplelogs):
		throughput_total = 0
		local_instances = 0
		ignore_throughput = False
		for key in RTdata_dict:
			if i in RTdata_dict.get(key, {}):
				local_instances = local_instances+1
				throughput_total = throughput_total + float(RTdata_dict[key][i][11])
			else:
				ignore_throughput = True
		if ignore_throughput == False:
			throughput_avg = throughput_total/local_instances
			throughput_avglist.append(throughput_avg)
	return throughput_avglist

def print_throughput_summary(RTdatafile_list):
	"""
  	#  Desc  : Function calculates summary throughput for each instance
 	#  Input : Dictionary with processed data from each instance
  	#  Output: Returns summary throughput list for all the instances
  	"""
	global throughput_list
	global elapsedtime_list
	global concurrency_list
	global processes_list
	global concurrency
	global processes
	for i in range(0,int(instances)):
		throughput_filename = os.path.join(os.path.dirname(RTdatafile_list[i]),"throughput_info.txt")
		if os.path.exists(throughput_filename):
			with open(throughput_filename) as throughput_file:
				for line in throughput_file:
					if "Throughput" in line:
						throughput = line.strip('\n').split(':')[1]
						throughput_list.append(throughput)
					if "Elapsed time" in line:
						elapsed_time = line.strip('\n').split(':')[1]
						elapsedtime_list.append(elapsed_time)
					if "Concurrency" in line:
						concurrency = line.strip('\n').split(':')[1]
						concurrency_list.append(concurrency)
					if "processess" in line:
						processes = line.strip('\n').split(':')[1]
						processes_list.append(processes)
				throughput_file.close()
		else:
			print "File not found " +str(throughput_filename)
	return throughput_list

def plot_respgraph(min_arr,mean_arr,max_arr,percent95_arr,percent99_arr,write_arr):
  """
  #  Desc  : Function plots summary response time graph
  #  Input : response time lists
  #  Output: generates summary response time graph
  """
  print ("[%s] Plotting Response time graphs." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  plt.figure("Response Time")
  plt.grid(True)
  plt.plot(write_arr,min_arr, linewidth=1, linestyle='-', marker='.', color='b', label='Min resp')
  plt.plot(write_arr,mean_arr, linewidth=1, linestyle='-', marker='.', color='y', label='Mean Resp')
  plt.plot(write_arr,percent95_arr, linewidth=1, linestyle='-', marker='.', color='m', label='95 percentile')
  plt.plot(write_arr,percent99_arr, linewidth=1, linestyle='-', marker='.', color='r', label='99 percentile')
  plt.plot(write_arr,max_arr, linewidth=1, linestyle='-', marker='.', color='g', label='Max Resp')

  plt.title('Response time')
  plt.ylabel('Response time in s')
  plt.xlabel('Time in s')
  plt.legend(loc=9, bbox_to_anchor=(0.5, -0.1),ncol=5,prop={'size':10})
  plt.tight_layout(pad=3)
  plt.savefig(os.path.join(rundir, 'resptime.png'))
  print("The response-time graph is located at  " +os.path.abspath(os.path.join(rundir,'resptime.png')))

def plot_throughputgraph(throughput_arr,write_arr):
  """
  #  Desc  : Function plots summary throughput graph
  #  Input : response time lists
  #  Output: generates summary throughput graph
  """
  print ("[%s] Plotting Throughput graph." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  plt.figure("Throughput")
  plt.grid(True)
  plt.plot(write_arr,throughput_arr, linewidth=2, linestyle='-', marker='.', color='r', label='throughput')
  plt.title('Throughput')
  plt.ylabel('Throughput in req/s')
  plt.xlabel('Time in s')
  plt.legend(loc=9, bbox_to_anchor=(0.5, -0.1),ncol=1,prop={'size':10})
  plt.tight_layout(pad=3)
  plt.savefig(os.path.join(rundir, 'throughput.png')) 
  print("\nThe throughput graph is located at  " +os.path.abspath(os.path.join(rundir,'throughput.png')))

def print_summary(min_arr,mean_arr,percent95_arr,percent99_arr,max_arr,throughput_total):
	"""
  	#  Desc  : function prints summary metrics for all instances
 	#  Input : throughput and response time lists
  	#  Output: prints throughput and response time summary for all the instances
  	"""
	print ("[%s] Printing summary." % (time.strftime("%d-%m-%Y %H:%M:%S")))
	minimum = min(min_arr)
	maximum = max(max_arr)
	sortmarr = sorted(mean_arr)
	npmean_arr =np.array(sortmarr)
	mean = np.mean(npmean_arr)
	sortarr99 = sorted(percent99_arr)
	nparr_99 = np.array(sortarr99)
	percent99 = np.mean(nparr_99)
	sortarr95 = sorted(percent95_arr)
	nparr_95 = np.array(sortarr95)
	percent95 = np.mean(nparr_95)
	throughput = sum(float(i) for i in throughput_total)
	summary_file_name = os.path.join(rundir,"master_summary.txt")
	with open(summary_file_name, 'wb') as summary_file:
		print >> summary_file, "Number of instances:" +str(instances)
		print >> summary_file, "Concurrency:"+str(concurrency)
		print >> summary_file, "Number of processes per instance:"+str(processes) 
		print >> summary_file, "\n====Report Summary===="
		print >> summary_file, "Primary Metrics:"
		print >> summary_file, 'Response time 99 percentile = ' + str(round(percent99,3)) +" sec"
		print >> summary_file, 'Throughput = ' + str(throughput) + " req/sec"
		print >> summary_file, "\n====Detailed summary====:"
		print >> summary_file, 'Min Response time = ' + str(round(minimum,3)) +" sec"
		print >> summary_file, 'Mean Response time = ' + str(round(mean,3)) +" sec"
		print >> summary_file,'Max Response time = ' + str(round(maximum,3)) +" sec"
		print >> summary_file, '95 percentile = ' + str(round(percent95,3)) +" sec"
		print >> summary_file, "\n====Instance summary===="
		writer = csv.writer(summary_file)
		writer.writerow(["Instance#", "Concurrency", "#Processes", "Tot_ElapsedTime", "Throughput"])
		writer.writerows(izip(list(range(1, int(instances)+1, 1)), concurrency_list,processes_list,elapsedtime_list,throughput_list))
		#print summary_file.read()
	summary_report_file = os.path.join(rundir,"master_RTdata")
	with open(summary_report_file, 'wb') as summary_file:
		writer = csv.writer(summary_file)
		writer.writerow(["Number", "Min-avg", "Mean-avg", "95percentile-avg", "99percentile-avg", "Max-avg", "Throughput-avg"])
		writer.writerows(izip(write_arr,min_arr,mean_arr,percent95_arr,percent99_arr,max_arr,throughput_arr)) 

if __name__ == '__main__':
	no_graph = False
	parser = argparse.ArgumentParser()
	parser.add_argument('-i', '--instances', dest="instances",
                  help='Total instances')
	parser.add_argument('-dir', '--directory', dest="rundir",
                  help='Run directory')
	parser.add_argument('-ng', '--nograph', action="store_true",
                  help='Show graph option')
	options = parser.parse_args()
	if((not options.instances) or (not options.rundir)):
		print "Required fields missing in multiple instance post process file.Post processing failed"
		sys.exit(1)
	instances = options.instances
	rundir = options.rundir
	if(options.nograph):
		no_graph = options.nograph
	if not no_graph:
		thread_latency = Thread(target = show_live_graph)
		thread_latency.start()
	read_syncfile()


