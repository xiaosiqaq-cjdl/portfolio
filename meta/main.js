import * as d3 from "https:/cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const data = await d3.csv("loc.csv", (d)=> ({
    ...d,
    line:Number(d.line),
    depth:Number(d.depth),
    length:Number(d.length),
    datetime:new Date(d.datetime),
}));

const stats = d3.select("#stats")

stats
    .append("p")
    .text(`Total lines of code: ${data.length}`);

const fileCount = new Set(data.map((d) => d.file)).size;

stats
    .append("p")
    .text(`Total files represented: ${fileCount}`);
    
console.log("First row:", data[0]);

const commitGroups = d3.groups(data, d => d.commit);

const commits = commitGroups.map(([id, lines]) => {
    const first = lines[0];

    return {
        id,
        author: first.author,
        datetime: first.datetime,
        hourFrac:
            first.datetime.getHours() +
            first.datetime.getMinutes() / 60,
        totalLines: lines.length,
    };
});

console.log("First commit:", commits[0]);

console.log("Commit groups:", commitGroups);

stats
    .append("p")
    .text(`Total commits represented: ${commits.length}`);

const width = 1000;
const height = 600

const svg = d3
    .select("#chart")
    .append("svg")
    .attr("viewBox", `0, 0, ${width}, ${height}`)
    .style("width", "100%")
    .style("height", "auto")
    .style("border", "1px solid #ddd");

const margin = {
    top: 30,
    right: 30,
    bottom: 50,
    left: 60,
};

const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([margin.left, width - margin.right])
    .nice();

const yScale = d3
    .scaleLinear()
    .domain([0,24])
    .range([height - margin.bottom, margin.top])

// X-axis: commit data
svg
    .append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(6));

// Y-axis: hour of day
svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(
        d3.axisLeft(yScale)
          .tickValues([0,4,8,12,16,20,24])
          .tickFormat((d) => `${d}:00`)
    );


const rScale = d3
    .scaleSqrt()
    .domain([0, d3.max(commits, d => d.totalLines)])
    .range([0, 25]);


const tooltip = d3.select("#commit-tooltip");

// One circle per commit

// X-axis label
svg
    .append("text")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("font-size", 14)
    .text("Commit date");

// Y-axis label
svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(margin.top + height - margin.bottom) / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("fill", "currentColor")
    .attr("font-size", 14)
    .text("Time of day (local time)");


svg
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(commits)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill-opacity", 0.7)
    .attr("fill", "steelblue")
    .on("mouseenter", (event,d) =>{
        tooltip
            .property("hidden",false)
            .text(
                `Commit: ${d.id}
    Author: ${d.author}
    Date: ${d.datetime.toLocaleString()}
    Lines represented: ${d.totalLines}`

        );

        positionTooltip(event);
    })
    .on("mousemove", (event) => {
        positionTooltip(event);
    })
    .on("mouseleave", () =>{
        tooltip.property("hidden", true);
    });


function positionTooltip(event){
    const box = tooltip.node().getBoundingClientRect();
    
    const left = Math.max(
        8,
        Math.min(event.clientX + 12, window.innerWidth - box.width - 8)
    );

    const top = Math.max(
        8,
        Math.min(event.clientY + 12, window.innerHeight - box.height - 8)
    );

    tooltip
        .style("left", `${left}px`)
        .style("top", `${top}px`);
}

const brush = d3
    .brush()
    .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
    ])
    .on("start brush end", brushed);

svg
    .insert("g", ".dots")
    .attr("class", "brush")
    .call(brush);

function brushed(event){
    const selection = event.selection;

    const selectedCommits = selection
        ? commits.filter((d) => {
            const [[x0, y0], [x1, y1]] = selection;
            const x = xScale(d.datetime);
            const y = yScale(d.hourFrac);

            return x >= x0 && x <= x1 && y >= y0 && y <= y1;
            })
        : [];
    
    const selectedIds = new Set(selectedCommits.map((d) => d.id));

    svg
        .selectAll(".dots circle")
        .attr("fill", (d) =>
            selectedIds.has(d.id) ? "orange" : "steelblue"
        );
    
    d3.select("#selection-count").text(
        selection
            ? `${selectedCommits.length} commits selected`
            : "No commits selected"
    );

    //找出对应的CSV
    const selectedLines = data.filter((d) => selectedIds.has(d.commit));

    //按照代码类型统计行数
    const languageCounts = d3
        .rollups(
            selectedLines,
            (lines) => lines.length,
            (d) => d.type
        )
        .sort((a,b) => b[1] - a[1]);

    //显示统计结果
    d3.select("#language-breakdown")
      .selectAll("p")
      .data(languageCounts, (d) => d[0])
      .join("p")
      .text(([type, count]) =>
        `${type.toUpperCase()}: ${count} lines (${(
            (count / selectedLines.length) * 100
        ).toFixed(1)}%)`
        );

}
