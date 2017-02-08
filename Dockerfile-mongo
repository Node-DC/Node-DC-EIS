FROM mongo

MAINTAINER Sushma Thimmappa(sushma.kyasaralli.thimmappa@intel.com)

RUN apt-get update

#Create the database directory
RUN mkdir -p /data/db

#Make port 27017 accessible 
EXPOSE 27017

#Invoke mongod at the start of the container
ENTRYPOINT ["/usr/bin/mongod"]

