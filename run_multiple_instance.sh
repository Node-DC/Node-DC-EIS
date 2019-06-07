#!/bin/bash

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

print_this_message() {
  echo "Usage: run_multiple_instance.sh runtype node_path"
  echo "runtype: 0 - bare metal, 1 - container"
  echo "node_path: Path to the node executable"
}

if [ "$#" -gt 2 ]; then
  print_this_message
  exit 1
fi

if [ "$#" == 1 ] && [ $1 == "-h" ] ; then
  print_this_message
  exit 0
fi

runtype=$1

#setting the node path
if [ "$#" == 2 ]; then
  NODE_PATH=$2
fi

USERNAME=`whoami`
remote_work_dir="$HOME/Node-DC-EIS-multiple/multiple-instance-`date +%Y%m%d%H%M%S`"
log_dir_name=instance_log
num_instances=2 #must match with the number of blocks in the input_config_file
cpu_count=0 #cpu count for node server 
no_graph=true #if true, output graphs will not be generated

##################################################################################
# No change required below this line
##################################################################################
if [[ "x${runtype}" == "x" || ${runtype} -eq 0 ]]; then
  runtype=0 #bare metal
  echo "`date`: Starting bare metal run"
else
  runtype=1 #container
  echo "`date`: Starting container run"
fi

script_pathname=`pwd`/$0 
client_workdir=`dirname $script_pathname`
current_time=$(date +"%m-%d-%Y-%H-%M-%S")
multi_instance_config="${client_workdir}/multiple_instance_config.json"
CONTAINER_STARTUP_SCRIPT="${client_workdir}/container-startup.sh"

top_results_dir=${client_workdir}/results_multiple_instance
run_dir=${top_results_dir}/run"$current_time"
log_dir="$run_dir/$log_dir_name"
master_log="$run_dir/${current_time}_master.log"

client_dir=${client_workdir}/Node-DC-EIS-client
server_dir=${client_workdir}/Node-DC-EIS-cluster

#these temp directories are created during the run to create multiple instances 
#and deleted in the end
temp_clientdir="$run_dir"/Node-DC-EIS-client-temp
temp_serverdir="$run_dir"/Node-DC-EIS-server-temp

#global initiating variables
total_instances=0
instances_ok=0
instances_failed=0
instance_id=0
server_list=""

#setup all top level directories
setup() {
  if [ ! -d "$top_results_dir" ]; then
    echo "`date`: Creating results directory"
    mkdir -p "$top_results_dir"
    if [ $? -ne 0 ] ; then
    echo "`date`: Creating results directory failed"
    exit 1
    fi
  fi

  echo "`date`: Creating run directory"
  mkdir -p "$run_dir"

  if [ $? -ne 0 ] ; then
    echo "`date`: Creating run directory failed"
    exit 1
  fi

  if [ -d "$log_dir" ]; then
    /bin/rm -rf "$log_dir"
  fi
  print_master_log "Creating log directory"
  mkdir -p "$log_dir"

  if [ $? -ne 0 ] ; then
    print_master_log "Creating log directory failed"
  fi
}

make_local_client_copy(){
  if [ -d "$temp_clientdir" ]; then
    /bin/rm -rf "$temp_clientdir"
  fi
  cp -r "$client_dir"/. "$temp_clientdir"
}

#Sanity check for the given configuration file
#stops the run if sanity check fails
sanity_check_configfile(){
 sb=0
 db_url=0
 server_ip=0
 server_port=0
 found_id=0
 found_ip=0
 found_port=0
 found_dbname=0
 found_dbport=0
 found_dbip=0
 OLDIFS=$IFS
 IFS=$'\n'
 config_error=0
 num_blocks=0

 config=${multi_instance_config}
 line_num=0
 start_block_num=0
 end_block_num=0
 for i in `cat  ${config}`
  do 
    w=`echo $i | xargs`
    line_num=`expr $line_num + 1`
    l=$w
    if [ "$l" == "{" ]; then
      start_block_num=$line_num
      sb=1
      continue
    fi

    if [ "$sb" == "1" ]; then
      j=$(echo "$w"| grep "instance_id")
      s=$(echo "$w"| grep "server_ip")
      p=$(echo "$w"| grep "server_port")
      d=$(echo "$w"| grep "db_name" )
      d_ip=$(echo "$w"| grep "db_ip" )
      d_port=$(echo "$w"| grep "db_port" )

      if [ "x$s" != "x" -a "$found_ip" == "0" ]; then 
         server_ip=$(echo "$s"| cut -d':' -f2 | tr -d ',')
         found_ip=1
      fi
      if [ "x$p" != "x" -a "$found_port" == "0" ]; then 
         server_port=$(echo "$p"| cut -d':' -f2 | tr -d ',')
         found_port=1
      fi
      if [ "x$d" != "x" -a "$found_dbname" == "0" ]; then 
         db_name=$(echo "$d"| cut -d':' -f2 | tr -d ',')
         found_dbname=1
      fi
      if [ "x$d_ip" != "x" -a "$found_dbip" == "0" ]; then 
         db_ip=$(echo "$d_ip"| cut -d':' -f2 | tr -d ',')
         found_dbip=1
      fi
      if [ "x$d_port" != "x" -a "$found_dbport" == "0" ]; then 
         db_port=$(echo "$d_port"| cut -d':' -f2 | tr -d ',')
         found_dbport=1
      fi

      if [ "$l" == "}" ]; then
        end_block_num=$line_num
        if [ $found_ip -eq 0 ] || [ $found_port -eq 0 ] || [ $found_dbip -eq 0 ] || [ $found_dbname -eq 0 ] || [ $found_dbport -eq 0 ] ; then
          config_error=1
          print_master_log "Found error in the block starting at $start_block_num and ending at $end_block_num."
        fi
        found_ip=0
        found_port=0
        found_db=0
        found_dbip=0
        found_dbport=0
        num_blocks=`expr "$num_blocks" + 1`
        sb=0
      fi
    fi
  done
  if [ $num_instances -ne $num_blocks ]; then
    print_master_log "The number of instances in the $config file is not equal to the number instances given"
    config_error=1 
  fi
  if [ $config_error -eq 1 ]; then
    print_master_log "Errors in $config file. Aborting the run"
    exit 1
  fi
  IFS=$OLDIFS
}

process_configfile(){
 #reads the input_config_file for serverIP serverPort and dbURL for each instance
 sb=0
 db_url=0
 server_ip=0
 server_port=0
 found_id=0
 found_ip=0
 found_port=0
 found_dbname=0
 found_dbport=0
 found_dbip=0
 OLDIFS=$IFS
 IFS=$'\n'

 #Sanity check for the given configuration file
 sanity_check_configfile

 #make a temporary copy of the client code
 make_local_client_copy

 config=${multi_instance_config}
 line_num=0
 start_block_num=0
 end_block_num=0
 for i in `cat  ${config}`
  do 
    w=`echo $i | xargs`
    line_num=`expr $line_num + 1`
    l=$w
    if [ "$l" == "{" ]; then
      start_block_num=$line_num
      sb=1
      continue
    fi

    if [ "$sb" == "1" ]; then
      s=$(echo "$w"| grep "server_ip")
      p=$(echo "$w"| grep "server_port")
      d=$(echo "$w"| grep "db_name" )
      d_ip=$(echo "$w"| grep "db_ip" )
      d_port=$(echo "$w"| grep "db_port" )

      if [ "x$s" != "x" -a "$found_ip" == "0" ]; then 
         server_ip=$(echo "$s"| cut -d':' -f2 | tr -d ',')
         found_ip=1
      fi
      if [ "x$p" != "x" -a "$found_port" == "0" ]; then 
         server_port=$(echo "$p"| cut -d':' -f2 | tr -d ',')
         found_port=1
      fi
      if [ "x$d" != "x" -a "$found_dbname" == "0" ]; then 
         db_name=$(echo "$d"| cut -d':' -f2 | tr -d ',')
         found_dbname=1
      fi
      if [ "x$d_ip" != "x" -a "$found_dbip" == "0" ]; then 
         db_ip=$(echo "$d_ip"| cut -d':' -f2 | tr -d ',')
         found_dbip=1
      fi
      if [ "x$d_port" != "x" -a "$found_dbport" == "0" ]; then 
         db_port=$(echo "$d_port"| cut -d':' -f2 | tr -d ',')
         found_dbport=1
      fi

      if [ "$l" == "}" ]; then
        end_block_num=$line_num
        found_ip=0
        found_port=0
        found_db=0
        found_dbip=0
        found_dbport=0
        instance_id=`expr "$instance_id" + 1`
        total_instances=`expr "$total_instances" + 1`
        instance_logfile="$current_time-instance$instance_id.log"
        server_url="$server_ip:$server_port"
        server_list+=" $server_url"
        echo "----------------------------------------------------"
        print_master_log "Creating instance log file for instance $instance_id"

        create_clientconfig "$instance_id" "$server_ip" "$server_port" "$db_name" "$db_ip" "$db_port"

        #if manually copying the server, comment this function call
        if [ $runtype -eq 0 ]; then
          create_serverconfig "$instance_id" "$server_ip" "$server_port" "$db_name" "$db_ip" "$db_port"
        fi
        #if manually copying the server, comment this function call
        start_server "$instance_id" "$server_ip" "$server_port" "$log_dir/$instance_logfile" "$db_port" "$db_ip" "$db_name"
        sb=0
      fi
    fi
  done #end of for loop
  echo "----------------------------------------------------"
  IFS=$OLDIFS
  # checks if all the servers are up and running
  check_server "$total_instances"
 
  #Starting clients. Clients must be started only after all the servers are up
  start_clients "$total_instances" 

  #Start post process function call
  start_postprocess "$total_instances"

  #stop all server and mongodb processes
  stop_run "$total_instances"

  #cleanup after the run is completed
  cleanup
}

#creates client configuration file for each instance
#updates values: server-ip, server-port and mongoDB-URL for each instance
create_clientconfig(){
  OLSIFS=$IFS 
  IFS=$'\n'
  instance_id=$1
  server_ip=$2
  server_port=$3
  db_name=$4
  db_ip=$5
  db_port=$6
  db_url=0

  print_master_log "Creating client copy for instance $instance_id"
  template_file="$client_dir"/config.json
  
  new_config_file="$temp_clientdir"/config${instance_id}.json
  if [ -f "$new_config_file" ]; then
    /bin/rm $new_config_file
  fi

  added_newline=0
  while read -r i
    do
    w=$i
    if [ "$added_newline" == "1" ]; then
      z=`echo "$w" | xargs`
      if [ "$z" == "}" -o "$z" == "}," ]; then
         print_master_log "Reading client config$instance_id block completed"
      else
        echo "," >> $new_config_file
      fi
      added_newline=0
    fi
    s=$(echo "$w"| grep "server_ipaddress")
    p=$(echo "$w"| grep "server_port")
    d=$(echo "$w"| grep "db_url" )
    if [ "x$s" == "x" -a "x$p" == "x" -a "x$d" == "x" ]; then 
      if [ -f "$new_config_file" ]; then
        echo "$w" >> $new_config_file
      else
        echo "$w" > $new_config_file
      fi
    else
      if [ "x$s" != "x" ]; then
        tagname=`echo "$s" | cut -d ':' -f1 | xargs`
        if [ -f "$new_config_file" ]; then
          echo "\"$tagname\":\"$server_ip\"" >> $new_config_file
        else
          echo "\"$tagname\":\"$server_ip\"" > $new_config_file
        fi
        added_newline=1
      fi 
      if [ "x$p" != "x" ]; then
        tagname=`echo "$p" | cut -d ':' -f1 | xargs`
        if [ -f "$new_config_file" ]; then
          echo "\"$tagname\":\"$server_port\"" >> $new_config_file
        else
          echo "\"$tagname\":\"$server_port\"" > $new_config_file
        fi
        added_newline=1
      fi 
      if [ "x$d" != "x" ]; then
        tagname=`echo "$d" | cut -d ':' -f1 | xargs`
        if [ -f "$new_config_file" ]; then
          echo "\"$tagname\":\"$db_url\"" >> $new_config_file
        else
          echo "\"$tagname\":\"$db_url\"" > $new_config_file
        fi
        added_newline=1
      fi 
    fi
    done < "$template_file"
  IFS=$OLDIFS
}

#creates server config file for each instance
#updates values: server-ip, server-port and mongoDB-URL for each instance
create_serverconfig(){
  OLDIFS=$IFS
  IFS=$'\n' 
  instance_id=$1
  server_ip=$2
  server_port=$3
  db_name=$4
  db_ip=$5
  db_port=$6
  db_url="mongodb://""$db_ip"":""$db_port""/""$db_name"
  print_master_log "Creating server copy for instance $instance_id"
  if [ -d "$temp_serverdir" ]; then
    /bin/rm -r "$temp_serverdir"
  fi

  cp -r "$server_dir"/. "$temp_serverdir"
  cp start-server.sh "$temp_serverdir"
  cp stop-server.sh "$temp_serverdir"
  `echo -e "db_port:"$db_port"\nserver_ip":$server_ip"\nserver_port:"$server_port > $temp_serverdir/server-input.txt`
  template_file="$server_dir"/config/configuration.js

  new_server_config="$temp_serverdir"/config/configuration.js
  if [ -f "$new_server_config" ]; then
    /bin/rm $new_server_config
  fi
  added_newline=0
  while read -r i
    do
    w=$i
    if [ "$added_newline" == "1" ]; then
      z=`echo "$w" | xargs`
      if [ "$z" == "}" -o "$z" == "};" ]; then
        print_master_log "Reading config$instance_id block completed"
      else
        echo "," >> $new_server_config
      fi
      added_newline=0
    fi
    p=$(echo "$w"| grep "app_port")
    d=$(echo "$w"| grep "db_url" )
    ip=$(echo "$w"| grep "app_host" )
    if [ "x$p" == "x" -a "x$d" == "x" -a "x$ip" == "x" ]; then 
      if [ -f "$new_server_config" ]; then
        echo "$w" >> $new_server_config
      else
        echo "$w" > $new_server_config
      fi
    else
      if [ "x$p" != "x" ]; then
        tagname=`echo "$p" | cut -d ':' -f1 | xargs`
        if [ -f "$new_server_config" ]; then
          echo "'$tagname'"":""$server_port" >> $new_server_config
        else
          echo "'$tagname'"":""$server_port" > $new_server_config
        fi
        added_newline=1
      fi 
      if [ "x$d" != "x" ]; then
        tagname=`echo "$d" | cut -d ':' -f1 | xargs`
        if [ -f "$new_server_config" ]; then
          echo "'$tagname'"":""'$db_url'" >> $new_server_config
        else
          echo "'$tagname'"":""'$db_url'" > $new_server_config
        fi
        added_newline=1
      fi 
      if [ "x$ip" != "x" ]; then
        tagname=`echo "$ip" | cut -d ':' -f1 | xargs`
        if [ -f "$new_server_config" ]; then
          echo "'$tagname'"":""'$server_ip'" >> $new_server_config
        else
          echo "'$tagname'"":""'$server_ip'" > $new_server_config
        fi
        added_newline=1
      fi 
    fi
    done < "$template_file"
  IFS=$OLDIFS
}

#executes remote commands using ssh
execute_remote_cmd() {
  server_ip="$1"
  logfile="$2"
  cmd_to_run="$3"

  if [ "x" == "x$USERNAME" ]; then
      ssh "$server_ip" "$cmd_to_run"
  else 
      ssh $USERNAME@"$server_ip" "$cmd_to_run"
  fi
  retval=$?
  if [ "$retval" != "0" ]; then
    print_master_log "Failed to run $cmd_to_run"
    exit
  fi

  return 0
}

#prints to master log file
print_master_log() {
  text="`date`: $1"

  echo "$text" 
  echo "$text" >> $master_log

}
#starts each server instance
start_server(){
  instance_id=$1
  server_ip=$2
  server_port=$3
  logfile=$4
  db_port=$5
  db_ip=$6
  db_name=$7
  server_type=$runtype #0 is bare-metal, 1 is container mode

  instance_dir="${remote_work_dir}/Node-DC-EIS-cluster-${instance_id}"

  ###############################################################################
  print_master_log "Starting server instance $instance_id"
  echo "`date`: Starting server with $server_ip at port $server_port for instance $instance_id" > "$logfile"
  remote_cmd_to_run="mkdir -p ${remote_work_dir}"
  execute_remote_cmd "$server_ip" "$logfile" "$remote_cmd_to_run"


  ###############################################################################
  print_master_log "Deleting old instance directory"
  print_master_log "--> ${instance_dir}"
  if ssh ${USERNAME}@"$server_ip" "[ -d ${instance_dir} ]"; then
    remote_cmd_to_run="/bin/rm -fr ${instance_dir}"
    execute_remote_cmd "$server_ip" "$logfile" "$remote_cmd_to_run"
  fi

  ###############################################################################
  print_master_log "Creating new remote instance work directory"
  print_master_log "--> ${instance_dir}"
  remote_cmd_to_run="mkdir -p ${instance_dir}"
  execute_remote_cmd "$server_ip" "$logfile" "$remote_cmd_to_run"


  ###############################################################################
  if [ "$server_type" == "0" ]; then 
    print_master_log "Copying ${temp_serverdir} to remote instance work directory"
    scp -r ${temp_serverdir} ${USERNAME}@"${server_ip}":"${instance_dir}">> "$logfile" 2>&1
    retval=$?
    if [ "$retval" != "0" ]; then
      print_master_log "Failed to copy server directory. Exiting the run"
      exit
    fi
  else
    print_master_log "Copying ${CONTAINER_STARTUP_SCRIPT} to remote instance work directory"
    scp -r ${CONTAINER_STARTUP_SCRIPT} ${USERNAME}@"${server_ip}":"${instance_dir}">> "$logfile" 2>&1
    retval=$?
    if [ "$retval" != "0" ]; then
      print_master_log "Failed to copy container start-up script. Exiting the run"
      exit
    fi
  fi

  ###############################################################################
  print_master_log "Starting a remote server instance"

  STARTUP_SCRIPT="start-server.sh"
  remote_cmd_to_run="(cd ${instance_dir}/`basename $temp_serverdir` && bash ${STARTUP_SCRIPT} ${NODE_PATH} ${cpu_count})"

  if [ "$server_type" == "1" ]; then
    STARTUP_SCRIPT=`basename ${CONTAINER_STARTUP_SCRIPT}`
    remote_cmd_to_run="(cd ${instance_dir} && bash ${STARTUP_SCRIPT} ${server_ip} ${server_port} ${db_ip} ${db_port} ${db_name} ${cpu_count})"
  fi

  #execute_remote_cmd "$server_ip" "$logfile" "$remote_cmd_to_run"
  ssh ${USERNAME}@"$server_ip" "${remote_cmd_to_run}" >> "$logfile" 2>&1 &
  sleep 5
}

#checks if each server instance is up and running
#sleeps repeatedly to check server status
check_server(){
  instances=$1
  wait_time=20
  total_wait_time=`expr "$instances" \* "$wait_time"`
  iterations=`expr "$total_wait_time" / "$wait_time"`
  OLDIFS=$IFS

  sleep $wait_time

  while [ $iterations -gt 0 ]
  do
    instances_ok=0
    IFS=" "
    for i in ${server_list[@]}
    do
      server_ip=`echo "$i" | cut -d ':' -f1`
      server_port=`echo "$i" | cut -d ':' -f2`
      print_master_log "Check server status of $server_ip:$server_port"
      curl --silent --noproxy "${server_ip}" http://"$server_ip":"${server_port}/" > /dev/null
      retval=$?
      print_master_log "Return value from server is $retval"
      if [ "$retval" == "0" ]; then
        instances_ok=`expr $instances_ok + 1`
        print_master_log "Number of servers up:$instances_ok/$instances"
      else
        instances_failed=`expr $instances_failed + 1`
      fi
    done
    if [ "$instances_ok" != "$instances" ]; then
      print_master_log "All servers not up. Will check again in ${wait_time} seconds."
      sleep ${wait_time}
      iterations=`expr "$iterations" - 1`
    else
      break  
    fi  
  done
  if [ "$instances_ok" == "$instances" ]; then
    print_master_log "All servers up and running. Starting client"
    print_master_log "Number of Server instances running- $instances_ok"
  else
    print_master_log "Some servers failed to start. Aborting run"
    exit 1
  fi
  IFS=$OLDIFS
}

#function starts clients. This handles the execution of the run
start_clients(){
  srv_instances=$1
  cd $temp_clientdir
  for i in `seq 1 ${srv_instances}`
  do
    logfile="${log_dir}/${current_time}-instance${i}.log"
    print_master_log "Starting client instance$i"
    client_config_file="config${i}.json"
    if $no_graph ; then
      python -u runspec.py -f "${client_config_file}" -m -id "$i" -dir "$run_dir" --nograph >> "$logfile" 2>&1 &
    else
      python -u runspec.py -f "${client_config_file}" -m -id "$i" -dir "$run_dir" >> "$logfile" 2>&1 &
    fi
    sleep 1
  done
  create_startfile "$srv_instances"
}

#function creates synchronization start file. The execution of requests starts after this file is generated
create_startfile(){
  instances=$1
  while true
  do 
    number_files_found=0
    for i in `seq 1 $instances`
    do 
      if [ -f "$run_dir/loaddb_done$i.syncpt" ]; then
        number_files_found=`expr $number_files_found + 1`
      fi
    done
    if [ "$number_files_found" -eq "$instances" ]; then  
      print_master_log "Creating go file"
      touch "$run_dir"/start.syncpt
      break
    fi
  done
}

#post processes data from all the instances
start_postprocess(){
  instances=$1
  while true
  do 
    number_files_found=0
    for i in `seq 1 $instances`
    do 
      summary_file="$run_dir/start_processing$i.syncpt"
      if [ -f "$summary_file" ]; then
        number_files_found=`expr $number_files_found + 1`
      fi
    done
    if [ "$number_files_found" -eq "$instances" ]; then
      print_master_log "All post processing sync files found - $number_files_found"
      break
    fi
  done
  if $no_graph ; then
    python -u ${client_workdir}/multiple_instance_post_process.py -i "$instances" -dir "$run_dir" --nograph
  else
    python -u ${client_workdir}/multiple_instance_post_process.py -i "$instances" -dir "$run_dir"
  fi
}

#stops server and mongodb instances
stop_run(){
  run_done=false
  instances=$1
  while true
  do 
    number_files_found=0
    for i in `seq 1 $1`
    do 
      if [ -f "$run_dir/run_completed$i.syncpt" ]; then
          number_files_found=`expr $number_files_found + 1`
      fi
    done
    if [ "$number_files_found" -eq "$instances" ]; then
      instance_index=0
      IFS=" "
      for i in `echo $server_list`
      do 
        instance_index=`expr $instance_index + 1`
        server_ip=`echo "$i" | cut -d ':' -f1`
        print_master_log "Stopping server($server_ip) and mongodb for instance$instance_index"
        ssh ${USERNAME}@"$server_ip" "(cd ${remote_work_dir}/Node-DC-EIS-cluster-$instance_index/`basename $temp_serverdir` && bash ./stop-server.sh)" >> "$logfile" 2>&1 &
        retval=$?
        if [ "$retval" != "0" ]; then
          print_master_log "Failed to stop server at $server_ip for instance$instance_index. Please check manually"
        fi
      done
      break
    fi
  done

}

#cleanup all syncpt files and temporary files created during the run
cleanup(){
  print_master_log "Cleaning up temporary files"
  /bin/rm $run_dir/*.syncpt
  /bin/rm -rf $temp_serverdir
  /bin/rm -rf $temp_clientdir
}

default_run() {
  setup
  process_configfile
}

default_run
