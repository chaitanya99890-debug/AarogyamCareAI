import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from 'file:///C:/Users/athar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';

const workspaceDir = 'C:/Users/athar/AarogyamCareAI';
const skillDir = 'C:/Users/athar/.codex/plugins/cache/openai-primary-runtime/presentations/26.1020.11127/skills/presentations';
const stagingDir = path.join(workspaceDir, '.codex-finalizer');
const finalPath = path.join(workspaceDir, 'output', 'AarogyamCareAI_MCA_Review_II_v2.pptx');
const nodePython = 'C:/Users/athar/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';

const C = {
  navy: '#132039', ink: '#1F2937', blue: '#2563EB', orange: '#E07B1F',
  teal: '#0F766E', white: '#FFFFFF', gray: '#E5E7EB', muted: '#6B7280',
  paleBlue: '#DBEAFE', paleOrange: '#FFEDD5', paleTeal: '#CCFBF1', paleGreen: '#DCFCE7'
};
const F = 'Calibri';
const ppt = Presentation.create({ slideSize: { width: 1280, height: 720 } });

function rect(s, x, y, w, h, fill, radius = false, line = 'none') {
  return s.shapes.add({ geometry: radius ? 'roundRect' : 'rect', position: { left:x, top:y, width:w, height:h }, fill, line: { style:'solid', fill:line, width: line === 'none' ? 0 : 1 }, borderRadius: radius ? 'rounded-xl' : undefined });
}
function text(s, value, x, y, w, h, size=18, color=C.ink, bold=false, align='left') {
  const q = s.shapes.add({ geometry:'textbox', position:{left:x,top:y,width:w,height:h}, fill:'none', line:{style:'solid',fill:'none',width:0} });
  q.text = value;
  q.text.style = { typeface:F, fontSize:size, color, bold, align, marginLeft:0, marginRight:0, marginTop:0, marginBottom:0, verticalAlignment:'middle' };
  return q;
}
function line(s,x1,y1,x2,y2,color=C.gray,width=2) {
  return s.shapes.add({ geometry:'line', position:{left:Math.min(x1,x2),top:Math.min(y1,y2),width:Math.abs(x2-x1),height:Math.abs(y2-y1)}, line:{style:'solid',fill:color,width} });
}
function dot(s,n,x,y,color=C.blue) { rect(s,x,y,34,34,color,true); text(s,String(n),x,y+1,34,28,16,C.white,true,'center'); }
function header(s, title, number) {
  s.background.fill = C.white;
  rect(s,0,0,1280,52,C.navy);
  text(s,'AAROGYAMCAREAI  |  MCA MINI PROJECT – REVIEW II',56,14,720,22,12,C.white,true);
  text(s,title,56,78,1000,45,30,C.navy,true);
  rect(s,56,132,76,5,C.orange);
  text(s,String(number).padStart(2,'0'),1160,666,60,24,12,C.muted,true,'right');
}
function pill(s,label,x,y,w,color) { rect(s,x,y,w,30,color,true); text(s,label,x,y+2,w,22,12,C.white,true,'center'); }
function addArrow(s,x,y,w,color=C.orange) { text(s,'›',x,y-6,w,34,32,color,true,'center'); }
function moduleBox(s,n,title,body,x,y,w,h,color) {
  rect(s,x,y,w,h,C.white,true,C.gray);
  dot(s,n,x+18,y+18,color);
  text(s,title,x+66,y+18,w-84,28,18,C.navy,true);
  text(s,body,x+20,y+66,w-40,h-78,14,C.ink,false);
}
function flowBox(s,label,x,y,w,color) { rect(s,x,y,w,52,color,true); text(s,label,x+8,y+7,w-16,38,14,C.white,true,'center'); }

// 1 Cover
{
 const s=ppt.slides.add(); s.background.fill=C.navy;
 rect(s,0,0,1280,720,C.navy); rect(s,0,0,18,720,C.orange); rect(s,75,112,7,358,C.orange);
 text(s,'MCA MINI PROJECT – REVIEW II',108,112,480,24,15,C.orange,true);
 text(s,'AarogyamCareAI',106,164,720,72,48,C.white,true);
 text(s,'AI-powered healthcare-information companion',108,246,650,42,25,'#DCE7F8',false);
 text(s,'Health information, predictions and appointments\nin one authenticated application.',108,318,600,64,19,'#DCE7F8',false);
 text(s,'[Student Name]  |  [Roll Number]',108,500,480,25,16,C.white,true);
 text(s,'Guide: [Guide Name]\n[College Name]',108,540,480,52,15,'#CBD5E1',false);
 // editable decorative medical / AI network
 rect(s,850,148,280,280,'#1E3A5F',true); rect(s,895,193,190,190,C.white,true);
 text(s,'AI',935,225,110,74,52,C.blue,true,'center');
 text(s,'HEALTHCARE',910,309,160,20,14,C.teal,true,'center');
 for (const [x,y,label,c] of [[820,170,'CHAT',C.blue],[1084,150,'ML',C.orange],[1114,385,'REPORT',C.teal],[808,410,'APPT',C.orange]]) { rect(s,x,y,100,44,c,true); text(s,label,x,y+10,100,20,12,C.white,true,'center'); }
 line(s,910,192,895,230,'#93C5FD',3); line(s,1084,194,1080,232,'#FDBA74',3); line(s,1050,362,1115,402,'#5EEAD4',3); line(s,895,352,855,410,'#FDBA74',3);
 text(s,'Informational support only. Not a replacement for medical diagnosis or emergency care.',108,660,860,22,11,'#93C5FD',false);
}

// 2 Problem
{
 const s=ppt.slides.add(); header(s,'Problem, Need and Objectives',2);
 text(s,'Existing challenges',56,165,440,28,20,C.navy,true); text(s,'AarogyamCareAI response',676,165,460,28,20,C.navy,true);
 const left=[['Fragmented information','Reports, appointments and guidance sit in separate tools.'],['Difficult terminology','Medical-report language may be hard for users to understand.'],['Disconnected history','Chat, prediction and appointment records are not unified.']];
 const right=[['Unified health support','One authenticated application for personal health workflows.'],['AI-assisted information','Gemini-powered chat and structured report analysis.'],['Personal records','Predictions, reports and appointments are linked to the user.']];
 left.forEach((v,i)=>{ const y=214+i*118; moduleBox(s,i+1,v[0],v[1],56,y,510,94,C.orange); });
 right.forEach((v,i)=>{ const y=214+i*118; moduleBox(s,i+1,v[0],v[1],676,y,510,94,C.blue); });
 rect(s,56,592,1130,52,C.paleTeal,true); text(s,'Objective: provide educational health information, model-supported predictions, report summaries and appointment support in one secure workflow.',78,606,1085,24,15,C.teal,true,'center');
}

// 3 Architecture
{
 const s=ppt.slides.add(); header(s,'Architecture and Technology Stack',3);
 const boxes=[['Web Browser','React 19\nTypeScript · Vite\nTailwind CSS',56,C.blue],['Node.js + Express','Authentication · API\nGemini integration\nAppointments',350,C.navy],['MySQL','Users · sessions\nprofiles · chat · reports\npredictions · appointments',644,C.teal]];
 boxes.forEach((b,i)=>{rect(s,b[2],195,238,148,C.white,true,C.gray); rect(s,b[2],195,238,38,b[3],true); text(s,b[0],b[2]+12,203,214,22,16,C.white,true,'center'); text(s,b[1],b[2]+22,248,194,76,15,C.ink,false,'center'); if(i<2) addArrow(s,b[2]+248,245,46);});
 rect(s,939,195,246,148,C.paleOrange,true); text(s,'Python FastAPI ML Service',961,214,202,24,16,C.orange,true,'center'); text(s,'Disease prediction\nCardiovascular risk model\nscikit-learn artifacts',961,257,202,64,15,C.ink,false,'center'); line(s,882,270,938,270,C.orange,3);
 text(s,'External services',56,414,240,26,20,C.navy,true);
 rect(s,56,457,350,96,C.paleBlue,true); text(s,'Google Gemini API',80,474,300,22,17,C.blue,true); text(s,'Informational chatbot and structured report analysis',80,505,300,22,14,C.ink,false);
 rect(s,442,457,350,96,C.paleOrange,true); text(s,'Twilio',466,474,300,22,17,C.orange,true); text(s,'Optional consent-based SMS appointment reminders',466,505,300,22,14,C.ink,false);
 rect(s,828,457,357,96,C.paleTeal,true); text(s,'Security boundary',852,474,308,22,17,C.teal,true); text(s,'Gemini and database credentials remain server-side',852,505,308,22,14,C.ink,false);
 pill(s,'Frontend: React + TypeScript',56,610,215,C.blue); pill(s,'Backend: Node + Express',290,610,210,C.navy); pill(s,'ML: Python + FastAPI',520,610,196,C.teal); pill(s,'Database: MySQL',735,610,160,C.orange); pill(s,'AI: Gemini',914,610,125,C.blue);
}

// 4 Modules
{
 const s=ppt.slides.add(); header(s,'Implementation: Main Modules',4);
 const mods=[['Authentication and Roles','Registration, login, password hashing, sessions and user/admin access control.',C.blue],['Health Profile','Personal health details, allergies, conditions and emergency contact fields.',C.teal],['AI Health Assistant','Gemini-powered educational chat with stored conversation history.',C.orange],['Disease and Risk Prediction','Symptom-based possible-condition prediction and cardiovascular risk estimation.',C.blue],['Medical Report Analysis','PDF, PNG and JPEG input with structured informational summary.',C.teal],['Appointments and Administration','Scheduling, consent-based reminders and protected admin monitoring.',C.orange]];
 mods.forEach((m,i)=>{const col=i%2,row=Math.floor(i/2); moduleBox(s,i+1,m[0],m[1],56+col*574,172+row*144,538,116,m[2]);});
 text(s,'All health-related results remain educational outputs and require professional medical interpretation.',56,642,1130,24,14,C.muted,false,'center');
}

// 5 Database
{
 const s=ppt.slides.add(); header(s,'Database Design: MySQL Persistence',5);
 rect(s,500,170,250,58,C.navy,true); text(s,'users',500,183,250,30,22,C.white,true,'center');
 const entities=[['auth_sessions',74,296,C.blue],['health_profiles',300,296,C.teal],['chat_conversations',526,296,C.orange],['disease_predictions',804,296,C.blue],['risk_assessments',1030,296,C.teal],['medical_reports',332,434,C.orange],['appointments',612,434,C.blue],['admin_audit_logs',892,434,C.teal],['report_analyses',272,554,C.orange],['chat_messages',550,554,C.blue],['appointment_sms_logs',828,554,C.teal]];
 entities.forEach(([label,x,y,c])=>{ line(s,625,228,x+88,y,c,2); rect(s,x,y,176,48,C.white,true,c); text(s,label,x+8,y+13,160,20,14,C.ink,true,'center'); });
 text(s,'1 : M',633,242,55,18,11,C.muted,true,'center');
 rect(s,55,640,1130,32,C.paleTeal,true); text(s,'11 related tables in MySQL: user-owned records, foreign-key links, session handling and audit support.',65,647,1110,18,13,C.teal,true,'center');
}

// 6 How it works
{
 const s=ppt.slides.add(); header(s,'How It Works',6);
 text(s,'AI and ML health support',56,166,420,26,20,C.navy,true);
 const a=[['Login',56,98,C.navy],['Enter health input',214,136,C.blue],['Validation',398,110,C.teal],['Gemini or ML service',550,158,C.orange],['Informational result',754,145,C.blue],['Save history',938,118,C.teal]];
 a.forEach((v,i)=>{flowBox(s,v[0],v[1],214,v[2],v[3]); if(i<a.length-1)addArrow(s,v[1]+v[2],224,60);});
 text(s,'Appointment support',56,366,420,26,20,C.navy,true);
 const b=[['Login',56,98,C.navy],['Appointment details',214,145,C.blue],['Consent for SMS',405,135,C.teal],['Store appointment',585,140,C.orange],['Scheduler checks',770,128,C.blue],['Optional Twilio SMS',944,175,C.teal]];
 b.forEach((v,i)=>{flowBox(s,v[0],v[1],414,v[2],v[3]); if(i<b.length-1)addArrow(s,v[1]+v[2],424,60);});
 rect(s,56,572,1129,48,C.paleOrange,true); text(s,'Outputs provide educational information. The application does not diagnose conditions, prescribe treatment or replace emergency care.',76,586,1088,18,14,C.orange,true,'center');
}

// 7 Security
{
 const s=ppt.slides.add(); header(s,'Security and Data Handling',7);
 const data=[['Authentication','Password hashing, secure session tokens and expiry handling.',C.blue],['Authorization','Protected routes with separate user and administrator access.',C.orange],['Sensitive data','User-specific data isolation with server-side API keys.',C.teal],['Input validation','File checks, prediction input validation, consent and E.164 phone validation.',C.navy]];
 data.forEach((m,i)=>{const col=i%2,row=Math.floor(i/2),x=56+col*574,y=190+row*178; rect(s,x,y,538,145,C.white,true,C.gray); rect(s,x,y,12,145,m[2]); text(s,m[0],x+40,y+34,440,28,21,C.navy,true); text(s,m[1],x+40,y+78,450,38,16,C.ink,false);});
 rect(s,56,574,1129,55,C.paleOrange,true); text(s,'Production deployment requires further privacy, consent, retention, compliance, monitoring and backup controls.',80,591,1080,22,15,C.orange,true,'center');
}

// 8 Testing
{
 const s=ppt.slides.add(); header(s,'Testing Approach and Project Evidence',8);
 const test=[['Frontend validation','Form validation, errors and safe user feedback.',C.blue],['API and authentication','Session, authorization and service behaviour checks.',C.teal],['ML service tests','Prediction input validation and model-serving regression tests.',C.orange],['Browser smoke tests','Selenium page-object tests for critical user flows.',C.blue],['Manual functional suite','Login, chat, reports, appointments and administration test cases.',C.teal]];
 test.forEach((m,i)=>{const y=176+i*78; rect(s,70,y,34,34,m[2],true); text(s,'✓',70,y+4,34,24,17,C.white,true,'center'); text(s,m[0],126,y,310,24,17,C.navy,true); text(s,m[1],450,y,650,24,15,C.ink,false); line(s,70,y+55,1140,y+55,C.gray,1);});
 rect(s,70,580,1070,50,C.paleOrange,true); text(s,'Evidence boundary: automation assets and test plans exist; complete execution results must be collected in a configured local environment.',92,594,1024,20,14,C.orange,true,'center');
}

// 9 Limitations
{
 const s=ppt.slides.add(); header(s,'Limitations and Future Work',9);
 text(s,'Current limitations',56,170,450,28,22,C.navy,true); text(s,'Future work',675,170,450,28,22,C.navy,true);
 const left=['Informational system; not clinical diagnosis.','ML datasets require clinical validation and bias review.','Gemini and Twilio require network configuration.','Production hosting, load testing and accessibility work remain pending.'];
 const right=['Clinician review workflows and clearer safety escalation.','Calibration, fairness analysis and explainable prediction output.','Multilingual support and improved accessibility.','Encrypted managed storage, monitoring, backup and automated testing.'];
 left.forEach((t,i)=>{const y=224+i*82; rect(s,56,y,530,62,C.paleOrange,true); text(s,'!',78,y+17,22,20,18,C.orange,true,'center'); text(s,t,116,y+11,442,40,15,C.ink,false);});
 right.forEach((t,i)=>{const y=224+i*82; rect(s,675,y,510,62,C.paleTeal,true); text(s,'+',697,y+17,22,20,19,C.teal,true,'center'); text(s,t,735,y+11,425,40,15,C.ink,false);});
}

// 10 Conclusion
{
 const s=ppt.slides.add(); s.background.fill=C.navy; rect(s,0,0,1280,720,C.navy); rect(s,0,0,18,720,C.orange);
 text(s,'Conclusion',82,92,560,48,34,C.white,true); rect(s,82,153,80,5,C.orange);
 text(s,'AarogyamCareAI combines a React interface, Node/Express services, MySQL persistence, FastAPI prediction models and server-side Gemini integration in one healthcare-information application.',82,205,790,104,24,'#DCE7F8',false);
 const points=[['Centralized support','Health profile, chat, reports, predictions and appointments in one account.'],['AI-assisted information','Gemini supports educational chat and report summaries.'],['Educational ML workflows','Disease and cardiovascular risk features include explicit safety limits.']];
 points.forEach((p,i)=>{const y=362+i*74; rect(s,84,y,15,48,[C.blue,C.orange,C.teal][i],true); text(s,p[0],124,y,330,22,18,C.white,true); text(s,p[1],124,y+26,640,28,14,'#CBD5E1',false);});
 rect(s,936,180,220,220,'#1E3A5F',true); text(s,'Thank\nYou',956,225,180,72,36,C.white,true,'center'); text(s,'Questions?',956,328,180,26,20,C.orange,true,'center');
 text(s,'AarogyamCareAI  |  MCA Mini Project – Review II',82,665,500,20,12,'#93C5FD',true);
}

async function main() {
  await fs.mkdir(stagingDir,{recursive:true}); await fs.mkdir(path.dirname(finalPath),{recursive:true});
  const candidatePath=path.join(stagingDir,'aarogyamcareai-candidate.pptx');
  await (await PresentationFile.exportPptx(ppt)).save(candidatePath);
  const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir,'container_tools','artifact_tool_utils.mjs')).href);
  const result=await finalizePresentation({
    explicitTotalSlideCount:10, workspaceDir, candidatePath, finalPath, pythonExecutable:nodePython,
    integrityValidatorPath:path.join(skillDir,'container_tools','inspect_presentation_package_integrity.py'),
    layoutValidatorPath:path.join(skillDir,'container_tools','inspect_presentation_layout_geometry.py'),
    layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
    fontPolicy:{basis:'reference',families:['Calibri'],referencePath:'D:\\Download\\Edited_PPT-1 (1).pptx',referenceSha256:'f684b4b349bdfb0bb79fc731e86a2c8c012dae8c917b0adc7845c1bd15a5bb2f'},
    verifyArtifactToolImport:true, receiptPath:path.join(stagingDir,'AarogyamCareAI_MCA_Review_II_v2.validation.json')
  });
  console.log(JSON.stringify(result,null,2));
  for (const [i,slide] of ppt.slides.items.entries()) {
    const png=await ppt.export({slide,format:'png',scale:1});
    await fs.writeFile(path.join(workspaceDir,'.ppt-build',`slide-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
