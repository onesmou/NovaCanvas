import { requireAppUser } from '../../lib/selfhost-auth';
import Workbench from '../workbench';
export const dynamic='force-dynamic';
export default async function WorkbenchPage(){const user=await requireAppUser('/workbench');return <Workbench user={user}/>;}
