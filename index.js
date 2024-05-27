const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const cpus = os.cpus().length;
    const totalWorkers = cpus * 2; // Spawn 50 times the number of CPU cores
  
    for (let i = 0; i < totalWorkers; i++) {
      cluster.fork();
    }
  
    cluster.on('exit', (worker, code, signal) => {
      console.log(`Worker ${worker.process.pid} died`);
      cluster.fork();
    });
  } else {
    require('./worker');
  }



  