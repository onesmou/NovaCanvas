import { randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db, ensureSelfHostedSchema } from './selfhost-db';

const scrypt = promisify(nodeScrypt); const COOKIE = 'novacanvas_session'; const DAYS = 14;
export type AppUser = { id:string; email:string; name:string; role:'owner'|'admin'|'member'; credits:number };

async function passwordHash(password:string, salt = randomBytes(16).toString('hex')) { const key = await scrypt(password, salt, 64) as Buffer; return `scrypt$${salt}$${key.toString('hex')}`; }
async function passwordMatches(password:string, stored:string) { const [,salt,hash] = stored.split('$'); if (!salt || !hash) return false; const actual = await passwordHash(password, salt); const actualBuffer=Buffer.from(actual); const storedBuffer=Buffer.from(stored); return actualBuffer.length===storedBuffer.length&&timingSafeEqual(actualBuffer,storedBuffer); }
export async function createUser(email:string, name:string, password:string, role:AppUser['role']='member') { if(password.length<10) throw new Error('密码至少需要 10 位'); await ensureSelfHostedSchema(); const sql=db(); const id=randomUUID(); const hash=await passwordHash(password); const rows=await sql<AppUser[]>`INSERT INTO app_users (id,email,name,password_hash,role) VALUES (${id},${email.toLowerCase()},${name},${hash},${role}) RETURNING id,email,name,role,credits`; return rows[0]; }
export async function createSession(userId:string) { await ensureSelfHostedSchema(); const id=randomUUID(); const expires=new Date(Date.now()+DAYS*86400000); await db()`INSERT INTO app_sessions (id,user_id,expires_at) VALUES (${id},${userId},${expires})`; const jar=await cookies(); jar.set(COOKIE,id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',expires,path:'/'}); }
export async function getCurrentUser():Promise<AppUser|null> { await ensureSelfHostedSchema(); const sid=(await cookies()).get(COOKIE)?.value; if(!sid)return null; const rows=await db()<AppUser[]>`SELECT u.id,u.email,u.name,u.role,u.credits FROM app_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.id=${sid} AND s.expires_at>now() LIMIT 1`; return rows[0]??null; }
export async function login(email:string,password:string) { await ensureSelfHostedSchema(); const rows=await db()<(AppUser & {password_hash:string})[]>`SELECT id,email,name,role,credits,password_hash FROM app_users WHERE email=${email.toLowerCase()} LIMIT 1`; const user=rows[0]; if(!user || !(await passwordMatches(password,user.password_hash))) return null; await createSession(user.id); return user; }
export async function signOut(){const jar=await cookies();const sid=jar.get(COOKIE)?.value;if(sid){await ensureSelfHostedSchema();await db()`DELETE FROM app_sessions WHERE id=${sid}`;}jar.delete(COOKIE);}
export async function requireAppUser(returnTo='/'){const user=await getCurrentUser();if(user)return user;redirect(`/login?next=${encodeURIComponent(returnTo)}`);}
export async function requireAdmin(returnTo='/admin'){const user=await requireAppUser(returnTo);if(user.role==='owner'||user.role==='admin')return user;redirect('/?error=forbidden');}
