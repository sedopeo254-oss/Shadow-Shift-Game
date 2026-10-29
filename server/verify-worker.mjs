import {parentPort,workerData} from 'node:worker_threads';
import {verifyProof} from '../src/maps.js';
try{parentPort.postMessage({ok:true,result:verifyProof(workerData.map,workerData.proof)});}catch(e){parentPort.postMessage({ok:false,error:e.message});}
