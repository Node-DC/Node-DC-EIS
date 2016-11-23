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

#!/usr/bin/python

import os
import sys

sl = ["address_service", "comp_service", "db_loader_service",  
"employee_service", "family_service", "health_service", "photo_service"] 

for dname in sl:
	wd = os.getcwd()
	os.chdir(dname)
	print "npm install running in " + dname + "..."
	os.system("npm install")
	os.chdir(wd)
