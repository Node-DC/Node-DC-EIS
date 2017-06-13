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


#!/usr/bin/python

import json, time
import os
import urlparse
import re
from functools import partial
from eventlet.green import urllib2
from eventlet.green import socket
import eventlet
requests = eventlet.import_patched('requests.__init__')
import requests
from collections import OrderedDict 
import util

headers = {'content-type': 'application/json'}
post_datalist = []
employee_idlist = []
front_oflist = 0
init = False

##setup data for post request
static_postdata = {"employee" :   
                {"last_name":"Omar","email":"Grenfell23@example.com","first_name":"Grenfell","phone":"6126380368","updated_at":"2016-10-13T22:14:43.943Z","created_at":"2016-10-13T22:14:43.943Z","role":"regular"},
             "address" : 
                {"country" : "USA", "state" : "FL", "zipcode" : "10253","street" : "4286, SW Lane"},
             "compensation" : 
                {"stock" : "4739", "pay" : "521021"}, 
             "family": 
                {"childrens" : "1", "marital_status" : "true"}, 
             "health" : 
                {"paid_family_leave" : "true", "longterm_disability_plan" : "true", "shortterm_disability_plan" : "false"},
             "photo" : "1" }

#globals for error checking
timeout_err = 0
conn_err = 0
http_err = 0
bad_url = 0
s = requests.Session()
a = requests.adapters.HTTPAdapter(max_retries=20)
b = requests.adapters.HTTPAdapter(max_retries=20)
s.mount('http://', a)
s.mount('https://', b)

#globals to implement file optimization
start_time = 0
file_cnt = 0
log=""

ip_cache = {}
def get_ip(hostname):
  """
  # Desc  : Function to send get IP address.
  # Input : hostname of each request
  # Output: Returns IP for each address
  """
  if hostname in ip_cache:
    return ip_cache[hostname]

  try:
    ip = socket.gethostbyname(hostname)
  except socket.herror as e:
    print e
    sys.exit(1)
  ip_cache[hostname] = ip
  return ip

def get_url(url, request_num, log, phase, accept_header):
  """
  # Desc  : Function to send get requests to the server. Type 1 is get requests
  #         handles 3 types of GET requests based on ID, last_name and zipcode.
  # Input : Get request URL, Request Number, log file to collect per request data
  #          phase of each request(ramp-up, ramp-down, measuring-time)
  # Output: Generates per request (get) details in a log file
  """
  global timeout_err
  global conn_err
  global http_err
  global bad_url 

  urlo = urlparse.urlparse(url)
  ip = get_ip(urlo.hostname)
  start = time.time()

  query = ''
  if urlo.query != '':
    query = '?{}'.format(urlo.query)

  req_path = '{}{}'.format(urlo.path, query)

  req = '''GET {} HTTP/1.1
Host: {}
User-Agent: runspec/0.9
Accept: {}

'''.format(req_path, urlo.netloc, accept_header)

  try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(30)
    sock.connect((ip, urlo.port))
    sock.sendall(req)
    data = sock.recv(15)
    http_status = data[9:12]
    if http_status[0] != '3' or http_status[0] != '2':
      http_err += 1

  except socket.timeout:
    timeout_err += 1 
  except socket.error as e:
    conn_err += 1
  finally:
    sock.close()
    end = time.time()
    response_time = end - start
  util.printlog(log,phase,request_num,url,start,end,response_time)
  return 

def post_url(url,request_num,log,phase): 
  """
  # Desc  : Function to send post requests to the server. Type 2 is post requests
  #         also captures the ID that was posted and saves it in a list(employee_idlist)
  #         which is used in the ID list to send requests
  # Input : Post request URL, Request Number, log file to collect per request data
  #         phase of each request(ramp-up, ramp-down, measuring-time)
  # Output: Generates per request (post) details in a log file
  """
  global timeout_err
  global conn_err
  global http_err
  global bad_url 
  global employee_idlist
  global post_datalist

  if post_datalist:
    post_data = post_datalist[0]
  else:
    post_data = static_postdata
  try:
    start = time.time()
    r = s.post(url, headers=headers, data = json.dumps(post_data))
  except requests.exceptions.Timeout as e:
    timeout_err = timeout_err + 1 
  except requests.exceptions.ConnectionError as e:
    conn_err = conn_err + 1
  except requests.exceptions.HTTPError as e:
    http_err = http_err + 1
  except requests.exceptions.TooManyRedirects as e:
    bad_url = bad_url + 1 
  except requests.exceptions.RequestException as e:
    #catastrophic error. bail.
    print e
    sys.exit(1)
  finally:
    end = time.time()
    response_time = end-start
  try:
    result = json.loads(r.content) 
  except ValueError:
    # decoding failed
    print "Exception -- Decoding of result from posturl failed. Exiting"
    sys.exit(1)
  if result:
    if 'result' in result:
      employee_idlist.append(result['result']['employee_id'])
    else:
      print("Exception -- Post did not return a valid employee_id")
      print post_data
      sys.exit(1)
  util.printlog(log,phase,request_num,url,start,end,response_time)
  return 

def delete_url(url,request_num,log,phase): 
  """
  # Desc  : Function to send delete requests to the server. Type 3 is delete requests
  #         also captures the data record being deleted and saves it in a list(post/_datalist)
  #         which is used for new post requests
  # Input : Delete request URL, Request Number, log file to collect per request data
  #         phase of each request(ramp-up, ramp-down, measuring-time)
  # Output: Generates per request (delete) details in a log file
  """
  global timeout_err
  global conn_err
  global http_err
  global bad_url 
  global employee_idlist
  global post_datalist
  start = time.time()
  #1. issue a get request to get the record that is being deleted
  try:
    try:
      get_res = s.get(url, headers=headers)   
    except requests.exceptions.RequestException as e:
      #catastrophic error. bail.
      print e
      sys.exit(1)
    try:
      response = json.loads(get_res.content)
    except ValueError:
    # decoding failed
      print "Exception -- Decoding of result from getid for delete failed. Exiting"
      sys.exit(1)(1)
    if response:
      if 'employee' in response:
        post_datalist.insert(front_oflist,response)
    else:
      print "Warning : Record not found"
    start = time.time()
    r = s.delete(url, headers=headers)
  except requests.exceptions.Timeout as e:
    timeout_err = timeout_err + 1 
  except requests.exceptions.ConnectionError as e:
    conn_err = conn_err + 1
  except requests.exceptions.HTTPError as e:
    http_err = http_err + 1
  except requests.exceptions.TooManyRedirects as e:
    bad_url = bad_url + 1 
  except requests.exceptions.RequestException as e:
    #catastrophic error. bail.
    print e
    sys.exit(1)
  finally:
    end = time.time()
    response_time = end-start

  util.printlog(log,phase,request_num,url,start,end,response_time)
  return

def main_entry(url, request_num, url_type, log_dir, phase, interval,
               run_mode, temp_log, accept_header):
  """
  # Desc  : main entry function to determine the type of url - GET,POST or DELETE
  #         creates log file which captures per request data depending on the type of run.
  # Input : Get/post/delete request URL, Request Number, type of URL
  #         log directory, log file to collect per request data,
  #         phase of each request(ramp-up, ramp-down, measuring-time),
  #         the type of run (request-based ot time-based)
  # Output: None
  """
  global start_time
  global file_cnt
  global log
  global init
  if run_mode == 1:
    if not init:
      start_time=time.time();
      try:
          log = open(os.path.join(log_dir,"tempfile_"+str(file_cnt)),"w")
          init = True 
      except IOError:
          print ("[%s] Could not open templog file for writing." % (util.get_current_time()))
          sys.exit(1)
    if(time.time()-start_time > float(interval)):
      file_cnt +=1   
      start_time = time.time()
      try:
          log = open(os.path.join(log_dir,"tempfile_"+str(file_cnt)),"w") 
      except IOError:
          print ("[%s] Could not open templog file for writing." % (util.get_current_time())) 
          sys.exit(1)
  else:
    try:
      log = open(os.path.join(log_dir,temp_log), "a")
    except IOError as e:
      print("Error: %s File not found." % temp_log)
      sys.exit(1)

  if url_type == 1:
    get_url(url, request_num, log, phase, accept_header)
  if url_type == 2:
    post_url(url,request_num,log,phase)
  if url_type == 3:
    delete_url(url,request_num,log,phase)