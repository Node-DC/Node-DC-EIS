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
import json
import os
import subprocess
import csv
import sys
import re
import numpy as np
import random
from random import seed, shuffle
import eventlet
requests = eventlet.import_patched('requests.__init__')
import requests
import glob
import time
import traceback
from urlparse import urlparse
from urlparse import urlsplit
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from collections import OrderedDict 
from collections import Counter
from datetime import datetime
from urllib import urlencode
import shutil
import math
import zipfile
import platform
from itertools import izip
from threading import Thread

#globals
version = "NODE-DC-EISv0.9"
appName = "cluster"
order = "sequential"
debug = 1
iseed = 1
temp_log = "templog"
request = 10000
concurrency = 10
rampup_rampdown = 10
total_urls = 100
server_ipaddress = "localhost"
server_port = "8000"
urllist= []
i = datetime.now() 
directory = i.strftime('%H-%M-%S_%m-%d-%Y')
output_file = str(directory + '-result.txt')
idmatches_index = 0
postid_index = 0
requests_done = False
memstat_interval = 3
memlogfile = "memlog_file"
#default set to 1. Set it to 0 if ramp up rampdown phase is not required
ramp = 1
phase = "MT" 

#Various end points
server_root_endpoint = "/"
loaddb_endpoint  = "loaddb"
id_endpoint      = "employees/id"
name_endpoint    = "employees/name"
zipcode_endpoint = "employees/zipcode"
post_url         = "employees/post"
meminfo_endpoint = "getmeminfo"
cpuinfo_endpoint = "getcpuinfo"
checkdb_endpoint = "checkdb"

#Various urls
server_url = "http://" + server_ipaddress + ":" + server_port + server_root_endpoint
loaddb_url = server_url + loaddb_endpoint
id_url = server_url + id_endpoint
name_url = server_url + name_endpoint
zipcode_url = server_url + zipcode_endpoint
meminfo_url = server_url + meminfo_endpoint
cpuinfo_url = server_url + cpuinfo_endpoint
checkdb_url = server_url + checkdb_endpoint

### URL ratio (% of total urls - make sure this adds upto 100)
idurl_ratio = 50
nameurl_ratio = 25
zipurl_ratio = 25

#DBparamaters
dbrecord_count = 10000
#Records with at least 25 unique zipcodes and names
name_dbratio = 25
zip_dbratio = 25

#URL parameters
get_ratio = 100 
post_ratio = 0
delete_ratio = 0

#validation parameters
after_dbload = {}
after_run = {}
id_count = 0
name_count = 0
zip_count = 0
count = 0
post_count = 0
delete_count = 0
tot_get = 0
tot_post = 0
tot_del = 0

#read contents of the main file
execfile("./node_dc_eis_testurls.py")
results_dir = "results_node_DC_EIS"

#Creates a run/log directory which contains all the result files
def setup():
  global appName
  global directory
  try:
    r = requests.get(cpuinfo_url)
  except requests.exceptions.RequestException as e:
    #catastrophic error. bail.
    print e
    print("CPU call failed.Exiting")
    sys.exit(1)
  if(r.content):
    try:
      result = json.loads(r.content)
    except ValueError:
    # decoding failed
      print "Exception -- Decoding of result from cpuinfo failed. Exiting"
      exit(1)
  if result:
    if 'appName' in result:
      appName = result["appName"]
  print "Starting "+version + " in "+appName + " Mode"
  print ("[%s] Setting up log directory." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  if not os.path.exists(results_dir):
      os.makedirs(results_dir)
  if not os.path.exists(os.path.join(results_dir,directory)):
      directory = directory+"-"+appName
      os.makedirs(os.path.join(results_dir, directory))
    
#parse command line arguments
def arg_parse():
  global output_file
  print ("[%s] Parsing arguments." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  parser = argparse.ArgumentParser()
  parser.add_argument('-o', '--output', dest="output_filename",help='The output file name')
  parser.add_argument('-f', '--config',dest="config",action="store",help='The configuration file to be used')
  parser.add_argument('-n','--request',dest="request",action="store",help='Number of requests to perform')
  parser.add_argument('-c','--concurrency',dest="concurrency",action="store",help='Number of multiple requests to perform')
  parser.add_argument('-t','--templogfile',dest="templogfile",action="store",help='The temporary log file to be used')
  parser.add_argument('-W','--rampup_rampdown',dest="rampup_rampdown",action="store",help='Number of rampup-rampdown requests to perform')
  parser.add_argument('-idr','--idurl_ratio',dest="idurl_ratio",action="store",help='The percentage of ID urls to be loaded in URL file')
  parser.add_argument('-nur','--nameurl_ratio',dest="nameurl_ratio",action="store",help='The percentage of name urls to be loaded in URL file')
  parser.add_argument('-zur','--zipurl_ratio', dest="zipurl_ratio",action="store",help='The percentage of zip urls to be loaded in URL file')
  parser.add_argument('-dbc','--dbcount',dest="dbcount",action="store",help='The record count to load database')
  parser.add_argument('-nr','--name_dbratio',dest="name_dbratio",action="store",help='The name ratio')
  parser.add_argument('-zr','--zip_dbratio',dest="zip_dbratio",action="store",help='The zip ratio')
  parser.add_argument("-or", "--order", dest="order",  help="order of requests. Either \"shuffled\" or \"sequential\"", default="shuffled")
  parser.add_argument("-d", "--debug", dest="debug", help="Debug output", default=1, type=int)
  options = parser.parse_args()
  
  print('Input options config files: %s' % options.config)
 
  if(options.output_filename):
    output_file = options.output_filename

  #parse configuration file
  if(options.config) :
    try:   
      with open(options.config) as json_file:
        try:
          json_data = json.load(json_file)
        except ValueError as e:
          print('Invalid json: %s' % e)
          return None

        global server_ipaddress
        global server_port
        global server_root_endpoint
        global request
        global concurrency
        global rampup_rampdown
        global url_file
        global temp_log
        global total_urls
        global dbrecord_count
        global idurl_ratio
        global nameurl_ratio
        global zipurl_ratio
        global zip_dbratio
        global name_dbratio
        global url
        global ramp
        global get_ratio
        global post_ratio
        global delete_ratio
        global loaddb_url
        global id_url 
        global name_url 
        global zipcode_url 
        global server_url
        global memstat_interval
        global memlogfile
        global meminfo_url
        global cpuinfo_url
        global checkdb_url
        #parse config file to replace global variables with values in the file
        if "client_params" in json_data:
          if "request" in json_data["client_params"]:
            request = json_data["client_params"]["request"]

          if "concurrency" in json_data["client_params"]:
            concurrency = json_data["client_params"]["concurrency"]

          if "rampup_rampdown" in json_data["client_params"]:
            rampup_rampdown = json_data["client_params"]["rampup_rampdown"]
            if(not int(rampup_rampdown) == 0):
              ramp = 1

          if "server_ipaddress" in json_data["client_params"]:
            server_ipaddress = json_data["client_params"]["server_ipaddress"]

          if "server_port" in json_data["client_params"]:
            server_port = json_data["client_params"]["server_port"]

          if "root_endpoint" in json_data["client_params"]:
            server_root_endpoint = json_data["client_params"]["root_endpoint"]

          #client config paramaters
          if "idurl_ratio" in json_data["client_params"]:
            idurl_ratio = json_data["client_params"]["idurl_ratio"]

          if "nameurl_ratio" in json_data["client_params"]:
            nameurl_ratio = json_data["client_params"]["nameurl_ratio"]

          if "zipurl_ratio" in json_data["client_params"]:
            zipurl_ratio = json_data["client_params"]["zipurl_ratio"]
  
          if "url_file" in json_data["client_params"]:
            url_file = json_data["client_params"]["url_file"]

          if "tempfile" in json_data["client_params"]:
            temp_log= json_data["client_params"]["tempfile"]

          if "total_urls" in json_data["client_params"]:
            total_urls = json_data["client_params"]["total_urls"]
     
        #database setup parameters
        if "db_params" in json_data:
          if "dbrecord_count" in json_data["db_params"]:
            dbrecord_count = json_data["db_params"]["dbrecord_count"]

          if "name_ratio" in json_data["db_params"]:
            name_dbratio = json_data["db_params"]["name_ratio"]

          if "zip_ratio" in json_data["db_params"]:
            zip_dbratio = json_data["db_params"]["zip_ratio"]
            
        #URL setup paramaters
        if "url_params" in json_data:
          if "get_ratio" in json_data["url_params"]:
            get_ratio = json_data["url_params"]["get_ratio"]

          if "post_ratio" in json_data["url_params"]:
            post_ratio = json_data["url_params"]["post_ratio"]

          if "delete_ratio" in json_data["url_params"]:
            delete_ratio = json_data["url_params"]["delete_ratio"]

        #memory stat paramaters
        if "memory_params" in json_data:
          if "memstat_interval" in json_data["memory_params"]:
            memstat_interval = json_data["memory_params"]["memstat_interval"]

          if "memlogfile" in json_data["memory_params"]:
            memlogfile = json_data["memory_params"]["memlogfile"]

    except IOError as e:
      print("Error: %s File not found." % options.config)
      return None
  
  
  if(options.request) :
    request = options.request
  if(options.concurrency) :
    concurrency = options.concurrency
  if(options.rampup_rampdown) :
    rampup_rampdown = options.rampup_rampdown
    ramp = 1
  if(options.templogfile) :
    temp_log = options.templogfile
  if(options.dbcount) :
    dbrecord_count = options.dbcount
  if(options.idurl_ratio) :
    idurl_ratio = options.idurl_ratio
  if(options.nameurl_ratio) :
    nameurl_ratio = options.nameurl_ratio
  if(options.zipurl_ratio) :
    zipurl_ratio = options.zipurl_ratio
  if(options.name_dbratio) :
    name_dbratio = options.name_dbratio
  if(options.zip_dbratio) :
    zip_dbratio = options.zip_dbratio
  if(options.order) :
    order = options.order
  if(options.debug) :
    debug = options.debug
  server_url = "http://" + server_ipaddress + ":" + server_port + server_root_endpoint
  loaddb_url = server_url + loaddb_endpoint
  id_url = server_url + id_endpoint
  name_url = server_url + name_endpoint
  zipcode_url = server_url + zipcode_endpoint
  meminfo_url = server_url + meminfo_endpoint
  cpuinfo_url = server_url + cpuinfo_endpoint
  checkdb_url = server_url + checkdb_endpoint
  #Setup function, create logdir, etc
  setup()
 
  if int(concurrency) > int(request):
    print "Warning -- concurrency cannot be greater than number of requests. Setting concurrency == number of requests"
    concurrency = request

  #Build URL queue
  get_data()
 
  #global directory
  #directory="18:36:59_06-22-2016"
  #output_file="18:36:59_06-22-2016.csv"

  post_process(temp_log,output_file)

#prints all the environment details
def run_printenv(log):
  print >> log, ('Server url is : %s' % server_url)
  print >> log, "# requests    :"+ str(request) +"  (Default value = 10000)"
  print >> log, "# concurrency    :"+ str(concurrency) +"  (Default value = 200)"
  print >> log, "#  URLs  :" +str(total_urls) +"  (Default value = 100)"
  print >> log, "#  get url ratio:" + str(get_ratio) +"  (Default value = 80)"
  print >> log,"#  post url ratio:"+ str(post_ratio) +"  (Default value = 10)"
  print >> log, "#  delete url ratio:"+ str(delete_ratio)+"  (Default value = 10)"
  print >> log, "#  id_url:"+ str(idurl_ratio)  +"  (Default value = 50)"
  print >> log, "#  name url ratio:"+  str(nameurl_ratio) +"  (Default value = 25)"
  print >> log,"#  zip url ratio:"+  str(zipurl_ratio)+"  (Default value = 25)"
  print >> log, "====Database Parameters===="
  print >> log, "# records    :"+ str(dbrecord_count) +"  (Default value = 10000)"
  print >> log, "#  unique name:"  + str(name_dbratio) +"  (Default value = 25)"
  print >> log, "#  unique zips:"  + str(zip_dbratio) +"  (Default value = 25)"

#get IDS, names and zipcode depending on the ratio for IDs,names and zipcodes
def get_data():
  global employee_idlist
  #Populate database
  run_loaddb()

  print ("[%s] Build list of employee IDs." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  try:
    ids_get = requests.get(id_url)
  except requests.exceptions.RequestException as e:
    #catastrophic error. bail.
    print("Building list of employee ids failed.Exiting")
    print e
    sys.exit(1)
  ids = ids_get.content
  print ("[%s] Build list of employee IDs done." % (time.strftime("%d-%m-%Y %H:%M:%S")))

  print ("[%s] Build list of employee last names." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  try:
    names_get = requests.get(name_url)
  except requests.exceptions.RequestException as e:
    print("Building list of employee names failed.Exiting")
    exit(1)
  names = names_get.content
  print ("[%s] Build list of employee last names done." % (time.strftime("%d-%m-%Y %H:%M:%S")))

  print ("[%s] Build list of address zipcodes." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  try:
    zipcode_get = requests.get(zipcode_url)
  except requests.exceptions.RequestException as e:
    print("Building list of employee address zipcodes failed.Exiting")
    exit(1)
  zipcode= zipcode_get.content
  print ("[%s] Build list of address zipcode done." % (time.strftime("%d-%m-%Y %H:%M:%S")))

  if not ids and names and zipcode:
    print "Exception -- IDs or names or zipcodes not returned.Make sure application server is up and running.\n Make sure Database Server is up and running and \n Make sure client can communicate with server"
    exit(1)
  
  employee_idlist = re.findall(r'"([^"]*)"', ids)
  name_matches = re.findall(r'"([^"]*)"', names)
  s = zipcode.strip("\"[]\"")
  zip_matches = s.split(',')
  
  if not (int(get_ratio) + int(post_ratio) + int(delete_ratio) == 100) :
    print "Warning -- The get post and delete ratios don't add up to 100.Aborting the run"
    exit(1)
  
  if not(int(post_ratio) == int(delete_ratio)):
    print "Warning -- The post and delete ratios shoould be equal to maintain database consistency Aborting the run"

  #formula to find number of get post and delete urls
  get_urlcount = int(math.ceil((int(total_urls)*float(float(get_ratio)/100))))
  post_urlcount = int(math.ceil((int(total_urls)*float(float(post_ratio)/100))))
  delete_urlcount = int(math.ceil((int(total_urls)*float(float(delete_ratio)/100))))
  #formula to find number of urls with ID, last_name and zipcode
  id_number = int(math.ceil((int(get_urlcount)*float(float(idurl_ratio)/100))))
  name_number = int(math.ceil((int(get_urlcount)*float(float(nameurl_ratio)/100))))
  zip_number = int(math.ceil((int(get_urlcount)*float(float(zipurl_ratio)/100))))

  #start building the url list
  buildurllist(employee_idlist, id_number, name_matches, name_number , zip_matches, zip_number, post_urlcount,delete_urlcount)

  #Send requests
  send_request(employee_idlist)
  
  if order == "shuffled": 
    seed(iseed)
    shuffle(urllist)
 
#loads the database
def run_loaddb():
  global after_dbload
  print ("[%s] Loading database with %d records." % (time.strftime("%d-%m-%Y %H:%M:%S"), int(dbrecord_count)))
  print "In progress..."  
  loaddbparams = {'count': int(dbrecord_count), 'zipcode': int(zip_dbratio), 'lastname' : int(name_dbratio) }
  try:
    res = requests.get(loaddb_url, params=loaddbparams, timeout=300)
  except requests.exceptions.RequestException as e:
    #catastrophic error. bail.
    print e
    print("Loading database failed.Exiting")
    sys.exit(1)
  if ( res.status_code == requests.codes.ok ):
    print ("[%s] Loading database done." % (time.strftime("%d-%m-%Y %H:%M:%S")))
    after_dbload = check_db()
  else:
    print("Loading database failed with status code "+str(res.status_code)+". Exiting")
    sys.exit(1) 

#returns the total number of records in the database
def check_db():
  checkdb_dict = {}
  print ("[%s] Checking the number of records in the DB." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  checkdbparams = {'count': int(dbrecord_count)}
  try:
    res = requests.get(checkdb_url, params=checkdbparams)
  except requests.exceptions.RequestException as e:
    #catastrophic error. bail.
    print e
    print("Function Checkdb failed.Exiting")
    sys.exit(1)
  try:
    result = json.loads(res.content)
  except ValueError:
   #decoding failed
    print "Exception -- Decoding of result from checkdb failed. Exiting"
    exit(1)
  if("db_status" in result and "message" in result):
   if(result['db_status']==200):
    print ("[%s] Database consistent-DB record count okay." % (time.strftime("%d-%m-%Y %H:%M:%S")))
    checkdb_dict["message"] = result["message"]
   else:
    print ("[%s] Database inconsistent. DB record count mismatch." % (time.strftime("%d-%m-%Y %H:%M:%S")))
    checkdb_dict["message"] = result["message"]
  return checkdb_dict


#build the url list based on get, post and delete ratios and on ID, last name and zipcode ratios
#the urls are selected randomly so that there is a good mix of all types of URLS
def buildurllist(employee_idlist, id_number, name_matches, name_number , zip_matches, zip_number,post_urlcount,delete_urlcount):
  print ("[%s] Building list of Urls" % (time.strftime("%d-%m-%Y %H:%M:%S")))
  id_usedlist = []
  global id_count
  global name_count
  global zip_count
  global count
  global post_count
  global delete_count
  while(True):
      random_id = random.randint(0,len(employee_idlist)-1)
      random_name = random.randint(0,len(name_matches)-1)
      random_zip = random.randint(0,len(zip_matches)-1)
      random_delete = random.randint(0,delete_urlcount)
      
      if(id_count < id_number):
        urls = server_url + "employees/id/"
        urllist.append({'url':urls,'method':'GET'})
        id_count = id_count +1

      if(name_count < name_number):
        names = name_matches[random_name]
        urls = name_url + "?\"last_name=" + names +"\""
        urllist.append({'url':urls,'method':'GET'})
        name_count = name_count + 1

      if(zip_count < zip_number):
        zipcode = zip_matches[random_zip]
        urls = zipcode_url + "?zipcode=" + zipcode
        urllist.append({'url':urls,'method':'GET'})
        zip_count = zip_count + 1

      if(post_count < post_urlcount):
        post_url = server_url + "employees"
        urllist.append({'url':post_url,'method':'POST'})
        post_count = post_count + 1 

      if(delete_count < delete_urlcount):
        delete_url = server_url + "employees/id/"
        urllist.append({'url':delete_url,'method':'DELETE'})
        delete_count = delete_count + 1 
      count = id_count + name_count + zip_count + post_count + delete_count 
      if(count == int(total_urls)):
        break
  seed(iseed)
  shuffle(urllist)
  print ("[%s] Building list of Urls done." % (time.strftime("%d-%m-%Y %H:%M:%S")))

#prints rampup rampdown information and the progress of requests 
def print_ramp(request_index):
  global phase
  if request_index <= int(rampup_rampdown):
    phase = "RU"
    if request_index == 1:
       print ("[%s] Entering Rampup window" % (time.strftime("%d-%m-%Y %H:%M:%S")))
    if request_index == int(rampup_rampdown):
      print ("[%s] Exiting Rampup window" % (time.strftime("%d-%m-%Y %H:%M:%S")))
  elif (request_index - int(rampup_rampdown)) <= int(request):
    phase = "MT"
    if (request_index - int(rampup_rampdown)) == 1:
      print ("[%s] Entering Measuring time window" % (time.strftime("%d-%m-%Y %H:%M:%S"))) 
      print "In progress..."  
    if(request_index - int(rampup_rampdown)== 0.1*int(request)):
      print "10% of requests done"
    if(request_index - int(rampup_rampdown)== 0.2*int(request)):
      print "20% of requests done"
    if(request_index - int(rampup_rampdown)== 0.3*int(request)):
      print "30% of requests done"
    if(request_index - int(rampup_rampdown)== 0.4*int(request)):
      print "40% of requests done"
    if(request_index - int(rampup_rampdown)== 0.5*int(request)):
      print "50% of requests done"
    if(request_index - int(rampup_rampdown)== 0.6*int(request)):
      print "60% of requests done"
    if(request_index - int(rampup_rampdown)== 0.7*int(request)):
      print "70% of requests done"
    if(request_index - int(rampup_rampdown)== 0.8*int(request)):
      print "80% of requests done"
    if(request_index - int(rampup_rampdown)== 0.9*int(request)):
      print "90% of requests done"
    if (request_index - int(rampup_rampdown)) == int(request):
      print ("[%s] Exiting Measuring time window" % (time.strftime("%d-%m-%Y %H:%M:%S")))
  elif request_index - (int(rampup_rampdown)+int(request)) <= int(rampup_rampdown):
    phase = "RD"
    if request_index - (int(rampup_rampdown)+int(request)) == 1:
      print ("[%s] Entering Rampdown window" % (time.strftime("%d-%m-%Y %H:%M:%S")))
    if request_index - (int(rampup_rampdown)+int(request)) == int(rampup_rampdown):
      print ("[%s] Exiting Rampdown window" % (time.strftime("%d-%m-%Y %H:%M:%S")))

#get employee ID to make get or delete requests
def getNextEmployeeId(employee_idlist):
  global idmatches_index
  global postid_index
  if len(employee_idlist) > 0:
    if idmatches_index >= len(employee_idlist):
        idmatches_index = 0
    return_id = employee_idlist[idmatches_index]
    idmatches_index = idmatches_index + 1
  if not return_id:
    print "Fatal error-No more IDs available. Aborting"
    exit(1)
  return return_id

# function to delete IDs when a DELETE request is performed
def removeEmployeeId(ids,employee_idlist):
    id_found = False
    if len(employee_idlist) > 0:
        if ids in employee_idlist:
            employee_idlist.remove(ids)
            id_found = True
    if not id_found:
        print "Fatal error-No more IDs available. Aborting"
        exit(1)

#get memory information from the server
def print_meminfo():
  global requests_done
  rss_list =[]
  heapTotlist =[]
  heapUsedlist = []
  
  start_time = time.time()
  while True:
    if requests_done:
      break;
    try:
      r = requests.get(meminfo_url)
    except requests.exceptions.RequestException as e:
      #catastrophic error. bail.
      print e
      print("Meminfo call failed.Exiting")
      sys.exit(1) 
    try:
      result = json.loads(r.content)
    except ValueError:
    #decoding failed
      print "Exception -- Decoding of result from meminfo failed. Exiting"
      exit(1)
    if result and result["memoryInfo"]:
      if result["memoryInfo"]["rss"]:
        rss_list.append(result["memoryInfo"]["rss"])
      if result["memoryInfo"]["heapTotal"]:
        heapTotlist.append(result["memoryInfo"]["heapTotal"])
      if result["memoryInfo"]["heapUsed"]:
        heapUsedlist.append(result["memoryInfo"]["heapUsed"])
    time.sleep(float(memstat_interval))
  elapsed_time = time.time() - start_time
  with open(os.path.join(os.path.join(results_dir,directory),directory+"-"+memlogfile+".csv"), 'wb') as f:
    writer = csv.writer(f)
    writer.writerows(izip(list(range(0, int(elapsed_time), 1)),rss_list,heapTotlist,heapUsedlist))    

#send concurrent requests to the server using the urls generated 
# decides the type of the url depending on the method GET, POST or DELETE.
def send_request(employee_idlist):
  global after_run
  global phase
  global requests_done
  global tot_get
  global tot_post
  global tot_del
  print ("[%s] Sending requests" % (time.strftime("%d-%m-%Y %H:%M:%S")))
  pool = eventlet.GreenPool(int(concurrency))
  try:
    log = open(os.path.join(os.path.join(results_dir,directory),temp_log), "w")
  except IOError as e:
    print("Error: %s File not found." % temp_log)
    return None
  #Print environment 
  run_printenv(log)
  print >> log, "Mode,Request_num,URL,StartTime,EndTime,Response_time"
  url_index = 0
  if ramp:
    loop = int(request)+(2*int(rampup_rampdown))
  else:
    loop = int(request)
  thread = Thread(target = print_meminfo)
  thread.start()
  print ("[%s] Started processing of [%d] total requests with concurrency of [%d]" % (time.strftime("%d-%m-%Y %H:%M:%S"), int(request), int(concurrency)))
  for request_index in range(1, (loop+1)):
    try:
      if(url_index >= len(urllist)):
         url_index = 0  
      url = urllist[url_index]['url']
      
      parsed = urlparse(url)
      #check for rampup and rampdown requests
      if ramp:
         print_ramp(request_index)
      else:
        phase = "MT"
        if request_index == 1:
          print "Entering Measuring time window"
        if request_index == int(request):
          print "Exiting Measuring time window"
        
      if(urllist[url_index]['method']== 'GET'):
        url_type = 1
        tot_get = tot_get +1
        if not(parsed.path == "/employees/zipcode" or parsed.path == "/employees/name"):
            ids = getNextEmployeeId(employee_idlist)
            url = url+ids
      if(urllist[url_index]['method']== 'POST'):
        url_type = 2
        tot_post = tot_post +1
      if(urllist[url_index]['method']== 'DELETE'):
        url_type = 3
        tot_del = tot_del +1
        ids = getNextEmployeeId(employee_idlist)
        removeEmployeeId(ids,employee_idlist)
        url = url+ids
        
      #call main function with type and url
      if(int(concurrency) == 1):
        main_entry(url,request_index,url_type,log,phase)
      else:
        pool.spawn_n(main_entry,url,request_index,url_type,log,phase)
      url_index += 1
    except Exception, err:
      print Exception, err
      exit(1)
  requests_done = True
  pool.waitall()
  thread.join()
  print ("[%s] All requests done." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  after_run = check_db()
  log.close()

#post processing of log file to summarize the results. 
#Generates a summary output file which contains hardware,software OS and Client details
#Also gives MIN, MAX,MEAN response time, throughput, 99 percentile and error details of each run
def post_process(temp_log,output_file):
  abs_start = 0;
  col_st = 3; #column number of start time
  col_et = 4
  col_rt = 5; #column number of response time
  col_url = 2; #column number of url
  read_time = [] #list with elapsed time
  response_array = []
  url_array = []
  print ("[%s] Post_process phase." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  try:
    logfile = open(os.path.join(os.path.join(results_dir,directory),temp_log), "r")
  except IOError as e:
    print("Error: %s File not found." % temp_log)
    return None
  csvReader = csv.reader(logfile)
  try: 
     processed_filename = os.path.join(os.path.join(results_dir,directory),output_file)
     processed_file = open(processed_filename, 'w')
  except IOError as e:
    print("Error: %s Could not create file." % output_file)
    return None
  try:
    r = requests.get(cpuinfo_url)
  except requests.exceptions.RequestException as e:
    #catastrophic error. bail.
    print e
    print("CPU call failed.Exiting")
    sys.exit(1)
  if(r.content):
    try:
      result = json.loads(r.content)
    except ValueError:
    # decoding failed
      print "Exception -- Decoding of result from cpuinfo failed. Exiting"
      exit(1)
  if result:
    #hardware details 
    if result['hw']:
      print >> processed_file, "====Hardware Details===="
      if result['hw']['architecture']:
        architecture = result['hw']['architecture']
        print >> processed_file, "Architecture: " +str(architecture)
      if result['hw']['endianness']:
        endianness = result['hw']['endianness'] 
        print >> processed_file, "Endianness: " +str(endianness)
      if result['hw']['totalmem']:
        totalmem = result['hw']['totalmem'] 
        print >> processed_file, "Total memory: " +str(totalmem) +" bytes"
      if result['hw']['freemem']:
        freemem = result['hw']['freemem']
        print >> processed_file, "Free mempry available: " +str(freemem)+" bytes"
      if result['hw']['model']:
        model = result['hw']['model']
        print >> processed_file, "CPU model: " +str(model)
      if result['hw']['speed']:
        speed = result['hw']['speed'] 
        print >> processed_file, "CPU speed: " +str(speed) +" MHz"
      systime = result['hw']['sys'] 
      print >> processed_file, "Time spent in sys mode: " +str(systime) +" ms"
      idletime = result['hw']['idle'] 
      print >> processed_file, "Time spent in idle mode: " +str(idletime) +" ms"
      usertime = result['hw']['user'] 
      print >> processed_file, "Time spent in user mode: " +str(usertime) +" ms"
      irqtime = result['hw']['irq'] 
      print >> processed_file, "Time spent in irq mode: " +str(irqtime)+" ms"
      nice = result['hw']['nice']  
      print >> processed_file, "Time spent in nice mode: " +str(nice)+" ms"
    #software details
    if result['sw']:
      print >> processed_file, "\n====Operating System Details===="
      if result['sw']['platform']:
        platform = result['sw']['platform'] 
        print >> processed_file, "Operating System Platform: " +str(platform) 
      if result['sw']['release']:
        release = result['sw']['release']
        print >> processed_file, "Operating System Release: " +str(release)
      if result['sw']['uptime']:
        uptime = result['sw']['uptime'] 
        print >> processed_file, "System uptime: " +str(uptime)
      if result['sw']['type']:
        ostype = result['sw']['type'] 
        print >> processed_file, "Operating System type: " +str(ostype)
    #version details
    if result['version']:
      print >> processed_file, "\n====Version Details of Node.js and dependencies===="
      if result['version']['node']:
        node_ver = result['version']['node']
        print >> processed_file, "Node version: " +str(node_ver)
      if result['version']['zlib']:
        zlib_ver = result['version']['zlib'] 
        print >> processed_file, "Zlib version: " +str(zlib_ver)
      if result['version']['v8']:
        v8_ver = result['version']['v8']
        print >> processed_file, "V8 version: " +str(v8_ver)
      if result['version']['uv']:
        uv_ver = result['version']['uv'] 
        print >> processed_file, "UV version: " +str(uv_ver)
      if result['version']['http_parser']:
        http_parser_ver = result['version']['http_parser']
        print >> processed_file, "Http Parser version: " +str(http_parser_ver) 
      if result['version']['openssl']:
        openssl_ver = result['version']['openssl'] 
        print >> processed_file, "OpenSSL version: " +str(openssl_ver)
      if result['version']['ares']:
        ares_ver = result['version']['ares'] 
        print >> processed_file, "Ares version: " +str(ares_ver)
      if result['version']['modules']:
        modules_ver = result['version']['modules'] 
        print >> processed_file, "Modules version: " +str(modules_ver)
      if result['version']['icu']:
        icu_ver = result['version']['icu'] 
        print >> processed_file, "ICU version: " +str(icu_ver)
  print >> processed_file, "\n====Client information===="
  for row in csvReader:
    if "MT" in row[0]:
      sortedlist = sorted(csvReader, key=lambda row: int(row[1]))
      for i in range(len(sortedlist)):
        read_time.append(float(sortedlist[i][col_et])) 
        url_array.append(sortedlist[i][col_url])
        response_array.append(float(sortedlist[i][col_rt]))
        if(abs_start == 0):
          abs_start = float(sortedlist[0][col_st])
          continue    
    if ("Mode" not in row and "RU" not in row and "RD" not in row and "MT" not in row):
      print >> processed_file, row
  
  tot_lapsedtime = max(read_time) - abs_start
  if not tot_lapsedtime:
    throughput = 1
  throughput = float(int(request)/tot_lapsedtime)
  response_array.sort()
  respa = np.array(response_array)
  percent = np.percentile(respa, 99)
  minimum = np.amin(respa)
  maximum = np.amax(respa)
  mean = np.mean(respa)

  print "\n====Report Summary===="
  print "Primary Metrics:"
  print 'Response time 99 percentile = ' + str(round(percent,3)) + " " +version+" sec"
  print 'Throughput = ' + str(round(throughput,2)) + " " +version+ " req/sec"
  print "--------------------------------------\n"
  print >> processed_file, "\n====Report Summary===="
  print >> processed_file, "Primary Metrics:"
  print >> processed_file, 'Throughput = ' + str(round(throughput,2)) +" " +version+" req/sec"
  print >> processed_file, '99 percentile = ' + str(round(percent,3)) +" " +version+" sec"
  print >> processed_file, "\nDetailed summary:"
  print >> processed_file, 'Min Response time = ' + str(round(minimum,3)) +" " +version+" sec"
  print >> processed_file, 'Max Response time = ' + str(round(maximum,3)) +" " +version+ " sec"
  print >> processed_file, 'Mean Response time = ' + str(round(mean,3)) +" " +version+" sec"
  print >> processed_file, "\n====Validation and Error Summary===="
  print >> processed_file, "Timeout Error = " + str(timeout_err)
  print >> processed_file, "Connection Error = " + str(conn_err)
  print >> processed_file, "Http Error = " + str(http_err)
  print >> processed_file, "Bad Url Error = " + str(bad_url)
  print >> processed_file, "\n====Validation Report===="
  print >> processed_file, "Database Validation:"
  print >> processed_file, "Actual database record count: "+str(dbrecord_count)
  print >> processed_file, "Database record count after loadDB: "+str(after_dbload["message"])
  print >> processed_file, "Database record count after the run: " +str(after_run["message"])
  print >> processed_file, "--------------------------------------"
  print >> processed_file, "URL ratio Validation:"
  print >> processed_file, "Total number of urls generated: " +str(count)
  print >> processed_file, "Number of get urls generated: "+ str(int(id_count)+int(name_count)+int(zip_count)) +"  ("+str(get_ratio)+"% of "+str(count)+")"
  print >> processed_file, "    Number of get id urls generated: " +str(id_count) +"  ("+str(idurl_ratio)+"% of "+str(int(id_count)+int(name_count)+int(zip_count))+")"
  print >> processed_file, "    Number of get name urls generated: " +str(name_count) +"  ("+str(nameurl_ratio)+"% of "+str(int(id_count)+int(name_count)+int(zip_count))+")"
  print >> processed_file, "    Number of get zip urls generated: " +str(zip_count) +"  ("+str(zipurl_ratio)+"% of "+str(int(id_count)+int(name_count)+int(zip_count))+")"
  print >> processed_file, "Number of post urls generated: " +str(post_count) +"  ("+str(post_ratio)+"% of "+str(count)+")"
  print >> processed_file, "Number of delete urls generated: " +str(delete_count) +"  ("+str(delete_ratio)+"% of "+str(count)+")"
  print >> processed_file, "--------------------------------------"
  print >> processed_file, "Requests Validation:"
  print >> processed_file, "Total number of requests: " +str(int(request)+ (2*int(rampup_rampdown)))
  print >> processed_file, "Total number of get requests: " +str(tot_get)
  print >> processed_file, "Total number of post requests: " +str(tot_post)
  print >> processed_file, "Total number of delete requests: " +str(tot_del)
  

  logfile.close()
  processed_file.flush() 
  processed_file = open(processed_filename, "r")
  print processed_file.read()
  processed_file.close() 
  plot_graph(output_file)
  print ("[%s] Post processing is done.\n" % (time.strftime("%d-%m-%Y %H:%M:%S")))

# Function to plot graphs. Plots three graphs, latency graph, throughput graph and a memory usage graph. These files are stored in the result directory
def plot_graph(output_file):
  start_time = []
  response_time = []
  rps = []
  col_st = 3    #column number for start time
  col_rt = -1   #column number for response time
  abs_start = 0;
  tot_rq = 0;
  try:
    filehl = open(os.path.join(os.path.join(results_dir,directory),temp_log), "r")
  except IOError as e:
    print("Error: %s File not found." % temp_log)
    exit(1)

  print ("[%s] Plotting graphs." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  csvReader = csv.reader(filehl)
  for row in csvReader:
    if len(row) == 6 and row[1].isdigit():
      sortedlist = sorted(csvReader, key=lambda row: int(row[1]))
      for i in range(len(sortedlist)):
        abs_start = float(sortedlist[0][col_st])
        lapsed_time = float(sortedlist[i][col_st]) - abs_start
        if(lapsed_time == 0):
          continue
        tot_rq += 1
        response_time.append(float(sortedlist[i][col_rt]))
        start_time.append(lapsed_time)
        rps.append(tot_rq/lapsed_time)
  filehl.close()
  plt.figure("Latency")
  plt.grid(True)
  plt.xlabel('Elapsed Time in seconds')
  plt.ylabel('Response Time in seconds')
  plt.title('Latency')
  plt.plot(start_time, response_time, linewidth=1, linestyle='', marker='.', color='r', label='response time')
  plt.tight_layout()
  plt.savefig(os.path.join(os.path.join(results_dir,directory),directory+'-latency.png'))
  print("The latency graph is located at  " +os.path.abspath(os.path.join(os.path.join(results_dir,directory),directory+'-latency.png')))
  
  plt.figure("Throughput RPS")
  plt.grid(True)
  plt.xlabel('Elapsed Time in seconds')
  plt.ylabel('Throughput req/sec')
  plt.plot(start_time, rps, linewidth=1, linestyle='', marker='.', color='g', label='rps')
  plt.savefig(os.path.join(os.path.join(results_dir,directory), directory+'-rps_time.png'))
  print("\nThe throughput graph is located at  " +os.path.abspath(os.path.join(os.path.join(results_dir,directory),directory+'-rps_time.png')))

  if os.path.exists(os.path.join(os.path.join(results_dir,directory),directory+"-"+memlogfile+".csv")):
    with open(os.path.join(os.path.join(results_dir,directory),directory+"-"+memlogfile+".csv")) as f:
      reader=csv.reader(f, delimiter=',')
      time_axis, rss_values, heapTotal_values, heapUsed_values = zip(*reader)
      plt.figure("Memory usage")
      plt.grid(True)
      plt.plot(time_axis,rss_values, linewidth=1, linestyle='-', marker='.', color='r', label='rss')
      plt.plot(time_axis,heapTotal_values, linewidth=1, linestyle='-', marker='.', color='b', label='heapTotal')
      plt.plot(time_axis,heapUsed_values, linewidth=1, linestyle='-', marker='.', color='g', label='heapUsed')
      plt.title('Memory usage')
      plt.ylabel('Memory used in M')
      plt.xlabel('Time in s')
      plt.legend(loc=9, bbox_to_anchor=(0.5, -0.1),ncol=3)
      plt.tight_layout(pad=3)
      plt.savefig(os.path.join(os.path.join(results_dir,directory), directory+'-memory_usage.png'))
      print("\nThe memory usage graph is located at  " +os.path.abspath(os.path.join(os.path.join(results_dir,directory),directory+'-memory_usage.png')))
  print ("[%s] Plotting graphs done." % (time.strftime("%d-%m-%Y %H:%M:%S")))
  #zip the temp_log file
  temp_zip = zipfile.ZipFile(os.path.join(os.path.join(results_dir,directory),'temp_log.zip') , mode='w')
  temp_zip.write(os.path.join(os.path.join(results_dir,directory),temp_log))
  temp_zip.close()
  os.remove(os.path.join(os.path.join(results_dir,directory),temp_log))

arg_parse()
