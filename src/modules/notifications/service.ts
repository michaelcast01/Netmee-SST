import "server-only";

import type { CurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";

export async function syncNotificationsForUser(user: CurrentUser) {
  const db = getPrisma();
  const now = new Date();
  const in30Days = new Date(now); in30Days.setDate(in30Days.getDate() + 30);
  const candidates: Array<{ type: "PPE_EXPIRING"|"INSPECTION_PENDING"|"CORRECTIVE_ACTION_OVERDUE"|"CRITICAL_FINDING"; title:string; message:string; href:string; dedupeKey:string }> = [];

  if (hasPermission(user.permissions, "inventory.update")) {
    const items = await db.ppeItem.findMany({ where:{expiresAt:{lte:in30Days},status:{notIn:["RETIRADO","PERDIDO"]}},take:50,orderBy:{expiresAt:"asc"},include:{ppeType:{select:{name:true}}} });
    for (const item of items) candidates.push({type:"PPE_EXPIRING",title:"EPP vencido o próximo a vencer",message:`${item.ppeType.name} · ${item.qrCode} · ${item.expiresAt?.toLocaleDateString("es-CO")}`,href:`/inventario?q=${encodeURIComponent(item.qrCode)}`,dedupeKey:`ppe-expiry:${item.id}:${item.expiresAt?.toISOString().slice(0,10)}`});
  }
  if (hasPermission(user.permissions, "inspection.review")) {
    const inspections = await db.inspection.findMany({where:{status:"PENDIENTE_REVISION"},take:50,orderBy:{updatedAt:"asc"},select:{id:true,code:true}});
    for (const inspection of inspections) candidates.push({type:"INSPECTION_PENDING",title:"Inspección pendiente de revisión",message:inspection.code,href:`/inspecciones/${inspection.id}`,dedupeKey:`inspection-pending:${inspection.id}`});
  }
  const actions = await db.correctiveAction.findMany({where:{responsibleId:user.id,dueAt:{lt:now},status:{notIn:["COMPLETED","CANCELLED"]}},take:50,orderBy:{dueAt:"asc"},include:{incident:{select:{code:true}}}});
  for (const action of actions) candidates.push({type:"CORRECTIVE_ACTION_OVERDUE",title:"Acción correctiva vencida",message:`${action.incident.code} · venció ${action.dueAt.toLocaleDateString("es-CO")}`,href:"/novedades",dedupeKey:`action-overdue:${action.id}`});
  if (hasPermission(user.permissions,"corrective_action.manage")) {
    const incidents=await db.incident.findMany({where:{severity:"CRITICAL",status:{notIn:["RESOLVED","CLOSED"]}},take:50,orderBy:{createdAt:"desc"},select:{id:true,code:true,title:true}});
    for(const incident of incidents)candidates.push({type:"CRITICAL_FINDING",title:"Hallazgo crítico activo",message:`${incident.code} · ${incident.title}`,href:"/novedades",dedupeKey:`critical:${incident.id}`});
  }
  if (candidates.length) await db.$transaction(candidates.map(candidate=>db.notification.upsert({where:{userId_dedupeKey:{userId:user.id,dedupeKey:candidate.dedupeKey}},create:{userId:user.id,...candidate},update:{title:candidate.title,message:candidate.message,href:candidate.href}})));
}
