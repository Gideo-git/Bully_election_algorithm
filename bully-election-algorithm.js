const net = require('net');
const EventEmitter = require('events');

class Process extends EventEmitter {
  constructor(id, host = 'localhost', basePort = 3000) {
    super();
    this.id = id;                         // Unique identifier for this process
    this.host = host;                     // Host name (localhost for same PC)
    this.port = basePort + id;            // Each process gets a unique port
    this.alive = true;                    // Process status
    this.coordinator = null;              // Current coordinator ID
    this.otherProcesses = [];             // IDs of other processes in the system
    this.server = null;                   // TCP server to receive messages
    this.electionInProgress = false;      // Flag to track election state
    this.responseReceived = false;        // Flag to track if higher processes responded
    this.electionTimeout = null;          // Timer for election timeout
  }

  // Initialize the process and start the server
  async start() {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        let data = '';
        
        socket.on('data', (chunk) => {
          data += chunk.toString();
          
          // Process complete messages
          if (data.includes('\n')) {
            const messages = data.split('\n');
            // Process all complete messages
            for (let i = 0; i < messages.length - 1; i++) {
              this.handleMessage(JSON.parse(messages[i]));
            }
            // Keep any incomplete message
            data = messages[messages.length - 1];
          }
        });
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`Process ${this.id} started on ${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  // Register other processes in the system
  registerOtherProcesses(processIds) {
    this.otherProcesses = processIds.filter(id => id !== this.id);
    console.log(`Process ${this.id} registered other processes: ${this.otherProcesses.join(', ')}`);
  }

  // Handle incoming messages
  handleMessage(message) {
    console.log(`Process ${this.id} received message: ${JSON.stringify(message)}`);
    
    switch (message.type) {
      case 'ELECTION':
        this.handleElection(message.from);
        break;
      case 'OK':
        this.handleOk(message.from);
        break;
      case 'COORDINATOR':
        this.handleCoordinator(message.from);
        break;
      default:
        console.log(`Process ${this.id} received unknown message type: ${message.type}`);
    }
  }

  // Handle ELECTION message
  handleElection(fromId) {
    if (this.id > fromId) {
      // Send OK to the process that initiated the election
      this.sendMessage(fromId, { type: 'OK', from: this.id });
      
      // If not already in an election, start one
      if (!this.electionInProgress) {
        this.startElection();
      }
    }
  }

  // Handle OK message
  handleOk(fromId) {
    // Mark that we received a response from a higher process
    this.responseReceived = true;
    console.log(`Process ${this.id} received OK from Process ${fromId}`);
  }

  // Handle COORDINATOR message
  handleCoordinator(fromId) {
    this.coordinator = fromId;
    this.electionInProgress = false;
    if (this.electionTimeout) {
      clearTimeout(this.electionTimeout);
    }
    console.log(`Process ${this.id} acknowledges Process ${fromId} as coordinator`);
    this.emit('coordinatorElected', fromId);
  }

  // Start an election
  startElection() {
    console.log(`Process ${this.id} starting election`);
    this.electionInProgress = true;
    this.responseReceived = false;
    
    // Get IDs of processes with higher IDs
    const higherProcesses = this.otherProcesses.filter(id => id > this.id);
    
    // Send ELECTION message to all processes with higher IDs
    if (higherProcesses.length > 0) {
      higherProcesses.forEach(id => {
        this.sendMessage(id, { type: 'ELECTION', from: this.id });
      });
      
      // Set timeout to wait for OK messages
      this.electionTimeout = setTimeout(() => {
        if (!this.responseReceived) {
          // No higher process responded, declare self as coordinator
          this.declareAsCoordinator();
        }
      }, 2000); // 2 second timeout
    } else {
      // No processes with higher IDs, declare self as coordinator immediately
      this.declareAsCoordinator();
    }
  }

  // Declare self as coordinator
  declareAsCoordinator() {
    console.log(`Process ${this.id} declaring itself as coordinator`);
    this.coordinator = this.id;
    this.electionInProgress = false;
    
    // Broadcast COORDINATOR message to all other processes
    this.otherProcesses.forEach(id => {
      this.sendMessage(id, { type: 'COORDINATOR', from: this.id });
    });
    
    this.emit('coordinatorElected', this.id);
  }

  // Send a message to another process
  sendMessage(targetId, message) {
    const targetPort = 3000 + targetId;
    const client = net.createConnection({ host: this.host, port: targetPort }, () => {
      client.write(JSON.stringify(message) + '\n');
      client.end();
    });
    
    client.on('error', (err) => {
      console.log(`Process ${this.id} could not send message to Process ${targetId}: ${err.message}`);
      
      // If we were trying to send an ELECTION message and got an error,
      // the target process might be down, continue with the election
      if (message.type === 'ELECTION' && this.electionInProgress) {
        // Check if we've tried all higher processes
        const remainingHigher = this.otherProcesses.filter(id => id > this.id && id !== targetId);
        if (remainingHigher.length === 0 && !this.responseReceived) {
          this.declareAsCoordinator();
        }
      }
    });
  }

  // Simulate a process crash
  crash() {
    console.log(`Process ${this.id} crashing`);
    this.alive = false;
    if (this.server) {
      this.server.close();
    }
  }
  
  // Restart a crashed process
  async restart() {
    if (!this.alive) {
      console.log(`Process ${this.id} restarting`);
      this.alive = true;
      await this.start();
      this.startElection(); // Start an election when restarting
    }
  }
  
  // Get current coordinator
  getCoordinator() {
    return this.coordinator;
  }
}

// Example usage
async function runExample() {
  // Create 5 processes
  const processes = [];
  for (let i = 1; i <= 5; i++) {
    const p = new Process(i);
    processes.push(p);
    await p.start();
  }
  
  // Register processes with each other
  const processIds = processes.map(p => p.id);
  processes.forEach(p => p.registerOtherProcesses(processIds));
  
  // Start election from process 1
  console.log("\n--- Starting election from Process 1 ---");
  processes[0].startElection();
  
  // After 5 seconds, crash the coordinator (assuming Process 5 was elected)
  setTimeout(() => {
    console.log("\n--- Crashing current coordinator ---");
    // Find the coordinator and crash it
    const coordinator = processes.find(p => p.getCoordinator() === p.id);
    if (coordinator) {
      coordinator.crash();
      
      // Start a new election from another process
      setTimeout(() => {
        console.log("\n--- Starting new election after coordinator crash ---");
        // Find a process that's not the crashed coordinator
        const anotherProcess = processes.find(p => p.id !== coordinator.id);
        if (anotherProcess) {
          anotherProcess.startElection();
        }
      }, 2000);
    }
  }, 5000);
}

// Only run the example if this file is executed directly
if (require.main === module) {
  runExample();
}

module.exports = Process;