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

from __future__ import absolute_import
from __future__ import print_function
import json, time
import os
import six.moves.urllib.parse
import re
import sys
from functools import partial
from eventlet.green import urllib
from eventlet.green import socket
import eventlet
import six
from six.moves import range
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
static_postdata = {"emp" :
                {"last_name":"Omar","email":"Grenfell23@example.com","first_name":"Grenfell","phone":"6126380368","role":"regular"},
             "addr" :
                {"country" : "USA", "state" : "FL", "zipcode" : "10253","street" : "4286, SW Lane"},
             "compensation" :
                {"stock" : "4739", "pay" : "521021"},
             "family":
                {"childrens" : "1", "marital_status" : "true"},
             "health" :
                {"paid_family_leave" : "true", "longterm_disability_plan" : "true", "shortterm_disability_plan" : "false"},
             "photo" : { "image": "/9j/4AAQSkZJRgABAQAASABIAAD/4QCMRXhpZgAATU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAIdpAAQAAAABAAAAWgAAAAAAAABIAAAAAQAAAEgAAAABAAOgAQADAAAAAQABAACgAgAEAAAAAQAAACCgAwAEAAAAAQAAACAAAAAA/+0AOFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAAOEJJTQQlAAAAAAAQ1B2M2Y8AsgTpgAmY7PhCfv/AABEIACAAIAMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/3QAEAAL/2gAMAwEAAhEDEQA/APbH1CVJGj+y3j7VBDpECrcZ4Oab/anzhfs94DnBzCPl9zV6SQw2DyqASkRYA+wrzebxJPczWss+nWEkt0ilnMbZHA/2uetbU6TqbGNWqqe53Z1Nh1t7vcG2lRGpI4JzjPI47etOi1BpWCeTdRsSQPMhwBgZyfauGh8UXUN1cGGxso5LePh1jbJGOh+bgcV6FbTtc6ZDOwAaWFXIHQErmipSdPcKdVVNj//Q91uFL6ZKqgljCQAO/wAtfPFvo3ir7KWe31UtFGgXKS5HQcccfhX0BLpNvOxaWPc5AyRIw7e3Sn/2bF5nmAOG9RM1ddDEKjfS9zkxGHda3Sx8/TaP4r+ygi21QO6uMrHLuP8Avcc+2a+grBGj0a1R1KstugII5B2ioho1sDnY/XP+vf0x605dKgSRZEjIdOVPmtjOMdO9FfEKqkrWsGHw8qLfW5//2Q==" } }

#globals for error checking
timeout_err = 0
conn_err = 0
http_err = 0
bad_url = 0
static_post = 0

s = requests.Session()
a = requests.adapters.HTTPAdapter(max_retries=20)
b = requests.adapters.HTTPAdapter(max_retries=20)
s.mount('http://', a)
s.mount('https://', b)

#globals to implement file optimization
start_time = 0
file_cnt = 0

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
    print(e)
    sys.exit(1)
  ip_cache[hostname] = ip
  return ip

def get_url(url, url_type, request_num, phase, accept_header, http_headers):
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
  data = ""
  headers = ""

  urlo = six.moves.urllib.parse.urlparse(url)
  ip = get_ip(urlo.hostname)
  start = time.time()

  query = ''
  if urlo.query != '':
    query = '?{}'.format(urlo.query)

  req_path = '{}{}'.format(urlo.path, query)

  req = '''GET {} HTTP/1.1\r
Host: {}\r
Accept: {}\r
Connection: close\r
{}\r
'''.format(req_path, urlo.netloc,
           accept_header, ''.join(hh + '\r\n' for hh in http_headers))

  try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(30)
    sock.connect((ip, urlo.port))
    sock.sendall(req.encode('utf-8'))
    while "\r\n\r\n" not in data:
      data = sock.recv(256).decode('utf-8')
      headers += data

    http_status = data[9:12]
    if http_status[0] != '2':
      http_err += 1

  except socket.timeout:
    print("GET urlo timeout_error")
    timeout_err += 1 
  except socket.error as e:
    print("GET urlo socket connection error")
    conn_err += 1
  finally:
    sock.close()
    end = time.time()
    response_time = end - start
    total_length = calculate_len_get(headers)

  util.printlog(log,phase,url_type,request_num,url,start,end,response_time,total_length)
  return 

def post_function(url, post_data):
  """
  # Desc  : Function to send post requests to the server. Type 2 is post requests
  #         also captures the ID that was posted and saves it in a list(employee_idlist)
  #         which is used in the ID list to send requests
  # Input : Post request URL, Request Number, log file to collect per request data
  #         phase of each request(ramp-up, ramp-down, measuring-time)
  # Output: Generates per request (post) details in a log file
  """
  global employee_idlist
  global timeout_err
  global conn_err
  global http_err
  global bad_url

  r = None
  try:
    r = s.post(url, headers=headers, data = json.dumps(post_data))
    r.raise_for_status()
  except requests.exceptions.Timeout as e:
    timeout_err = timeout_err + 1
    print("Time out error occured")
    print(e)
  except requests.exceptions.ConnectionError as e:
    conn_err = conn_err + 1
    print("connection error occured")
    print(e)
  except requests.exceptions.HTTPError as e:
    http_err = http_err + 1
    print("HTTP error occured")
    print(e)
  except requests.exceptions.TooManyRedirects as e:
    bad_url = bad_url + 1
    print("Too many redirects error occured")
    print(e)
  except requests.exceptions.RequestException as e:
    #catastrophic error. bail.
    print("Catastrophic exception")
    print(e)
  return r

def post_url(url, url_type, request_num, phase):
  """
  # Desc  : Function to send post requests to the server. Type 2 is post requests
  #         Retries if the post request fails
  # Input : Post request URL, Request Number, log file to collect per request data
  #         phase of each request(ramp-up, ramp-down, measuring-time)
  # Output: Generates per request (post) details in a log file
  """
  global start_time
  global file_cnt
  global employee_idlist
  global timeout_err
  global conn_err
  global http_err
  global bad_url
  global post_datalist
  global static_post
  r = None

  post_data = static_postdata
  if post_datalist:
    post_data = post_datalist[0]
  else:
    static_post = static_post + 1
  start = time.time()
  end = start
  for i in range(100):
    r =  post_function(url, post_data)
    if r:
      end = time.time()
      total_length = calculate_len_postdel(r)
      break
  if not r:
    print("Post request failed. Received null response.Exiting run")
    print(request_num, url)
    print(post_data)
    return
  response_time = end-start
  try:
    result = json.loads(r.content)
  except ValueError:
    # decoding failed
    print("Exception -- Decoding of result from posturl failed. Exiting")
    exit(1)
  if result:
    if 'result' in result:
      employee_idlist.append(result['result']['employee_id'])
    else:
      print("Exception -- Post did not return a valid employee_id")
      print(post_data)
      exit(1)

  util.printlog(log,phase,url_type,request_num,url,start,end,response_time,total_length)
  return

def delete_url(url, url_type, request_num, phase):
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

  #1. issue a get request to get the record that is being deleted
  try:
    try:
      get_res = s.get(url, headers=headers)   
    except requests.exceptions.RequestException as e:
      #catastrophic error. bail.
      print("--> DELETE url reques exception")
      print(e)
      sys.exit(1)
    try:
      response = json.loads(get_res.content)
    except ValueError:
      # decoding failed
      print("Exception -- Decoding of result from getid for delete failed. Exiting")
      sys.exit(1)(1)
    if response:
      if 'employee' in response:
        post_datalist.insert(front_oflist,response)
    else:
      print(url)
      print("Warning : Record not found")
    start = time.time()
    r = s.delete(url, headers=headers)
  except requests.exceptions.Timeout as e:
    print("--> DELETE url timeout errr");
    timeout_err = timeout_err + 1 
  except requests.exceptions.ConnectionError as e:
    conn_err = conn_err + 1
    print("--> DELETE url connection errr");
  except requests.exceptions.HTTPError as e:
    http_err = http_err + 1
    print("--> DELETE url HTTP errr");
  except requests.exceptions.TooManyRedirects as e:
    bad_url = bad_url + 1 
    print("--> DELETE url too many redirects errr");
  except requests.exceptions.RequestException as e:
    #catastrophic error. bail.
    print("--> DELETE url request exception errr");
    print(e)
    sys.exit(1)
  finally:
    end = time.time()
    response_time = end-start
    total_length = calculate_len_postdel(r)

  util.printlog(log,phase,url_type,request_num,url,start,end,response_time,total_length)
  return

def calculate_len_get(headers):
  """
  # Desc  : Function to calculate total length of data received for a get request.
  #         Calculated as sum of header length and the content length
  # Input : Header from a get request
  # Output: Returns the total length of data received
  """
  sock_header_len = 0 
  sock_content_len = 0
  total_length = 0
  sock_header_len = headers.find('\r\n\r\n') + 4
  for line in headers.splitlines():
    if "content-length" in line.lower():
      sock_content_len = int(line.split(':')[1].strip())
  total_length = sock_header_len + sock_content_len
  return total_length

def calculate_len_postdel(response):
  """
  # Desc  : Function to calculate total length of data received for post/delete request.
  #         Calculated as sum of header length and the content length.
  # Input : response from post/delete request
  # Output: Returns the total length of data received
  """
  header_len = 0
  content_len = 0
  total_length = 0
  content_len = len(response.content)
  header = response.headers
  header_len = (
    17 + # size of 'HTTP/1.1 200 OK\r\n' at the top
    # size of keys + size of values
    sum(len(kk) + len(vv) for kk, vv in six.iteritems(header)) +
    # size of the extra ': ' between key and value and '\r\n' per header
    len(header) * 4 +
    2 # size of the empty line at the end
  )
  total_length = header_len + content_len
  return total_length

def open_log(log_dir):
  try:
      log = open(os.path.join(log_dir, "tempfile_" + str(file_cnt)), "w")
  except IOError:
      print("[%s] Could not open templog file for writing." % (util.get_current_time()))
      sys.exit(1)

  return log

def clean_up_log(queue):
  ''' Used to clean up last log file '''
  global log
  log.close()
  queue.put(('PROCESS', log.name, file_cnt))
  log = None

def main_entry(url, request_num, url_type, log_dir, phase, interval,
               run_mode, temp_log, accept_header, queue, http_headers):
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
  global init
  global log
  if run_mode == 1:
    if not init:
      start_time = time.time();
      log = open_log(log_dir)
      init = True

    if time.time() - start_time > float(interval):
      old_log = log
      old_file_cnt = file_cnt
      file_cnt += 1
      start_time = time.time()

      log = open_log(log_dir)

      old_log.close()
      queue.put(('PROCESS', old_log.name, old_file_cnt))

  else:
    try:
      log = open(os.path.join(log_dir, temp_log), "a")
    except IOError:
      print("Error: %s File not found." % temp_log)
      sys.exit(1)

  if url_type == 1:
    get_url(url, url_type, request_num, phase, accept_header, http_headers)
  if url_type == 2:
    post_url(url, url_type, request_num, phase)
  if url_type == 3:
    delete_url(url, url_type, request_num, phase)

