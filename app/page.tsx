import { requireAppUser } from '../lib/selfhost-auth';
import Workbench from './workbench';
export const dynamic='force-dynamic';
export default async function Home(){const user=await requireAppUser('/');return <Workbench user={user}/>;}
