FROM node

MAINTAINER Sushma Thimmappa(sushma.kyasaralli.thimmappa@intel.com)

#Install necessary preliminary packages
RUN apt-get update && apt-get install -y sudo && apt-get -y install vim

#Create a user to be able to run node commands
RUN useradd -m nodeuser && echo "nodeuser:12345"|chpasswd && adduser nodeuser sudo

#Move to user's dir as current working directory
WORKDIR /home/nodeuser

#Copy the server related files to the container
ADD Node-DC-EIS-microservices /home/nodeuser/Node-DC-EIS-microservices/

#Setting user permissions for the files
RUN chown -R nodeuser:nodeuser /home/nodeuser/Node-DC-EIS-microservices

#Switch to user (was root until now)
USER nodeuser

#expose a range of ports to be visible outside container
EXPOSE 3000-3090
