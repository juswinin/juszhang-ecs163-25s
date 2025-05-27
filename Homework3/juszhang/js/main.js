/**************************************************************************
 *  HW3  –  Bubble ▸ Bar ▸ Parallel  (re-animating on every cycle)
 **************************************************************************/
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/* ---------- responsive dims ---------- */
const M = {top:40,right:30,bottom:50,left:60};
let W,H;
const stage=document.getElementById("stage");
function calcSize(){
  W=stage.clientWidth -(M.left+M.right);
  H=stage.clientHeight-(M.top +M.bottom);
}

/* ---------- utils ---------- */
function parseCGPA(s){
  if(!s) return NaN;
  const t=s.replace("–","-").replace(/\s/g,"");
  if(t.includes("-")){
    const [a,b]=t.split("-").map(parseFloat);
    return (a+b)/2;
  }
  return +t;
}
const yearOrder=(a,b)=>+a.match(/\d+/)-+b.match(/\d+/);
const dispatch=d3.dispatch("pcBrush");   // parallel → bubble/bar

/* ---------- load ---------- */
let rows=[];
d3.csv("data/Student Mental health.csv").then(raw=>{
  rows=raw.map(d=>({
    Age : +d.Age,
    CGPA: parseCGPA(d["What is your CGPA?"]),
    Year: (d["Your current year of Study"]||"")
           .trim().toLowerCase().replace(/^year/,"Year ").replace(/\s+/g," "),
    Gender  : d["Choose your gender"].trim(),
    DepScore: (d["Do you have Depression?"]||"").toLowerCase()==="yes"?1:0
  })).filter(r=>!isNaN(r.Age)&&!isNaN(r.CGPA));

  window.rows=rows;          
  renderBubble();            
  window.addEventListener("resize",()=>{ renderCurrent(); });
  setupNext();
});

/* ================= renderers ================= */
function renderBubble(){
  calcSize();
  const svg = d3.select("#bubble").html("")           
    .attr("viewBox",`0 0 ${W+M.left+M.right} ${H+M.top+M.bottom}`)
    .append("g").attr("transform",`translate(${M.left},${M.top})`);

  const data=rows.filter(d=>d.Age>=18);
  const x=d3.scaleLinear().domain(d3.extent(data,d=>d.Age)).range([0,W]);
  const y=d3.scaleLinear().domain(d3.extent(data,d=>d.CGPA)).nice().range([H,0]);
  const r=d3.scaleSqrt().domain([0,1]).range([3,9]);
  const col=d3.scaleOrdinal().domain(["Male","Female","Other"]).range(d3.schemeSet2);

  svg.append("g").attr("transform",`translate(0,${H})`)
     .call(d3.axisBottom(x).ticks(x.domain()[1]-x.domain()[0]))
    .append("text").attr("x",W/2).attr("y",35).attr("text-anchor","middle")
    .attr("fill","#000").text("Age");

  svg.append("g").call(d3.axisLeft(y))
     .append("text").attr("x",-40).attr("y",-10).attr("fill","#000").text("CGPA");

  svg.append("text").attr("x",W/2).attr("y",-15).attr("text-anchor","middle")
     .attr("font-weight","600").text("Age ≥ 18 vs CGPA – Bubble Overview");

  svg.selectAll("circle").data(data).join("circle")
     .attr("cx",d=>x(d.Age)).attr("cy",d=>y(d.CGPA))
     .attr("r",0).attr("fill",d=>col(d.Gender)).attr("opacity",0.85)
     .transition().duration(1500).attr("r",d=>r(d.DepScore));

  dispatch.on("pcBrush.bubble", set=>{
    svg.selectAll("circle")
       .attr("opacity",d=>(!set.size||set.has(d)?0.9:0.05));
  });
}

function renderBar(){
  calcSize();
  const svg=d3.select("#bar").html("")
    .attr("viewBox",`0 0 ${W+M.left+M.right} ${H+M.top+M.bottom}`)
    .append("g").attr("transform",`translate(${M.left},${M.top})`);

  const counts=d3.rollup(rows,v=>v.length,d=>d.Year);
  const data=Array.from(counts,([Year,count])=>({Year,count}))
                  .sort((a,b)=>yearOrder(a.Year,b.Year));

  const x=d3.scaleBand().domain(data.map(d=>d.Year)).range([0,W]).padding(0.25);
  const y=d3.scaleLinear().domain([0,d3.max(data,d=>d.count)]).nice().range([H,0]);

  svg.append("g").attr("transform",`translate(0,${H})`).call(d3.axisBottom(x))
     .append("text").attr("x",W/2).attr("y",35).attr("text-anchor","middle")
     .attr("fill","#000").text("Year of Study");

  svg.append("g").call(d3.axisLeft(y))
     .append("text").attr("x",-40).attr("y",-10).attr("fill","#000").text("Students");

  svg.append("text").attr("x",W/2).attr("y",-15).attr("text-anchor","middle")
     .attr("font-weight","600").text("Student Count per Year");

  svg.selectAll("rect").data(data).join("rect")
     .attr("x",d=>x(d.Year)).attr("width",x.bandwidth())
     .attr("y",H).attr("height",0).attr("fill","steelblue")
     .transition().duration(1500).attr("y",d=>y(d.count)).attr("height",d=>H-y(d.count));
}

function renderParallel(){
  calcSize();
  const dims=["Age","CGPA","DepScore"];
  const svg=d3.select("#parallel").html("")
    .attr("viewBox",`0 0 ${W+M.left+M.right} ${H+M.top+M.bottom}`)
    .append("g").attr("transform",`translate(${M.left},${M.top})`);

  const y={
    Age      : d3.scaleLinear().domain(d3.extent(rows,d=>d.Age)).range([H,0]),
    CGPA     : d3.scaleLinear().domain(d3.extent(rows,d=>d.CGPA)).range([H,0]),
    DepScore : d3.scalePoint().domain([0,1]).range([H,0])
  };
  const x=d3.scalePoint().domain(dims).range([0,W]);
  const line=d3.line();
  const path=d=>line(dims.map(p=>[x(p),y[p](d[p])]));

  svg.append("text").attr("x",W/2).attr("y",-15)
     .attr("text-anchor","middle").attr("font-weight","600")
     .text("Parallel Coordinates – Age • CGPA • DepScore");

  const pl=svg.append("g").selectAll("path").data(rows).join("path")
     .attr("d",path).attr("fill","none").attr("stroke","#888").attr("opacity",0.6);

  /* 动画 */
  pl.each(function(){
    const L=this.getTotalLength();
    d3.select(this)
      .attr("stroke-dasharray",`${L},${L}`)
      .attr("stroke-dashoffset",L)
      .transition().duration(2200).ease(d3.easeLinear)
      .attr("stroke-dashoffset",0);
  });

  svg.selectAll(".axis").data(dims).join("g")
     .attr("transform",d=>`translate(${x(d)})`)
     .each(function(d){ d3.select(this).call(d3.axisLeft(y[d])); })
     .append("text").attr("y",H+25).attr("text-anchor","middle").text(d=>d);

  svg.append("g")
     .attr("transform",`translate(${x("CGPA")-8})`)
     .call(d3.brushY().extent([[-8,0],[8,H]])
       .on("brush end",({selection})=>{
         const set=new Set();
         if(selection){
           const [y0,y1]=selection.map(y["CGPA"].invert);
           pl.attr("stroke",d=>{
             const inside=d.CGPA>=y1&&d.CGPA<=y0;
             if(inside)set.add(d);
             return inside?"#d62728":"#bbb";
           });
         }else pl.attr("stroke","#888");
         dispatch.call("pcBrush",null,set);
       })
     );
}

/* ========== cyclic Next button ========== */
function setupNext(){
  const views=["bubble","bar","parallel"];
  let idx=0;                              
  const renderFns={bubble:renderBubble,bar:renderBar,parallel:renderParallel};

  const btn=d3.select("#nextBtn");
  btn.on("click",()=>{
    const cur=views[idx];
    d3.select("#"+cur).transition().duration(400)
      .style("transform","scale(.3)").style("opacity",0)
      .on("end",()=>d3.select("#"+cur).classed("hidden",true));

    idx = (idx+1)%views.length;
    const nxt=views[idx];
    renderFns[nxt]();                       
    d3.select("#"+nxt).classed("hidden",false)
      .style("transform","scale(.3)").style("opacity",0)
      .transition().duration(500)
      .style("transform","scale(1)").style("opacity",1);
  });
}

/* ---------- helper: on resize re-render current view ---------- */
function renderCurrent(){
  const visible = ["bubble","bar","parallel"].find(id=>!d3.select("#"+id).classed("hidden"));
  if(visible==="bubble")   renderBubble();
  else if(visible==="bar") renderBar();
  else                     renderParallel();
}
