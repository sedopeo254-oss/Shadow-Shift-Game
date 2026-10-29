/** Operator-only CLI. Run on the host; never expose the database to the web. */
import path from 'node:path';
import {openDatabase} from './index.mjs';
const db=openDatabase(process.env.DB_PATH||path.resolve('data/community.sqlite'));
const [action,id]=process.argv.slice(2);
try{
 if(action==='reports')console.table(db.prepare('SELECT r.map_id,m.title,COUNT(*) reports FROM reports r JOIN maps m ON m.id=r.map_id GROUP BY r.map_id ORDER BY reports DESC').all());
 else if(['hide','restore'].includes(action)&&id){const result=db.prepare('UPDATE maps SET hidden=? WHERE id=?').run(action==='hide'?1:0,id);console.log('Updated maps:',result.changes);}
 else console.log('Usage: node server/moderate.mjs reports | hide <map-id> | restore <map-id>');
}finally{db.close();}
