````
This is a first major release of this workload with lot of effort to make it stable, supporting multiple use cases. Following are the major features.

- A node.js server application, 
  - Embedded database objects as per NoSQL (mongodb) guide.
  - Uses Node.js core features such as 'Cluster'
  - Runs in a monolithic (single process), multiple processes using Cluster where server scaling is important and micro-services mode
  - Runs on a bare metal and in a Docker container
  - It can be deployed as a single application or multiple instances where density is important.
  - In a multiple instance execution mode, it can be deployed on a single host and across a network of machines.
  - It can be configured to use single, all or specific number of CPU cores using environment variable.
  - When launched in multiple instance mode, the measuring time is synchronized across all instances to get maximum CPU and System utilization.
  - It can be configured to use single or multiple mongodb server instance(s)
  - Supports default JSON or HTML data response using PUG engine.
  - Supports GET, POST and DELETE operations
  - Currently support following end-points:
    * '/'        : Application root
    * '/loaddb'  : Invokes DB instantiation
    * '/checkdb' : Verifies DB for consistency
    * '/employees' : GET request to retrieve all employee records
    * '/employees' : POST request to insert new employee record
    * '/employees/id' : GET request to retrieve all employee IDs only
    * '/employees/id/:id' : GET request to retrieve employee record by ID
    * '/employees/name' : GET request to retrieve employee record(s) by name
    * '/employees/zipcode' : GET request to retrieve employee record(s) by zipcode
    * '/employees/id/:id' : DELETE request to delete employee specified by ID
    * '/employees/id/:id/photo.jpg' : GET request to retrieve employee photo by ID

    * '/getmeminfo' : GET request to get memory snapshot  details. This get called every 1 second by the client and used for live graph.
    * '/getcpuinfo' : GET request to get system information. This includes hardware and software details
    * '/stopserver' : GET request to stop the server application.

- A Python based multi-threaded client
  - It support various phases like ramp-up, measurement and ramp-down
  - Creates a set of URLs with mix of GET, POST and DELETE types with randomaly selected query parameters (id, name or zipcode). 
  - Collects 'server memory usage' at specified interval
  - Tracks response time and errors. 
  - Aggregates Throuput for specified interval
  - Shows live graphs during the run
  - Validates the runs
  - Post-processes the transactions log producing final metrics and graphs.

````
