FROM node:6.10

MAINTAINER Sushma Thimmappa(sushma.kyasaralli.thimmappa@intel.com)

#Install necessary preliminary packages
RUN apt-get update && apt-get install -y sudo && apt-get -y install vim

#Create a user to be able to run node commands
RUN useradd -m nodeuser && echo "nodeuser:12345"|chpasswd && adduser nodeuser sudo

#Move to user's dir as current working directory
WORKDIR /home/nodeuser/Node-DC-EIS-cluster

#Copy the server related files to the container
ADD Node-DC-EIS-cluster /home/nodeuser/Node-DC-EIS-cluster/

#Setting user permissions for the files
RUN chown -R nodeuser:nodeuser /home/nodeuser/Node-DC-EIS-cluster

RUN npm install

#Switch to user (was root until now)
USER nodeuser

#expose the port to be visible outside container
EXPOSE 9000

#start the node server 
CMD ["node", "server-cluster.js"]
