# Bully Election Algorithm Implementation
A Node.js implementation of the Bully Election Algorithm for distributed systems coordination.
# Overview
The Bully Election Algorithm is a method for dynamically electing a coordinator or leader among a group of distributed computer processes. This implementation simulates multiple processes running on the same machine, communicating via TCP/IP sockets over different ports.

# Tech Stack

Programming Language: JavaScript  
Runtime Environment: Node.js  
Communication: TCP sockets  

# Features

Complete implementation of the Bully Election Algorithm  
Simulation of process crashes and recoveries  
Event-based architecture for real-time notification of coordinator elections  
Configurable number of processes  
Robust message handling with JSON message format  

# How It Works
The Bully Election Algorithm follows these principles:  

Process with the highest ID becomes the coordinator  
Any process can initiate an election  
During an election, processes only communicate with higher-ID processes  
If a process receives no responses, it becomes the coordinator  
New elections are triggered when coordinators fail  

# Installation
bash# Clone this repository  
git clone https://github.com/yourusername/Bully_election_algorithm.git  

# Navigate to the project directory
cd bully-algorithm  

# Install dependencies (if any)
npm install  
Usage  
Basic Example  
javascriptconst Process = require('./bully-election-algorithm');  

// Create and start processes  
const process1 = new Process(1);  
const process2 = new Process(2);  
const process3 = new Process(3);  

// Start all processes  
await process1.start();  
await process2.start();  
await process3.start();  

// Register processes with each other  
const processIds = [1, 2, 3];  
process1.registerOtherProcesses(processIds);  
process2.registerOtherProcesses(processIds);  
process3.registerOtherProcesses(processIds);  

// Start an election  
process1.startElection();  
Running the Demo  
bash# Run the demonstration file  
node bully-algorithm-demo.js  
  
Files  
 
bully-election-algorithm.js - Core implementation of the algorithm  
bully-algorithm-demo.js - Demonstration of the algorithm with multiple processes  

Message Types  
The implementation uses three types of messages:  

ELECTION - Sent by a process initiating an election  
OK - Sent in response to an ELECTION message by higher ID processes  
COORDINATOR - Sent by a process announcing itself as the coordinator  

Contributing  
Contributions are welcome! Please feel free to submit a Pull Request.   
  
License  
This project is licensed under the MIT License - see the LICENSE file for details.  
  
References  

Garcia-Molina, H. (1982). "Elections in a Distributed Computing System". IEEE Transactions on Computers.  
Distributed Systems: Principles and Paradigms by Andrew S. Tanenbaum and Maarten Van Steen  