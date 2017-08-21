FROM python:2.7.13

# File Author / Maintainer
MAINTAINER Sushma Thimmappa(sushma.kyasaralli.thimmappa@intel.com)

# Update the sources list
RUN apt-get update && apt-get install -y sudo

# Install basic applications
RUN apt-get install -y tar git curl wget vim

# Install Python and Basic Python Tools
RUN apt-get install -y  python-dev python-distribute python-pip

# Upgrade pip
# proxy settings example RUN pip install --upgrade pip --proxy=http://proxy-addr:port
RUN pip install --upgrade pip

# Install pip packages
# proxy settings example RUN pip install numpy --proxy=http://proxy-addr:port
RUN pip install numpy

RUN pip install requests && pip install eventlet &&  pip install matplotlib

# Create a user to be able to run client commands
RUN useradd -m clientuser && echo "clientuser:12345"|chpasswd && adduser clientuser sudo

# Move to user's dir as current working directory
WORKDIR /home/clientuser

# Copy the client related files to the container
ADD Node-DC-EIS-client /home/clientuser/Node-DC-EIS-client/

# Setting user permissions for the files
RUN chown -R clientuser:clientuser /home/clientuser/Node-DC-EIS-client

# Switch to user (was root until now)
USER clientuser

EXPOSE 80
