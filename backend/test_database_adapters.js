const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const baseDb = path.join(root,'backend/database/db.js');
const modelFile = path.join(root,'backend/models/userModel.js');
const storeFile = path.join(root,'backend/middleware/sessionStore.js');
const FakeSession = { Store: class {} };
function reset(){ for(const n of [baseDb,modelFile,storeFile]) delete require.cache[require.resolve(n)]; }
function wrap(store, name, ...args){return new Promise((resolve,reject)=>{store[name](...args,(err,data)=>err?reject(err):resolve(data));});}
(async()=>{
  const tempDir=fs.mkdtempSync(path.join(os.tmpdir(),'brightdesk-verify-'));
  process.env.DATABASE_URL=''; process.env.DATABASE_PATH=path.join(tempDir,'test.db');
  reset();
  const sqlite=require(baseDb);
  const localUsers=require(modelFile);
  const sqliteStore = new (require(storeFile)(FakeSession))(sqlite);
  const user=await localUsers.create({fullName:'Jane Doe',username:'janedoe',email:'jane@example.com',hashedPassword:'FAKE_HASH_FOR_QA'});
  assert.equal(user.email,'jane@example.com');
  assert.equal((await localUsers.findByEmail('jane@example.com')).password,'FAKE_HASH_FOR_QA');
  assert.equal((await localUsers.findByUsername('janedoe')).id,user.id);
  assert.equal((await localUsers.findById(user.id)).password,undefined);
  const sess={cookie:{expires:new Date(Date.now()+3600000)},userId:user.id};
  await wrap(sqliteStore,'set','sid1',sess);
  assert.equal((await wrap(sqliteStore,'get','sid1')).userId,user.id);
  await wrap(sqliteStore,'touch','sid1',sess);
  await wrap(sqliteStore,'destroy','sid1');
  assert.equal(await wrap(sqliteStore,'get','sid1'),null);
  sqlite.close(); fs.rmSync(tempDir,{recursive:true,force:true});
  console.log('PASS: SQLite fallback user CRUD and session set/get/touch/destroy');

  const origLoad=Module._load;
  class FakePool {
   constructor(opts) { this.options=opts; this.users=[]; this.sessions=new Map(); this.nextId=1; }
   on(){}
   async query(sql, p=[]) {
    const q=sql.trim().replace(/\s+/g,' ').toLowerCase();
    if(q.startsWith('insert into public.users')) {
      const u={id:this.nextId++,full_name:p[0],username:p[1],email:p[2],password:p[3],created_at:new Date()};this.users.push(u);
      return {rows:[{id:u.id,full_name:u.full_name,username:u.username,email:u.email,created_at:u.created_at}]};
    }
    if(q.startsWith('select * from public.users where email')) return {rows:this.users.filter(u=>u.email===p[0])};
    if(q.startsWith('select * from public.users where username'))return {rows:this.users.filter(u=>u.username===p[0])};
    if(q.startsWith('select id, full_name'))return {rows:this.users.filter(u=>u.id===p[0]).map(({password,...u})=>u)};
    if(q.startsWith('insert into public.sessions')) {this.sessions.set(p[0],{sess:p[1],expired_at:p[2]});return {rows:[]};}
    if(q.startsWith('select sess from public.sessions')) {const s=this.sessions.get(p[0]);return {rows:s&&s.expired_at>p[1]?[s]:[]};}
    if(q.startsWith('update public.sessions set expired_at')) {const s=this.sessions.get(p[0]);if(s)s.expired_at=p[1];return {rows:[]};}
    if(q.startsWith('delete from public.sessions where sid')){this.sessions.delete(p[0]);return {rows:[]};}
    if(q.startsWith('delete from public.sessions where expired_at')){for(const [sid,s] of this.sessions)if(s.expired_at<=p[0])this.sessions.delete(sid);return {rows:[]};}
    if(q.startsWith('select 1'))return {rows:[{ '?column?': 1 }]};
    throw Error('unexpected fake query: '+q);
   }
  }
  Module._load=function(request,parent,isMain){if(request==='pg')return {Pool:FakePool};return origLoad.apply(this,arguments)};
  process.env.DATABASE_URL='postgresql://postgres.example:secret@db.example.com:5432/postgres?sslmode=require';
  delete process.env.DATABASE_SSL; reset();
  const pool=require(baseDb); const pgUsers=require(modelFile);
  const pgStore=new (require(storeFile)(FakeSession))(pool);
  assert.equal(pool.options.ssl.rejectUnauthorized,true);
  assert.equal(pool.options.connectionString.includes('sslmode'),false);
  const newUser=await pgUsers.create({fullName:'Jane Doe',username:'janedoe',email:'jane@example.com',hashedPassword:'FAKE_HASH_FOR_QA'});
  assert.equal(newUser.email,'jane@example.com');
  assert.equal((await pgUsers.findByEmail('jane@example.com')).password,'FAKE_HASH_FOR_QA');
  assert.equal((await pgUsers.findByUsername('janedoe')).id,newUser.id);
  assert.equal((await pgUsers.findById(newUser.id)).password,undefined);
  await wrap(pgStore,'set','sid2',sess);
  assert.equal((await wrap(pgStore,'get','sid2')).userId,user.id);
  await wrap(pgStore,'touch','sid2',sess);
  await wrap(pgStore,'destroy','sid2');
  assert.equal(await wrap(pgStore,'get','sid2'),null);
  Module._load=origLoad;
  console.log('PASS: PostgreSQL mocked user CRUD, session set/get/touch/destroy, TLS config');
})().catch(e=>{console.error(e);process.exitCode=1});
