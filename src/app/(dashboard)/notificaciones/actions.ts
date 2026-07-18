"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";
export async function markNotificationRead(formData:FormData){const user=await requireUser();const id=String(formData.get("id")??"");await getPrisma().notification.updateMany({where:{id,userId:user.id},data:{readAt:new Date()}});revalidatePath("/notificaciones");}
export async function markAllNotificationsRead(){const user=await requireUser();await getPrisma().notification.updateMany({where:{userId:user.id,readAt:null},data:{readAt:new Date()}});revalidatePath("/notificaciones");}
