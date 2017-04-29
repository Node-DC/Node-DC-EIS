# Supporting functions
import time
import sys
import requests

timeout_err = 0
conn_err = 0
http_err = 0
bad_url = 0

def getCurrentTime():
  currentTime = time.strftime("%d-%m-%Y %H:%M:%S")
  return currentTime

# HTTP exception handling
def handleHTTPExcepton(re):
  global timeout_err
  global conn_err
  global http_err
  global bad_url

  if (re.Timeout):
    print("[%s] Error: Timeout error. Check if Server is Down?" % (getCurrentTime()))
    timeout_err += 1
  elif (re.ConnectionError):
    print("[%s] Error: Connection error." % (getCurrentTime()))
    conn_err += 1
  elif (re.HTTPError):
    print("[%s] Error: HTTP error." % (getCurrentTime()))
    http_err += 1
  elif (re.TooManyRedirects):
    print("[%s] Error: TooManyRedirects error." % (getCurrentTime()))
    bad_url += 1
  elif (re.RequestException):
    print("[%s] Error: Ambiguous RequestException error." % (getCurrentTime()))
  else:
    print("[%s] Error: Catastropic error." % (getCurrentTime()))
    print re
    sys.exit(1)
