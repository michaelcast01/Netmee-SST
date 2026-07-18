import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type InspectionPdfData = {
  code: string; status: string; activity: string; worker: string; createdAt: Date;
  items: Array<{ name:string; required:boolean; compliant:boolean|null; observation:string|null }>;
  evidence: Array<{ fileName:string; checksum:string; retentionUntil:Date|null; legalHold:boolean }>;
  history: Array<{ fromStatus:string|null; toStatus:string; changedBy:string; reason:string|null; createdAt:Date }>;
  approvals: Array<{ decision:string; signerName:string; reviewerEmail:string; reason:string; signatureHash:string; signedAt:Date }>;
};

function safe(text:string){ return text.replace(/[→•–—]/g,"-"); }
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){
  const lines:string[]=[]; let line="";
  for(const word of safe(text).split(/\s+/)){const next=line?`${line} ${word}`:word;if(font.widthOfTextAtSize(next,size)<=maxWidth)line=next;else{if(line)lines.push(line);line=word;}}
  if(line)lines.push(line); return lines;
}

export async function createInspectionPdf(data:InspectionPdfData){
  const pdf=await PDFDocument.create();
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`Inspeccion ${data.code}`); pdf.setAuthor("NETMEE EPP Seguro");
  let page!:PDFPage; let y=0;
  const newPage=()=>{page=pdf.addPage([595.28,841.89]);y=795;page.drawText("NETMEE EPP SEGURO",{x:45,y,size:10,font:bold,color:rgb(0.31,0.2,0.68)});page.drawText(data.code,{x:430,y,size:9,font:regular});y-=30;};
  newPage();
  const ensure=(height:number)=>{if(y-height<55)newPage();};
  const heading=(text:string)=>{ensure(30);page.drawText(safe(text),{x:45,y,size:14,font:bold,color:rgb(0.07,0.1,0.18)});y-=23;};
  const line=(label:string,value:string)=>{ensure(18);page.drawText(`${safe(label)}:`,{x:45,y,size:9,font:bold});const lines=wrap(value,regular,9,390);lines.forEach((part,index)=>page.drawText(part,{x:145,y:y-index*13,size:9,font:regular}));y-=Math.max(18,lines.length*13);};

  heading("Resumen"); line("Codigo",data.code); line("Estado",data.status); line("Actividad",data.activity); line("Trabajador",data.worker); line("Creada",data.createdAt.toLocaleString("es-CO")); y-=8;
  heading("Lista de verificacion"); for(const item of data.items)line(item.required?"Obligatorio":"Complementario",`${item.name} - ${item.compliant===null?"Sin verificar":item.compliant?"Cumple":"No cumple"}${item.observation?` - ${item.observation}`:""}`); y-=8;
  heading("Evidencias y retencion"); if(!data.evidence.length)line("Evidencias","No registradas"); for(const evidence of data.evidence)line(evidence.fileName,`SHA-256 ${evidence.checksum} - retencion ${evidence.retentionUntil?.toLocaleDateString("es-CO")??"sin definir"}${evidence.legalHold?" - retencion legal activa":""}`); y-=8;
  heading("Firmas y aprobaciones"); if(!data.approvals.length)line("Firmas","No registradas"); for(const approval of data.approvals){line(approval.decision,`${approval.signerName} (${approval.reviewerEmail}) - ${approval.signedAt.toLocaleString("es-CO")}`);line("Motivo",approval.reason);line("Huella",approval.signatureHash);} y-=8;
  heading("Historial de cambios"); for(const entry of data.history)line(`${entry.fromStatus??"INICIO"} - ${entry.toStatus}`,`${entry.changedBy} - ${entry.createdAt.toLocaleString("es-CO")}${entry.reason?` - ${entry.reason}`:""}`);
  const pages=pdf.getPages(); pages.forEach((current,index)=>{current.drawLine({start:{x:45,y:42},end:{x:550,y:42},thickness:0.5,color:rgb(0.8,0.82,0.86)});current.drawText(`Documento generado desde la fuente transaccional - Pagina ${index+1} de ${pages.length}`,{x:45,y:27,size:8,font:regular,color:rgb(0.35,0.4,0.5)});});
  return pdf.save();
}
