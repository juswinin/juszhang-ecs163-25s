/*  Student Mental Health – Three Views + Enhanced Parallel Coordinates */

const width  = window.innerWidth;
const height = window.innerHeight;

// -------- Chart 1: Age vs CGPA Bubble Chart --------
const scatterMargin = {top: 10, right: 30, bottom: 40, left: 60},
      scatterWidth  = 400 - scatterMargin.left - scatterMargin.right,
      scatterHeight = 350 - scatterMargin.top  - scatterMargin.bottom;

// -------- Chart 2: Bar Chart --------
const distrLeft   = 400, distrTop = 0;
const distrMargin = {top: 10, right: 30, bottom: 40, left: 60},
      distrWidth  = 400 - distrMargin.left - distrMargin.right,
      distrHeight = 350 - distrMargin.top  - distrMargin.bottom;

// -------- Chart 3: Parallel Coordinates --------
const pcTop    = 400;
const pcMargin = {top: 20, right: 10, bottom: 20, left: 50},
      pcWidth  = width  - pcMargin.left - pcMargin.right,
      pcHeight = height - pcTop - 50 - pcMargin.top - pcMargin.bottom;

// === Load CSV Data ===
d3.csv("data/Student Mental health.csv").then(data => {
  let raw = data;

  raw.forEach(d => {
    d.Age = +d.Age;
    const cgpaStr = d["What is your CGPA?"].trim();
    const nums = cgpaStr.split(/-|–/).map(s => parseFloat(s));
    d.CGPA = (nums[0] + nums[1]) / 2;

    d.Year = d["Your current year of Study"];
    d.Gender = d["Choose your gender"];
   d.Depression = (d.Depression || "").trim().toLowerCase() === "yes";
  d.Anxiety = (d.Anxiety || "").trim().toLowerCase() === "yes";
d.PanicAttack = (d["Do you have Panic Attack"] || "").trim().toLowerCase() === "yes";

  });

  raw = raw.filter(d => !isNaN(d.Age) && !isNaN(d.CGPA));
  const svg = d3.select("svg");

  // ---------- Chart 1: Bubble Chart ----------
  const bubbleData = raw.filter(d => d.Age > 0 && !isNaN(d.CGPA));
  const groupMap = d3.rollups(
    bubbleData,
    v => ({ count: v.length, depressionRate: d3.mean(v, d => d.Depression ? 1 : 0) }),
    d => d.Age,
    d => d.CGPA
  );

  const bubbles = [];
  groupMap.forEach(([age, inner]) => {
    inner.forEach(([cgpa, stats]) => {
      bubbles.push({ Age: +age, CGPA: +cgpa, ...stats });
    });
  });

  const g1 = svg.append("g")
      .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  const x1 = d3.scaleLinear().domain([17, 25]).range([0, scatterWidth]);
  const y1 = d3.scaleLinear().domain([1.0, 4.0]).range([scatterHeight, 0]);
  const rScale = d3.scaleSqrt().domain([1, d3.max(bubbles, d => d.count)]).range([4, 20]);
  const color = d3.scaleSequential(d3.interpolateRdBu).domain([1, 0]);

  g1.append("g").attr("transform", `translate(0,${scatterHeight})`).call(d3.axisBottom(x1));
  g1.append("g").call(d3.axisLeft(y1));
  g1.append("text").attr("x", scatterWidth/2).attr("y", scatterHeight+30).attr("text-anchor","middle").text("Age");
  g1.append("text").attr("transform", "rotate(-90)").attr("x", -scatterHeight/2).attr("y", -40).attr("text-anchor","middle").text("CGPA");

  g1.selectAll("circle").data(bubbles)
    .enter().append("circle")
    .attr("cx", d => x1(d.Age))
    .attr("cy", d => y1(d.CGPA))
    .attr("r", d => rScale(d.count))
    .attr("fill", d => color(d.depressionRate))
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5)
    .attr("opacity", 0.8)
    .append("title")
    .text(d => `Age: ${d.Age}, CGPA: ${d.CGPA}\nCount: ${d.count}, Depression: ${Math.round(d.depressionRate * 100)}%`);

  // ---------- Chart 2: Bar Chart ----------
  const g2 = svg.append("g")
      .attr("transform", `translate(${distrLeft + distrMargin.left}, ${distrTop + distrMargin.top})`);

  const cleanedData = raw.map(d => ({ ...d, Year: d.Year.trim().toLowerCase() }));
  const yearCounts = d3.rollup(cleanedData, v => v.length, d => d.Year);
  const yearData = Array.from(yearCounts, ([year, count]) => {
    const normalizedYear = year.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return { Year: normalizedYear, count };
  });
  yearData.sort((a, b) => parseInt(a.Year.match(/\d+/)) - parseInt(b.Year.match(/\d+/)));

  const x2 = d3.scaleBand().domain(yearData.map(d => d.Year)).range([0, distrWidth]).padding(0.3);
  const y2 = d3.scaleLinear().domain([0, d3.max(yearData, d => d.count)]).nice().range([distrHeight, 0]);

  g2.append("g").attr("transform", `translate(0, ${distrHeight})`).call(d3.axisBottom(x2));
  g2.append("g").call(d3.axisLeft(y2));
  g2.selectAll("rect").data(yearData).enter().append("rect")
    .attr("x", d => x2(d.Year)).attr("y", d => y2(d.count))
    .attr("width", x2.bandwidth()).attr("height", d => distrHeight - y2(d.count))
    .attr("fill", "steelblue");
  g2.append("text").attr("x", distrWidth/2).attr("y", -10).attr("text-anchor","middle").text("Student Count by Academic Year");
  g2.append("text").attr("x", distrWidth/2).attr("y", distrHeight+35).attr("text-anchor","middle").text("Year");
  g2.append("text").attr("transform", "rotate(-90)").attr("x", -distrHeight/2).attr("y", -35).attr("text-anchor","middle").text("Number of Students");

  // ---------- Chart 3: Parallel Coordinates ----------
  const pc = svg.append("g")
    .attr("transform", `translate(${pcMargin.left},${pcTop + pcMargin.top})`);

  const cleanedRaw = raw.map(d => {
    const year = d.Year.trim().toLowerCase()
      .split(" ")
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    return { ...d, Year: year };
  });

  const dimensions = [
    { key: "Year",        label: "Year of Study",                  type: "ordinal" },
    { key: "Age",         label: "Age of Student",                 type: "linear"  },
    { key: "CGPA",        label: "Academic CGPA",                  type: "linear"  },
    { key: "Depression",  label: "Depression (Yes/No)",            type: "binary"  },
    { key: "PanicAttack", label: "Panic Attack (Yes/No)",          type: "binary"  }
  ];

  const yearColor = d3.scaleOrdinal()
    .domain(["Year 1", "Year 2", "Year 3", "Year 4"])
    .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"]);

  dimensions.forEach(dim => {
    if (dim.type === "linear") {
      dim.scale = d3.scaleLinear()
        .domain(d3.extent(cleanedRaw, d => +d[dim.key]))
        .nice()
        .range([pcHeight, 0]);
    } else if (dim.type === "ordinal") {
      dim.scale = d3.scalePoint()
        .domain([...new Set(cleanedRaw.map(d => d[dim.key]))])
        .range([pcHeight, 0]);
    } else { // binary
      dim.scale = d3.scalePoint()
        .domain([false, true])
        .range([pcHeight, 0]);
    }
  });

  const xPC = d3.scalePoint()
    .domain(dimensions.map(d => d.key))
    .range([0, pcWidth]);

  function path(d) {
    return d3.line()(dimensions.map(dim => [xPC(dim.key), dim.scale(d[dim.key])]));
  }

  const pcLines = pc.append("g").attr("class", "pc-lines")
    .selectAll("path")
    .data(cleanedRaw)
    .enter().append("path")
    .attr("d", path)
    .attr("stroke", d => yearColor(d.Year))
    .attr("stroke-width", 1)
    .attr("fill", "none")
    .attr("opacity", 0.6);

  const axis = pc.selectAll(".axis")
    .data(dimensions)
    .enter().append("g")
      .attr("class", "axis")
      .attr("transform", d => `translate(${xPC(d.key)},0)`)
      .each(function(d) {
        d3.select(this).call(d3.axisLeft(d.scale).ticks(5));
      });

  axis.append("text")
    .attr("y", pcHeight + 30)
    .attr("x", 0)
    .attr("text-anchor", "middle")
    .attr("fill", "black")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text(d => d.label);

  const cgpaDim = dimensions.find(d => d.key === "CGPA");
  pc.append("g").attr("class", "brush")
    .call(d3.brushY()
      .extent([[xPC(cgpaDim.key)-15, 0], [xPC(cgpaDim.key)+15, pcHeight]])
      .on("brush end", ({ selection }) => {
        if (!selection) {
          pcLines.attr("opacity", 0.6);
          svg.selectAll("circle").attr("opacity", 0.8);
          return;
        }
        const [yMin, yMax] = selection;
        pcLines.attr("opacity", d => {
          const yVal = cgpaDim.scale(d.CGPA);
          return (yVal >= yMin && yVal <= yMax) ? 1 : 0.05;
        });
        svg.selectAll("circle").attr("opacity", d => {
          const yVal = cgpaDim.scale(d.CGPA);
          return (yVal >= yMin && yVal <= yMax) ? 1 : 0.05;
        });
      })
    );

}).catch(console.error);
