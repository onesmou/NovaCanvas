// Backward-compatible exports for existing pages. Authentication is now fully self-hosted.
import { getCurrentUser, requireAppUser } from '../lib/selfhost-auth';
export type ChatGPTUser = { userId:string; displayName:string; email:string; fullName:string|null };
function mapUser(user:{id:string;name:string;email:string}):ChatGPTUser{return {userId:user.id,displayName:user.name,email:user.email,fullName:user.name};}
export async function getChatGPTUser(){const user=await getCurrentUser();return user?mapUser(user):null;}
export async function requireChatGPTUser(returnTo:string){return mapUser(await requireAppUser(returnTo));}
export function chatGPTSignOutPath(_returnTo = '/'){return '#';}
