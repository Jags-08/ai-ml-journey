
import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap";
document.head.appendChild(fontLink);

const gStyle = document.createElement("style");
gStyle.textContent = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#060b12;--surface:#0c1522;--surface2:#101c2c;
    --border:#182840;--border2:#1f3350;
    --accent:#00d4a0;--accent2:#1a8fff;--accent3:#ff6b6b;--accent4:#f7c948;
    --text:#deeaf8;--muted:#3d5870;--muted2:#6a8fad;
    --mono:'DM Mono',monospace;--sans:'DM Sans',sans-serif;--display:'Syne',sans-serif;
  }
  body{background:var(--bg);color:var(--text);font-family:var(--sans)}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
  input,select,textarea{
    background:rgba(255,255,255,0.03);border:1px solid var(--border2);
    color:var(--text);font-family:var(--sans);border-radius:8px;
    padding:10px 14px;outline:none;font-size:13px;width:100%;
    transition:border-color 0.2s,box-shadow 0.2s;
  }
  input:focus,select:focus,textarea:focus{
    border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,212,160,0.08);
  }
  input[type=range]{
    -webkit-appearance:none;height:3px;background:var(--border2);
    border-radius:2px;padding:0;border:none;cursor:pointer;box-shadow:none;
  }
  input[type=range]::-webkit-slider-thumb{
    -webkit-appearance:none;width:15px;height:15px;border-radius:50%;
    background:var(--accent);cursor:pointer;box-shadow:0 0 8px rgba(0,212,160,0.5);
  }
  input[type=number]{-moz-appearance:textfield}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
  @keyframes glow{0%,100%{box-shadow:0 0 6px rgba(0,212,160,0.3)}50%{box-shadow:0 0 16px rgba(0,212,160,0.6)}}
  .fu{animation:fadeUp 0.35s ease both}
  .pulse{animation:pulse 2s infinite}
  .glow{animation:glow 2.5s infinite}
  .recharts-tooltip-wrapper{outline:none!important}
`;
document.head.appendChild(gStyle);

/* ── SAMPLE DATA ── */
const makeSample = () => {
  const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return labels.map((d,i) => ({
    id:i+1, date:d,
    fullDate: new Date(Date.now()-(6-i)*86400000).toLocaleDateString("en-GB"),
    sleep: +(5+Math.random()*4).toFixed(1),
    water: +(1+Math.random()*2.2).toFixed(1),
    activity: Math.floor(2000+Math.random()*9000),
    mood: Math.floor(3+Math.random()*7),
    stress: Math.floor(2+Math.random()*7),
    energy: Math.floor(3+Math.random()*7),
    heartRate: Math.floor(60+Math.random()*22),
    weight: +(68+Math.random()*2).toFixed(1),
    symptoms: i===2?["headache","fatigue"]:i===4?["mild fatigue"]:[],
  }));
};

/* ── HELPERS ── */
const avg=(arr,k)=>arr.length?(arr.reduce((s,x)=>s+(+x[k]),0)/arr.length).toFixed(1):0;

const Tip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(
    <div style={{background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:8,padding:"8px 12px",fontFamily:"var(--mono)",fontSize:11}}>
      <div style={{color:"var(--muted2)",marginBottom:4}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color}}>{p.name}: <b>{p.value}</b></div>)}
    </div>
  );
};

const Ring=({value=0,max=10,size=70,color="var(--accent)",label})=>{
  const r=(size-8)/2, circ=2*Math.PI*r, pct=Math.min(value/max,1);
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border2)" strokeWidth={4}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={`${circ*pct} ${circ*(1-pct)}`} strokeLinecap="round"
          style={{transition:"stroke-dasharray 0.7s ease"}}/>
      </svg>
      <div style={{position:"relative",marginTop:-size/2-4,height:size/2+4,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
        <span style={{fontFamily:"var(--mono)",fontSize:size>60?16:13,color,fontWeight:500,lineHeight:1}}>{value}</span>
      </div>
      {label&&<div style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1.5,marginTop:size/2-8}}>{label}</div>}
    </div>
  );
};

const Card=({icon,label,value,unit,color="var(--accent)",sub})=>(
  <div className="fu" style={{
    background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",
    position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",gap:6
  }}>
    <div style={{position:"absolute",inset:0,background:`linear-gradient(135deg,${color}08 0%,transparent 60%)`}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
      <span style={{fontSize:20}}>{icon}</span>
      <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",background:"var(--bg)",padding:"2px 6px",borderRadius:4,border:"1px solid var(--border)"}}>
        {sub||unit}
      </span>
    </div>
    <div style={{fontFamily:"var(--mono)",fontSize:24,fontWeight:500,color,position:"relative"}}>{value}</div>
    <div style={{fontSize:10,color:"var(--muted2)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1.5,position:"relative"}}>{label}</div>
  </div>
);

/* ── TABS ── */
const TABS=[
  {id:"dashboard",icon:"◈",label:"Dashboard"},
  {id:"log",icon:"✛",label:"Log Health"},
  {id:"ai",icon:"◎",label:"AI Insights"},
  {id:"history",icon:"≡",label:"History"},
];

export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [data,setData]=useState(makeSample());
  const [form,setForm]=useState({sleep:7,water:2,activity:6000,mood:7,stress:4,energy:7,heartRate:72,weight:68,symptoms:""});
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [saved,setSaved]=useState(false);
  const chatRef=useRef(null);
  const inputRef=useRef(null);

  useEffect(()=>{chatRef.current?.scrollIntoView({behavior:"smooth"})},[msgs]);

  const set=k=>e=>setForm(f=>({...f,[k]:e.target.type==="range"||e.target.type==="number"?+e.target.value:e.target.value}));

  const logHealth=()=>{
    const entry={
      id:Date.now(),
      date:new Date().toLocaleDateString("en",{weekday:"short"}),
      fullDate:new Date().toLocaleDateString("en-GB"),
      ...form,
      symptoms:form.symptoms?form.symptoms.split(",").map(s=>s.trim()).filter(Boolean):[],
    };
    setData(p=>[...p.slice(-9),entry]);
    setSaved(true);
    setTimeout(()=>setSaved(false),2800);
  };

  const buildCtx=()=>`User's ${data.length}-day health log:\n`+data.map(e=>
    `[${e.date}] Sleep:${e.sleep}h Water:${e.water}L Steps:${e.activity} Mood:${e.mood}/10 Stress:${e.stress}/10 Energy:${e.energy}/10 HR:${e.heartRate}bpm Wt:${e.weight}kg Symptoms:${e.symptoms?.join(",")||"none"}`
  ).join("\n")+`\n\nAverages — Sleep:${avg(data,"sleep")}h Water:${avg(data,"water")}L Mood:${avg(data,"mood")}/10 Stress:${avg(data,"stress")}/10 Energy:${avg(data,"energy")}/10`;

  const send=async()=>{
    const q=input.trim();
    if(!q||loading)return;
    setInput("");
    setMsgs(p=>[...p,{role:"user",content:q}]);
    setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",max_tokens:1000,
          system:`You are VITAINTEL, a personal health intelligence AI. Analyze user health data and give precise, caring, actionable insights. Reference specific numbers from their data. Be empathetic but concise. Always recommend seeing a doctor for medical concerns.\n\n${buildCtx()}`,
          messages:[...msgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:q}],
        }),
      });
      const d=await res.json();
      const reply=d.content?.map(b=>b.text||"").join("")||"No response generated.";
      setMsgs(p=>[...p,{role:"assistant",content:reply}]);
    }catch{
      setMsgs(p=>[...p,{role:"assistant",content:"⚠ Connection error. Check your network and try again."}]);
    }finally{setLoading(false);}
  };

  const latest=data[data.length-1]||{};
  const healthScore=Math.min(100,Math.round(
    (+latest.sleep/8)*30+
    (+latest.water/3)*20+
    (+latest.mood/10)*20+
    ((10-(+latest.stress||5))/10)*15+
    (+latest.energy/10)*15
  ));
  const scoreColor=healthScore>=75?"var(--accent)":healthScore>=50?"var(--accent4)":"var(--accent3)";
  const scoreLabel=healthScore>=75?"Good":healthScore>=50?"Fair":"Low";

  const radarData=[
    {s:"Sleep",v:Math.round((+latest.sleep/9)*10)},
    {s:"Hydration",v:Math.round((+latest.water/3)*10)},
    {s:"Activity",v:Math.round((+latest.activity/10000)*10)},
    {s:"Mood",v:+latest.mood||0},
    {s:"Energy",v:+latest.energy||0},
    {s:"Calm",v:Math.max(0,10-(+latest.stress||5))},
  ];

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",backgroundImage:"radial-gradient(ellipse 60% 40% at 15% 0%,rgba(0,212,160,0.05) 0%,transparent 70%),radial-gradient(ellipse 50% 30% at 85% 100%,rgba(26,143,255,0.05) 0%,transparent 70%)"}}>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(6,11,18,0.92)",backdropFilter:"blur(24px)",borderBottom:"1px solid var(--border)",padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#000"}}>⬡</div>
          <div>
            <div style={{fontFamily:"var(--display)",fontWeight:800,fontSize:14,letterSpacing:1}}>VITA<span style={{color:"var(--accent)"}}>INTEL</span></div>
            <div style={{fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase"}}>Health AI System</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:tab===t.id?"rgba(0,212,160,0.1)":"transparent",
              border:tab===t.id?"1px solid rgba(0,212,160,0.28)":"1px solid transparent",
              color:tab===t.id?"var(--accent)":"var(--muted2)",
              borderRadius:8,padding:"5px 12px",cursor:"pointer",
              fontFamily:"var(--mono)",fontSize:11,transition:"all 0.18s",
              display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",
            }}>
              <span style={{fontSize:10}}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          <div className="pulse glow" style={{width:6,height:6,borderRadius:"50%",background:"var(--accent)"}}/>
          <span style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",letterSpacing:1}}>PRIVATE · LOCAL</span>
        </div>
      </nav>

      <main style={{maxWidth:1080,margin:"0 auto",padding:"20px 14px"}}>

        {/* ──────────── DASHBOARD ──────────── */}
        {tab==="dashboard"&&(
          <div className="fu">
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:14}}>
              <div>
                <h1 style={{fontFamily:"var(--display)",fontWeight:700,fontSize:20,letterSpacing:-0.3}}>Health Dashboard</h1>
                <p style={{color:"var(--muted2)",fontFamily:"var(--mono)",fontSize:10,marginTop:3}}>
                  {new Date().toLocaleDateString("en",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
                </p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:20,background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 20px"}}>
                <div style={{position:"relative",width:70,height:70}}>
                  <svg width={70} height={70} style={{transform:"rotate(-90deg)"}}>
                    <circle cx={35} cy={35} r={28} fill="none" stroke="var(--border2)" strokeWidth={5}/>
                    <circle cx={35} cy={35} r={28} fill="none" stroke={scoreColor} strokeWidth={5}
                      strokeDasharray={`${2*Math.PI*28*healthScore/100} ${2*Math.PI*28*(1-healthScore/100)}`}
                      strokeLinecap="round" style={{transition:"all 0.7s ease"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:18,fontWeight:500,color:scoreColor}}>{healthScore}</span>
                  </div>
                </div>
                <div>
                  <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>Health Score</div>
                  <div style={{fontFamily:"var(--display)",fontSize:20,fontWeight:700,color:scoreColor}}>{scoreLabel}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)",marginTop:2}}>Based on today's data</div>
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:18}}>
              <Card icon="🌙" label="Sleep" value={latest.sleep} unit="hrs" color="var(--accent2)" sub={+latest.sleep>=7?"Optimal":"Low"}/>
              <Card icon="💧" label="Hydration" value={latest.water} unit="L" color="var(--accent)" sub={+latest.water>=2?"Good":"Low"}/>
              <Card icon="👣" label="Steps" value={(+latest.activity||0).toLocaleString()} unit="steps" color="var(--accent4)" sub="today"/>
              <Card icon="😊" label="Mood" value={`${latest.mood}/10`} unit="/10" color={+latest.mood>=7?"var(--accent)":+latest.mood>=5?"var(--accent4)":"var(--accent3)"} sub="today"/>
              <Card icon="⚡" label="Energy" value={`${latest.energy}/10`} unit="/10" color="var(--accent4)" sub="today"/>
              <Card icon="🫀" label="Heart Rate" value={latest.heartRate} unit="bpm" color="var(--accent3)" sub="resting"/>
            </div>

            {/* Charts */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:14}}>Sleep & Energy · 7 Days</div>
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={data} margin={{top:0,right:0,bottom:0,left:-22}}>
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a8fff" stopOpacity={0.35}/>
                        <stop offset="100%" stopColor="#1a8fff" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00d4a0" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#00d4a0" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 6" stroke="rgba(24,40,64,0.9)"/>
                    <XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <YAxis tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <Tooltip content={<Tip/>}/>
                    <Area type="monotone" dataKey="sleep" name="Sleep (h)" stroke="#1a8fff" fill="url(#sg)" strokeWidth={1.8} dot={false}/>
                    <Area type="monotone" dataKey="energy" name="Energy /10" stroke="#00d4a0" fill="url(#eg)" strokeWidth={1.8} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:14}}>Mood vs Stress · 7 Days</div>
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={data} margin={{top:0,right:0,bottom:0,left:-22}}>
                    <CartesianGrid strokeDasharray="2 6" stroke="rgba(24,40,64,0.9)"/>
                    <XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <YAxis domain={[0,10]} tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <Tooltip content={<Tip/>}/>
                    <Line type="monotone" dataKey="mood" name="Mood" stroke="#00d4a0" strokeWidth={2} dot={{fill:"#00d4a0",r:3,strokeWidth:0}}/>
                    <Line type="monotone" dataKey="stress" name="Stress" stroke="#ff6b6b" strokeWidth={2} dot={{fill:"#ff6b6b",r:3,strokeWidth:0}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:14}}>Daily Steps</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={data} margin={{top:0,right:0,bottom:0,left:-22}}>
                    <CartesianGrid strokeDasharray="2 6" stroke="rgba(24,40,64,0.9)"/>
                    <XAxis dataKey="date" tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <YAxis tick={{fill:"var(--muted)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="activity" name="Steps" fill="var(--accent4)" radius={[3,3,0,0]} opacity={0.85}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Today's Wellness Radar</div>
                <ResponsiveContainer width="100%" height={140}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="65%">
                    <PolarGrid stroke="var(--border2)"/>
                    <PolarAngleAxis dataKey="s" tick={{fill:"var(--muted2)",fontSize:9,fontFamily:"var(--mono)"}}/>
                    <Radar dataKey="v" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.12} strokeWidth={1.8}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Symptoms alert */}
            {latest.symptoms?.length>0&&(
              <div className="fu" style={{marginTop:14,background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.25)",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:20}}>⚠</span>
                <div>
                  <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--accent3)",marginBottom:4}}>SYMPTOMS LOGGED TODAY</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {latest.symptoms.map(s=>(
                      <span key={s} style={{padding:"2px 9px",borderRadius:4,background:"rgba(255,107,107,0.15)",color:"var(--accent3)",border:"1px solid rgba(255,107,107,0.3)",fontSize:11,fontFamily:"var(--mono)"}}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={()=>setTab("ai")} style={{marginLeft:"auto",background:"transparent",border:"1px solid rgba(255,107,107,0.3)",color:"var(--accent3)",padding:"6px 14px",borderRadius:8,cursor:"pointer",fontFamily:"var(--mono)",fontSize:11,whiteSpace:"nowrap"}}>
                  Ask AI →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ──────────── LOG HEALTH ──────────── */}
        {tab==="log"&&(
          <div className="fu" style={{maxWidth:660,margin:"0 auto"}}>
            <div style={{marginBottom:22}}>
              <h1 style={{fontFamily:"var(--display)",fontWeight:700,fontSize:20}}>Log Today's Health</h1>
              <p style={{color:"var(--muted2)",fontFamily:"var(--mono)",fontSize:10,marginTop:3,letterSpacing:0.5}}>
                {new Date().toLocaleDateString("en",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
              </p>
            </div>

            {saved&&(
              <div className="fu" style={{background:"rgba(0,212,160,0.08)",border:"1px solid rgba(0,212,160,0.3)",borderRadius:10,padding:"12px 16px",marginBottom:18,color:"var(--accent)",fontFamily:"var(--mono)",fontSize:12,display:"flex",alignItems:"center",gap:8}}>
                ✓ Health data logged successfully!
              </div>
            )}

            <div style={{display:"grid",gap:12}}>
              {/* Sleep */}
              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5}}>🌙 Sleep Duration</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:20,color:"var(--accent2)",fontWeight:500}}>{form.sleep}<span style={{fontSize:11,color:"var(--muted2)",marginLeft:2}}>hrs</span></span>
                </div>
                <input type="range" min={0} max={12} step={0.5} value={form.sleep} onChange={set("sleep")}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
                  <span style={{fontSize:9,color:"var(--muted)",fontFamily:"var(--mono)"}}>0h</span>
                  <span style={{fontSize:9,color:+form.sleep>=7?"var(--accent)":"var(--accent4)",fontFamily:"var(--mono)"}}>
                    {+form.sleep>=7?"✓ Optimal":"Recommended: 7–9h"}
                  </span>
                  <span style={{fontSize:9,color:"var(--muted)",fontFamily:"var(--mono)"}}>12h</span>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5}}>💧 Water</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:18,color:"var(--accent)",fontWeight:500}}>{form.water}<span style={{fontSize:10,color:"var(--muted2)"}}>L</span></span>
                  </div>
                  <input type="range" min={0} max={5} step={0.25} value={form.water} onChange={set("water")}/>
                </div>
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5}}>👣 Steps</span>
                    <span style={{fontFamily:"var(--mono)",fontSize:14,color:"var(--accent4)",fontWeight:500}}>{(+form.activity).toLocaleString()}</span>
                  </div>
                  <input type="range" min={0} max={15000} step={250} value={form.activity} onChange={set("activity")}/>
                </div>
              </div>

              {/* Mental */}
              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:18}}>
                <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5,marginBottom:16}}>Mental & Energy (1–10)</div>
                <div style={{display:"grid",gap:14}}>
                  {[
                    {k:"mood",icon:"😊",label:"Mood",color:"var(--accent)"},
                    {k:"stress",icon:"😤",label:"Stress Level",color:"var(--accent3)"},
                    {k:"energy",icon:"⚡",label:"Energy",color:"var(--accent4)"},
                  ].map(({k,icon,label,color})=>(
                    <div key={k} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"center"}}>
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                          <span style={{fontSize:12,color:"var(--text)"}}>{icon} {label}</span>
                          <span style={{fontFamily:"var(--mono)",fontSize:12,color}}>{form[k]}/10</span>
                        </div>
                        <input type="range" min={1} max={10} step={1} value={form[k]} onChange={set(k)}/>
                      </div>
                      <div style={{position:"relative",width:40,height:40}}>
                        <svg width={40} height={40} style={{transform:"rotate(-90deg)"}}>
                          <circle cx={20} cy={20} r={15} fill="none" stroke="var(--border2)" strokeWidth={3}/>
                          <circle cx={20} cy={20} r={15} fill="none" stroke={color} strokeWidth={3}
                            strokeDasharray={`${2*Math.PI*15*(form[k]/10)} ${2*Math.PI*15*(1-form[k]/10)}`}
                            strokeLinecap="round"/>
                        </svg>
                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:11,color}}>
                          {form[k]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:18}}>
                  <label style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:10}}>🫀 Heart Rate (bpm)</label>
                  <input type="number" min={40} max={200} value={form.heartRate} onChange={set("heartRate")}/>
                </div>
                <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:18}}>
                  <label style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:10}}>⚖️ Weight (kg)</label>
                  <input type="number" min={30} max={250} step={0.1} value={form.weight} onChange={set("weight")}/>
                </div>
              </div>

              <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:18}}>
                <label style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1.5,display:"block",marginBottom:10}}>🩺 Symptoms <span style={{color:"var(--muted)",fontStyle:"italic",textTransform:"none",letterSpacing:0}}>(comma-separated, leave blank if none)</span></label>
                <input type="text" placeholder="e.g. headache, fatigue, nausea, back pain…" value={form.symptoms} onChange={set("symptoms")}/>
              </div>

              <button onClick={logHealth} style={{
                background:"linear-gradient(135deg,var(--accent) 0%,#00a880 100%)",
                border:"none",borderRadius:10,padding:"14px",
                color:"#000",fontFamily:"var(--mono)",fontSize:13,fontWeight:600,
                cursor:"pointer",letterSpacing:0.8,width:"100%",
                transition:"opacity 0.2s,transform 0.1s",
              }} onMouseDown={e=>e.currentTarget.style.transform="scale(0.99)"}
                onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
                onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}>
                ✓ LOG TODAY'S HEALTH DATA
              </button>
            </div>
          </div>
        )}

        {/* ──────────── AI INSIGHTS ──────────── */}
        {tab==="ai"&&(
          <div className="fu" style={{maxWidth:700,margin:"0 auto"}}>
            <div style={{marginBottom:18}}>
              <h1 style={{fontFamily:"var(--display)",fontWeight:700,fontSize:20}}>AI Health Insights</h1>
              <p style={{color:"var(--muted2)",fontFamily:"var(--mono)",fontSize:10,marginTop:3}}>
                Powered by Claude · Analysing your {data.length}-day health history
              </p>
            </div>

            {msgs.length===0&&(
              <div className="fu" style={{marginBottom:16}}>
                <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)",textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Try asking:</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                  {[
                    "What patterns do you see in my data?",
                    "Why might I have low energy?",
                    "How can I improve my sleep?",
                    "Is my stress level concerning?",
                    "Give me a weekly health summary",
                    "What should I prioritise improving?",
                    "Correlate my mood with sleep",
                    "Am I drinking enough water?",
                  ].map(q=>(
                    <button key={q} onClick={()=>{setInput(q);inputRef.current?.focus();}} style={{
                      background:"var(--surface)",border:"1px solid var(--border)",
                      borderRadius:8,padding:"7px 13px",color:"var(--muted2)",
                      fontFamily:"var(--mono)",fontSize:11,cursor:"pointer",
                      transition:"all 0.2s",
                    }} onMouseOver={e=>{e.currentTarget.style.borderColor="var(--accent)";e.currentTarget.style.color="var(--accent)";}}
                      onMouseOut={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--muted2)";}}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,
              minHeight:340,maxHeight:460,overflowY:"auto",padding:18,
              marginBottom:12,display:"flex",flexDirection:"column",gap:14,
            }}>
              {msgs.length===0&&(
                <div style={{margin:"auto",textAlign:"center",padding:40}}>
                  <div style={{fontSize:40,marginBottom:12,opacity:0.4}}>◎</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--muted2)"}}>Your personal health AI is ready</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)",marginTop:4}}>Ask me anything about your health patterns</div>
                </div>
              )}

              {msgs.map((m,i)=>(
                <div key={i} className="fu" style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                  {m.role==="assistant"&&(
                    <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#000",fontWeight:800,flexShrink:0,marginRight:10,marginTop:1}}>◎</div>
                  )}
                  <div style={{
                    maxWidth:"82%",
                    background:m.role==="user"?"rgba(0,212,160,0.09)":"var(--surface2)",
                    border:`1px solid ${m.role==="user"?"rgba(0,212,160,0.22)":"var(--border)"}`,
                    borderRadius:m.role==="user"?"12px 3px 12px 12px":"3px 12px 12px 12px",
                    padding:"11px 15px",fontSize:13,lineHeight:1.65,
                    color:m.role==="user"?"var(--accent)":"var(--text)",
                    fontFamily:m.role==="user"?"var(--mono)":"var(--sans)",
                    whiteSpace:"pre-wrap",
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}

              {loading&&(
                <div className="fu" style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#000",fontWeight:800}}>◎</div>
                  <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:"3px 12px 12px 12px",padding:"11px 16px",fontFamily:"var(--mono)",fontSize:12,color:"var(--muted2)"}}>
                    <span className="pulse">Analysing your health data…</span>
                  </div>
                </div>
              )}
              <div ref={chatRef}/>
            </div>

            <div style={{display:"flex",gap:10}}>
              <input ref={inputRef} type="text"
                placeholder="Ask about your health patterns, symptoms, sleep, energy…"
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
                style={{flex:1}}
              />
              <button onClick={send} disabled={loading||!input.trim()} style={{
                background:loading||!input.trim()?"var(--border)":"var(--accent)",
                border:"none",borderRadius:9,padding:"0 20px",
                color:"#000",fontFamily:"var(--mono)",fontSize:13,fontWeight:600,
                cursor:loading||!input.trim()?"not-allowed":"pointer",
                transition:"all 0.2s",whiteSpace:"nowrap",flexShrink:0,
              }}>
                {loading?"…":"Send →"}
              </button>
            </div>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--muted)",textAlign:"center",marginTop:8,letterSpacing:0.5}}>
              ⚠ Not a substitute for professional medical advice · Consult your doctor for health concerns
            </div>
          </div>
        )}

        {/* ──────────── HISTORY ──────────── */}
        {tab==="history"&&(
          <div className="fu">
            <div style={{marginBottom:18}}>
              <h1 style={{fontFamily:"var(--display)",fontWeight:700,fontSize:20}}>Health History</h1>
              <p style={{color:"var(--muted2)",fontFamily:"var(--mono)",fontSize:10,marginTop:3}}>{data.length} records · Stored in-memory</p>
            </div>

            {/* Avg summary */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:10,marginBottom:18}}>
              {[
                {l:"Avg Sleep",v:avg(data,"sleep"),u:"hrs",c:"var(--accent2)"},
                {l:"Avg Water",v:avg(data,"water"),u:"L",c:"var(--accent)"},
                {l:"Avg Mood",v:avg(data,"mood"),u:"/10",c:"var(--accent)"},
                {l:"Avg Stress",v:avg(data,"stress"),u:"/10",c:"var(--accent3)"},
                {l:"Avg Energy",v:avg(data,"energy"),u:"/10",c:"var(--accent4)"},
                {l:"Avg HR",v:avg(data,"heartRate"),u:"bpm",c:"var(--accent3)"},
              ].map(s=>(
                <div key={s.l} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
                  <div style={{fontFamily:"var(--mono)",fontSize:20,color:s.c,fontWeight:500}}>{s.v}<span style={{fontSize:10,color:"var(--muted2)",marginLeft:2}}>{s.u}</span></div>
                  <div style={{fontSize:9,color:"var(--muted)",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:1.5,marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"var(--mono)",fontSize:11}}>
                  <thead>
                    <tr style={{background:"var(--surface2)",borderBottom:"1px solid var(--border)"}}>
                      {["Date","Sleep","Water","Steps","Mood","Stress","Energy","HR","Weight","Symptoms"].map(h=>(
                        <th key={h} style={{padding:"11px 14px",textAlign:"left",color:"var(--muted2)",fontWeight:500,fontSize:9,textTransform:"uppercase",letterSpacing:1.5,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...data].reverse().map((r,i)=>(
                      <tr key={r.id} style={{borderBottom:"1px solid rgba(24,40,64,0.7)",background:i%2?"rgba(255,255,255,0.012)":"transparent"}}>
                        <td style={{padding:"9px 14px",color:"var(--muted2)",whiteSpace:"nowrap"}}>{r.fullDate}</td>
                        <td style={{padding:"9px 14px",color:+r.sleep>=7?"var(--accent2)":"var(--accent4)"}}>{r.sleep}h</td>
                        <td style={{padding:"9px 14px",color:"var(--accent)"}}>{r.water}L</td>
                        <td style={{padding:"9px 14px",color:"var(--accent4)"}}>{(+r.activity).toLocaleString()}</td>
                        <td style={{padding:"9px 14px"}}><span style={{color:+r.mood>=7?"var(--accent)":+r.mood>=5?"var(--accent4)":"var(--accent3)"}}>{r.mood}/10</span></td>
                        <td style={{padding:"9px 14px"}}><span style={{color:+r.stress<=4?"var(--accent)":+r.stress<=6?"var(--accent4)":"var(--accent3)"}}>{r.stress}/10</span></td>
                        <td style={{padding:"9px 14px",color:"var(--accent4)"}}>{r.energy}/10</td>
                        <td style={{padding:"9px 14px",color:"var(--accent3)"}}>{r.heartRate}</td>
                        <td style={{padding:"9px 14px",color:"var(--muted2)"}}>{r.weight}kg</td>
                        <td style={{padding:"9px 14px"}}>
                          {r.symptoms?.length>0
                            ?<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{r.symptoms.map(s=><span key={s} style={{padding:"1px 7px",borderRadius:3,background:"rgba(255,107,107,0.12)",color:"var(--accent3)",border:"1px solid rgba(255,107,107,0.25)",fontSize:10}}>{s}</span>)}</div>
                            :<span style={{color:"var(--muted)"}}>—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{marginTop:12,padding:"10px 14px",background:"rgba(26,143,255,0.06)",border:"1px solid rgba(26,143,255,0.15)",borderRadius:8,fontFamily:"var(--mono)",fontSize:9,color:"var(--muted2)",display:"flex",alignItems:"center",gap:8,letterSpacing:0.5}}>
              🔐 All health data is stored in-memory only and never transmitted to any server. Data resets on page refresh.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
