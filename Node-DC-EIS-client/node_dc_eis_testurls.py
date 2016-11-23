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
from functools import partial
from eventlet.green import urllib2
requests = eventlet.import_patched('requests.__init__')
import requests
from collections import OrderedDict 

headers = {'content-type': 'application/json'}
post_datalist = []
employee_idlist = []
front_oflist = 0

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
                {"paid_family_leave" : "true", "longterm_disability_plan" : "true", "shortterm_disability_plan" : "false"} }

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

#sends GET requests to the server. Type 1 is GET requests.
# handles 3 types of GET requests based on ID, last_name and zipcode.
def get_url(url,request_num,log,phase): 
  global timeout_err
  global conn_err
  global http_err
  global bad_url 
  global post_data
  start = time.time()
  try:
    r = s.get(url, headers=headers)
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
  print >> log, phase+","+str(request_num)+","+str(url)+","+str(start)+","+str(end)+","+str(response_time)
  return 

#sends POST requests to the server. Type 2 is POST requests.
#also captures the ID that was posted and saves it in a list(employee_idlist) which is used in the ID list to send requests
def post_url(url,request_num,log,phase): 
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
    exit(1)
  if result:
    if 'result' in result:
      employee_idlist.append(result['result']['employee_id'])
    else:
      print("Exception -- Post did not return a valid employee_id")
      print post_data
      exit(1)
  print >> log, phase+","+str(request_num)+","+str(url)+","+str(start)+","+str(end)+","+str(response_time)
  return 

#sends delete requests to the server. Type 3 is delete requests.
#also captures the data record being deleted and saves it in a list(post/_datalist) which is used for new post requests
def delete_url(url,request_num,log,phase): 
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
      exit(1)
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

  print >> log, phase+","+str(request_num)+","+str(url)+","+str(start)+","+str(end)+","+str(response_time)
  return url

# main entry funtion to determine the type of url - GET,POST or DELETE 
def main_entry(url,request_num, url_type,log,phase):
  if url_type == 1:
    get_url(url,request_num,log,phase)
  if url_type == 2:
    post_url(url,request_num,log,phase)
  if url_type == 3:
    delete_url(url,request_num,log,phase)