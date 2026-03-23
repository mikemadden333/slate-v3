import type { VercelRequest, VercelResponse } from "@vercel/node";
import PptxGenJS from "pptxgenjs";

const NAVY="0D1B2A",GOLD="B79145",WHITE="FFFFFF",LIGHT="F7F5F1",GRAY="6B7280",GREEN="0B7A5E",RED="B91C1C",AMBER="B45309";

const $M=(n:number)=>`$${(n/1000).toFixed(1)}M`;
const $K=(n:number)=>`$${n.toLocaleString()}K`;
const fmtVar=(n:number)=>n>=0?`+${$K(n)}`:$K(n);
const varColor=(n:number)=>n>=0?GREEN:RED;

export default async function handler(req:VercelRequest,res:VercelResponse){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const{data,generatedBy}=req.body;
  if(!data)return res.status(400).json({error:"No data"});

  const pptx=new PptxGenJS();
  pptx.layout="LAYOUT_WIDE";

  const addLabel=(s:PptxGenJS.Slide,t:string)=>s.addText(t,{x:0.4,y:0.18,w:6,h:0.25,fontSize:9,bold:true,color:GOLD,charSpacing:3});
  const addTitle=(s:PptxGenJS.Slide,t:string,sub?:string)=>{
    s.addText(t,{x:0.4,y:0.45,w:12,h:0.6,fontSize:28,bold:true,color:NAVY,align:"left"});
    if(sub)s.addText(sub,{x:0.4,y:1.0,w:12,h:0.3,fontSize:13,color:GRAY,align:"left"});
  };
  const addKpi=(s:PptxGenJS.Slide,x:number,y:number,w:number,h:number,label:string,value:string,sub:string,vc:string=NAVY)=>{
    s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:0.08,fill:{color:LIGHT},line:{color:"E5E7EB",width:0.5}});
    s.addText(label,{x:x+0.15,y:y+0.12,w:w-0.3,h:0.25,fontSize:8,bold:true,color:GRAY,charSpacing:2});
    s.addText(value,{x:x+0.15,y:y+0.35,w:w-0.3,h:0.55,fontSize:24,bold:true,color:vc,fontFace:"Calibri"});
    s.addText(sub,{x:x+0.15,y:y+0.88,w:w-0.3,h:0.2,fontSize:9,color:GRAY});
  };

  // Slide 1 — Title
  const s1=pptx.addSlide();
  s1.addShape(pptx.ShapeType.rect,{x:0,y:0,w:"100%",h:"100%",fill:{color:NAVY}});
  s1.addShape(pptx.ShapeType.rect,{x:0,y:5.2,w:"100%",h:0.8,fill:{color:GOLD}});
  s1.addText(data.networkName??"Veritas Charter Schools",{x:0.6,y:1.0,w:11,h:0.6,fontSize:16,color:GOLD,bold:true,charSpacing:4,align:"left"});
  s1.addText("Finance & Audit\nCommittee Report",{x:0.6,y:1.7,w:11,h:2.0,fontSize:48,bold:true,color:WHITE,fontFace:"Calibri",align:"left",lineSpacingMultiple:1.1});
  s1.addText(data.reportingPeriod,{x:0.6,y:3.8,w:6,h:0.4,fontSize:18,color:"CADCFC",align:"left"});
  s1.addText(`${data.fiscalYear} · ${data.monthsElapsed} Months Elapsed`,{x:0.6,y:4.25,w:6,h:0.3,fontSize:13,color:GRAY,align:"left"});
  s1.addText("CONFIDENTIAL — BOARD USE ONLY",{x:0.6,y:5.35,w:8,h:0.3,fontSize:10,bold:true,color:NAVY,charSpacing:2});

  // Slide 2 — Executive Summary
  const s2=pptx.addSlide();
  s2.addShape(pptx.ShapeType.rect,{x:0,y:0,w:"100%",h:1.35,fill:{color:NAVY}});
  addLabel(s2,"EXECUTIVE SUMMARY");
  addTitle(s2,"At a Glance");
  s2.addText(data.overallAssessment,{x:0.4,y:0.85,w:12,h:0.4,fontSize:12,color:LIGHT,align:"left",italic:true});
  addKpi(s2,0.4,1.5,2.9,1.3,"OPERATIONAL SURPLUS",$M(data.revenueMinusExpenses.actual),`${fmtVar(data.revenueMinusExpenses.variance)} vs budget`,varColor(data.revenueMinusExpenses.variance));
  addKpi(s2,3.52,1.5,2.9,1.3,"NET INCOME",$M(data.netIncome.actual),`${fmtVar(data.netIncome.variance)} vs budget`,varColor(data.netIncome.variance));
  addKpi(s2,6.64,1.5,2.9,1.3,"DAYS CASH ON HAND",String(Math.round(data.daysOfCashOnHand)),"120 day covenant",data.daysOfCashOnHand>=120?GREEN:RED);
  addKpi(s2,9.76,1.5,2.85,1.3,"DSCR",`${data.dscr?.toFixed(2)}x`,`${data.dscrCovenant}x covenant`,data.dscr>=data.dscrCovenant?GREEN:RED);
  s2.addText("KEY HIGHLIGHTS",{x:0.4,y:3.0,w:12,h:0.25,fontSize:8,bold:true,color:GOLD,charSpacing:3});
  (data.highlights??[]).slice(0,5).forEach((h:string,i:number)=>{
    s2.addText(`• ${h}`,{x:0.4,y:3.3+i*0.38,w:12,h:0.32,fontSize:11,color:NAVY});
  });

  // Slide 3 — P&L
  const s3=pptx.addSlide();
  s3.addShape(pptx.ShapeType.rect,{x:0,y:0,w:"100%",h:1.35,fill:{color:NAVY}});
  addLabel(s3,"FINANCIAL PERFORMANCE");
  addTitle(s3,"Profit & Loss — YTD",`For the ${data.monthsElapsed} months ended ${data.reportingPeriod} ($000s)`);
  const mkRow=(label:string,m:{actual:number,budget:number,variance:number},bold=false,hdr=false)=>{
    const bg=hdr?NAVY:WHITE,col=hdr?WHITE:NAVY;
    return[
      {text:label,options:{bold:bold||hdr,color:col,fill:{color:bg},align:"left",fontSize:10,margin:[4,8,4,8]}},
      {text:hdr?"Actual":$K(m.actual),options:{bold:bold||hdr,color:col,fill:{color:bg},align:"right",fontSize:10,margin:[4,8,4,8]}},
      {text:hdr?"Budget":$K(m.budget),options:{bold:bold||hdr,color:col,fill:{color:bg},align:"right",fontSize:10,margin:[4,8,4,8]}},
      {text:hdr?"Variance":fmtVar(m.variance),options:{bold:bold||hdr,color:hdr?WHITE:varColor(m.variance),fill:{color:bg},align:"right",fontSize:10,margin:[4,8,4,8]}},
    ];
  };
  s3.addTable([
    mkRow("",{actual:0,budget:0,variance:0},false,true),
    mkRow("Operational Revenues",data.operationalRevenues,true),
    mkRow("Operational Expenses",data.operationalExpenses,true),
    mkRow("  Personnel",data.personnel),
    mkRow("  Non-Personnel",data.nonPersonnel),
    mkRow("Revenue Minus Expenses",data.revenueMinusExpenses,true),
    mkRow("Net Income / (Deficit)",data.netIncome,true),
  ],{x:0.4,y:1.5,w:7.5,colW:[3.8,1.2,1.2,1.2],fontSize:10,border:{type:"solid",color:"E5E7EB",pt:0.5},rowH:0.42});
  s3.addShape(pptx.ShapeType.roundRect,{x:8.1,y:1.5,w:4.5,h:2.0,rectRadius:0.08,fill:{color:"EFF6FF"},line:{color:"BFDBFE",width:0.5}});
  s3.addText("Revenue",{x:8.3,y:1.65,w:4.1,h:0.25,fontSize:9,bold:true,color:"1D4ED8",charSpacing:2});
  s3.addText(data.revenueNote,{x:8.3,y:1.95,w:4.1,h:1.1,fontSize:10,color:NAVY,wrap:true});
  s3.addShape(pptx.ShapeType.roundRect,{x:8.1,y:3.65,w:4.5,h:2.0,rectRadius:0.08,fill:{color:"FFFBEB"},line:{color:"FDE68A",width:0.5}});
  s3.addText("Expenses",{x:8.3,y:3.8,w:4.1,h:0.25,fontSize:9,bold:true,color:AMBER,charSpacing:2});
  s3.addText(data.expenseNote,{x:8.3,y:4.1,w:4.1,h:1.2,fontSize:10,color:NAVY,wrap:true});

  // Slide 4 — Balance Sheet
  const s4=pptx.addSlide();
  s4.addShape(pptx.ShapeType.rect,{x:0,y:0,w:"100%",h:1.35,fill:{color:NAVY}});
  addLabel(s4,"BALANCE SHEET");
  addTitle(s4,"Financial Position",`As of ${data.reportingPeriod} ($000s)`);
  addKpi(s4,0.4,1.5,3.8,1.3,"TOTAL ASSETS",$M(data.totalAssets),"Current + long-term");
  addKpi(s4,4.4,1.5,3.8,1.3,"TOTAL LIABILITIES",$M(data.totalLiabilities),"Current + long-term");
  addKpi(s4,8.4,1.5,4.2,1.3,"NET ASSETS",$M(data.netAssets),"Assets minus liabilities",data.netAssets>0?GREEN:RED);
  addKpi(s4,0.4,3.0,3.8,1.3,"CASH & INVESTMENTS",$M(data.cashAndInvestments),"Unrestricted + restricted");
  addKpi(s4,4.4,3.0,3.8,1.3,"DAYS CASH ON HAND",`${Math.round(data.daysOfCashOnHand)} days`,"120-day minimum",data.daysOfCashOnHand>=120?GREEN:RED);
  addKpi(s4,8.4,3.0,4.2,1.3,"CURRENT RATIO",`${data.currentRatio?.toFixed(2)}x`,`${data.currentRatioCovenant}x minimum`,data.currentRatio>=data.currentRatioCovenant?GREEN:RED);

  // Slide 5 — Covenants
  const s5=pptx.addSlide();
  s5.addShape(pptx.ShapeType.rect,{x:0,y:0,w:"100%",h:1.35,fill:{color:NAVY}});
  addLabel(s5,"COVENANT COMPLIANCE");
  addTitle(s5,"Bond Covenant Status",`All metrics as of ${data.reportingPeriod}`);
  const dp=data.dscr>=data.dscrCovenant;
  s5.addShape(pptx.ShapeType.roundRect,{x:0.4,y:1.5,w:5.5,h:2.2,rectRadius:0.1,fill:{color:dp?"ECFDF5":"FEF2F2"},line:{color:dp?"6EE7B7":"FCA5A5",width:1}});
  s5.addText("DEBT SERVICE COVERAGE RATIO",{x:0.65,y:1.7,w:5,h:0.25,fontSize:8,bold:true,color:dp?GREEN:RED,charSpacing:2});
  s5.addText(`${data.dscr?.toFixed(2)}x`,{x:0.65,y:1.95,w:5,h:0.8,fontSize:48,bold:true,color:dp?GREEN:RED,fontFace:"Calibri"});
  s5.addText(`Required: ${data.dscrCovenant}x · ${dp?"✓ PASS":"✗ FAIL"}`,{x:0.65,y:2.85,w:5,h:0.3,fontSize:11,color:dp?GREEN:RED,bold:true});
  const cp=data.currentRatio>=data.currentRatioCovenant;
  s5.addShape(pptx.ShapeType.roundRect,{x:6.2,y:1.5,w:5.5,h:2.2,rectRadius:0.1,fill:{color:cp?"ECFDF5":"FEF2F2"},line:{color:cp?"6EE7B7":"FCA5A5",width:1}});
  s5.addText("CURRENT RATIO",{x:6.45,y:1.7,w:5,h:0.25,fontSize:8,bold:true,color:cp?GREEN:RED,charSpacing:2});
  s5.addText(`${data.currentRatio?.toFixed(2)}x`,{x:6.45,y:1.95,w:5,h:0.8,fontSize:48,bold:true,color:cp?GREEN:RED,fontFace:"Calibri"});
  s5.addText(`Required: ${data.currentRatioCovenant}x · ${cp?"✓ PASS":"✗ FAIL"}`,{x:6.45,y:2.85,w:5,h:0.3,fontSize:11,color:cp?GREEN:RED,bold:true});

  // Slide 6 — CFO Narrative
  const s6=pptx.addSlide();
  s6.addShape(pptx.ShapeType.rect,{x:0,y:0,w:"100%",h:1.35,fill:{color:NAVY}});
  addLabel(s6,"CFO NARRATIVE");
  addTitle(s6,"Financial Assessment",`Period ending ${data.reportingPeriod}`);
  s6.addShape(pptx.ShapeType.roundRect,{x:0.4,y:1.5,w:12.2,h:1.0,rectRadius:0.08,fill:{color:"F0F9FF"},line:{color:"BAE6FD",width:0.5}});
  s6.addText(data.overallAssessment,{x:0.65,y:1.65,w:11.7,h:0.72,fontSize:13,color:NAVY,italic:true});
  s6.addShape(pptx.ShapeType.roundRect,{x:0.4,y:2.7,w:5.9,h:2.8,rectRadius:0.08,fill:{color:LIGHT},line:{color:"E5E7EB",width:0.5}});
  s6.addText("REVENUE",{x:0.65,y:2.88,w:5.4,h:0.22,fontSize:8,bold:true,color:GOLD,charSpacing:2});
  s6.addText(data.revenueNote,{x:0.65,y:3.18,w:5.4,h:2.15,fontSize:11,color:NAVY,wrap:true});
  s6.addShape(pptx.ShapeType.roundRect,{x:6.7,y:2.7,w:5.9,h:2.8,rectRadius:0.08,fill:{color:LIGHT},line:{color:"E5E7EB",width:0.5}});
  s6.addText("EXPENSES",{x:6.95,y:2.88,w:5.4,h:0.22,fontSize:8,bold:true,color:GOLD,charSpacing:2});
  s6.addText(data.expenseNote,{x:6.95,y:3.18,w:5.4,h:2.15,fontSize:11,color:NAVY,wrap:true});

  // Slide 7 — Close
  const s7=pptx.addSlide();
  s7.addShape(pptx.ShapeType.rect,{x:0,y:0,w:"100%",h:"100%",fill:{color:NAVY}});
  s7.addShape(pptx.ShapeType.rect,{x:0,y:4.8,w:"100%",h:0.6,fill:{color:GOLD}});
  s7.addText("QUESTIONS & DISCUSSION",{x:0.6,y:1.8,w:11,h:0.5,fontSize:13,color:GOLD,bold:true,charSpacing:5,align:"center"});
  s7.addText(data.networkName,{x:0.6,y:2.4,w:11,h:1.0,fontSize:40,bold:true,color:WHITE,fontFace:"Calibri",align:"center"});
  s7.addText(`Finance & Audit Committee · ${data.reportingPeriod}`,{x:0.6,y:3.5,w:11,h:0.4,fontSize:14,color:"CADCFC",align:"center"});
  s7.addText("Generated by Slate Intelligence Platform",{x:0.6,y:4.88,w:11,h:0.3,fontSize:10,color:NAVY,bold:true,align:"center"});

  try{
    const base64=await pptx.write({outputType:"base64"}) as string;
    return res.json({
      success:true,
      base64,
      filename:`${(data.networkName??"Report").replace(/\s+/g,"_")}_Board_Deck_${(data.reportingPeriod??"").replace(/\s+/g,"_")}.pptx`,
      slides:7,
    });
  }catch(err){
    console.error("Board deck error:", err);
    return res.status(500).json({error:String(err), stack: err instanceof Error ? err.stack : undefined});
  }
}
