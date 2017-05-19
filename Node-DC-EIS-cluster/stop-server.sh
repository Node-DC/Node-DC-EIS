echo "Hello from stop server script"
#set proxy if it's not been set
if [ -f server-input.txt ]; then
	server_port=`grep server_port server-input.txt | cut -d ':' -f2`
	server_ip=`grep server_ip server-input.txt | cut -d ':' -f2`
	mongod --dbpath ./mongodb.template --shutdown
	curl --silent --noproxy "$server_ip" http://"$server_ip":"$server_port"/stopserver > /dev/null
else
	echo "Stopping all node process for user:`whoami`"
	killall node
fi
