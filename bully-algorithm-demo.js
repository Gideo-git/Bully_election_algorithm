const Process = require('./bully-election-algorithm.js');

async function main() {
  // Create and start multiple processes
  const numProcesses = 4;
  const processes = [];
  
  console.log('Starting processes...');
  
  // Initialize processes
  for (let i = 1; i <= numProcesses; i++) {
    const process = new Process(i);
    await process.start();
    processes.push(process);
    
    // Listen for coordinator election events
    process.on('coordinatorElected', (coordinatorId) => {
      console.log(`Process ${process.id} knows that Process ${coordinatorId} is now the coordinator`);
    });
  }
  
  // Register all processes with each other
  const processIds = processes.map(p => p.id);
  processes.forEach(p => p.registerOtherProcesses(processIds));
  
  console.log('\n--- Initial Election ---');
  // Start an election from the process with the lowest ID
  processes[0].startElection();
  
  // After 5 seconds, crash the coordinator (likely the process with highest ID)
  setTimeout(() => {
    // Find the current coordinator
    const coordinator = processes.find(p => p.getCoordinator() === p.id);
    if (coordinator) {
      console.log(`\n--- Crashing Coordinator (Process ${coordinator.id}) ---`);
      coordinator.crash();
      
      // Wait a bit and then start a new election from another process
      setTimeout(() => {
        console.log('\n--- Starting New Election After Coordinator Crash ---');
        // Find a process that's not the crashed coordinator
        const anotherProcess = processes.find(p => p.id !== coordinator.id && p.alive);
        if (anotherProcess) {
          anotherProcess.startElection();
        }
      }, 2000);
    }
  }, 5000);
  
  // After another 5 seconds, restart the crashed coordinator
  setTimeout(() => {
    const crashedProcess = processes.find(p => !p.alive);
    if (crashedProcess) {
      console.log(`\n--- Restarting Process ${crashedProcess.id} ---`);
      crashedProcess.restart().then(() => {
        // Register processes again
        crashedProcess.registerOtherProcesses(processIds);
      });
    }
  }, 12000);
}

// Run the demo
main().catch(console.error);