import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

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

// 把提交日期映射到滑块的 0–100
const timeScale = d3
    .scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

let commitProgress = 100;
let commitMaxTime = timeScale.invert(commitProgress);

const progressSlider = document.querySelector("#commit-progress");
const timeDisplay = document.querySelector("#commit-time");

function updateTimeDisplay() {
    timeDisplay.textContent = commitMaxTime.toLocaleString();
    timeDisplay.dateTime = commitMaxTime.toISOString();
}

progressSlider.addEventListener("input", (event) => {
    activeCommitId = null;
    steps.classed("is-active", false);
    commitProgress = Number(event.target.value);
    commitMaxTime = timeScale.invert(commitProgress);

    updateTimeDisplay();
    updateScatterPlot();
    updateFileVisualization();

    // 日期变化后，隐藏浮窗并清除旧的框选
    tooltip.property("hidden", true);
    svg.select(".brush").call(brush.move, null);
});

// 页面打开时就显示最新提交时间
updateTimeDisplay();

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


// 圆点容器只创建一次
const dots = svg.append("g").attr("class", "dots");

// 当前时间之前的提交
let filteredCommits = commits.filter(
    d => d.datetime <= commitMaxTime
);

function updateScatterPlot() {
    filteredCommits = commits.filter(
        d => d.datetime <= commitMaxTime
    );

    dots
        .selectAll("circle")
        .data(filteredCommits, d => d.id)
        .join("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.hourFrac))
        .attr("r", d => rScale(d.totalLines))
        .attr("fill-opacity", 0.7)
        .attr("fill", "steelblue")
        .on("mouseenter", (event, d) => {
            tooltip
                .property("hidden", false)
                .text(
                    `Commit: ${d.id}
    Author: ${d.author}
    Date: ${d.datetime.toLocaleString()}
    Lines represented: ${d.totalLines}`
                );

            positionTooltip(event);
        })
        .on("mousemove", positionTooltip)
        .on("mouseleave", () => {
            tooltip.property("hidden", true);
        });
}

// 初次显示
    updateScatterPlot();


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
        ? filteredCommits.filter((d) => {
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

// 使用完整数据确定颜色，避免筛选后颜色变化
const fileTypeColor = d3
    .scaleOrdinal()
    .domain([...new Set(data.map(d => d.type))].sort())
    .range(d3.schemeTableau10);

function updateFileVisualization() {
    const visibleCommitIds = new Set(
        filteredCommits.map(d => d.id)
    );

    const visibleLines = data.filter(
        d => visibleCommitIds.has(d.commit)
    );

    // 按文件分组，代码行最多的排在前面
    const files = d3
        .groups(visibleLines, d => d.file)
        .map(([name, lines]) => ({ name, lines }))
        .sort((a, b) =>
            b.lines.length - a.lines.length ||
            d3.ascending(a.name, b.name)
        );

    const rows = d3
        .select("#files")
        .selectAll(".file-row")
        .data(files, d => d.name)
        .join(enter => {
            const row = enter
                .append("div")
                .attr("class", "file-row");

            const label = row
                .append("div")
                .attr("class", "file-label");

            label.append("code");
            label.append("small");

            row.append("div").attr("class", "file-lines");

            return row;
        });

    rows.select("code").text(d => d.name);

    rows.select("small").text(d =>
        `${d.lines.length} lines`
    );

    rows.each(function (file) {
        d3.select(this)
            .select(".file-lines")
            .selectAll(".line-unit")
            .data(file.lines)
            .join("span")
            .attr("class", "line-unit")
            .style("background-color", d => fileTypeColor(d.type))
            .attr("title", d =>
                `${d.file}\nLine: ${d.line}\nType: ${d.type}`
            );
    });
}

// 页面初始化时显示一次
updateFileVisualization();

// 叙事按时间从早到晚排列，不修改原始 commits 数组
const storyCommits = [...commits].sort(
    (a, b) => a.datetime - b.datetime
);

const steps = d3
    .select("#commit-story")
    .selectAll(".commit-step")
    .data(storyCommits, d => d.id)
    .join("article")
    .attr("class", "commit-step");

steps
    .append("h3")
    .text((d, i) => `Commit ${i + 1}`);

steps
    .append("p")
    .text(d => d.datetime.toLocaleString());

steps
    .append("p")
    .text(d =>
        `${d.author} contributed ${d.totalLines} lines represented in this dataset.`
    );

steps
    .append("code")
    .text(d => d.id.slice(0, 7));


let activeCommitId = null;

function activateCommit(commit) {
    // 同一条记录不重复更新
    if (commit.id === activeCommitId) return;
    activeCommitId = commit.id;

    // 高亮正在阅读的文字
    steps.classed("is-active", d => d.id === commit.id);

    // 直接使用提交时间，避免滑块取整造成误差
    commitMaxTime = commit.datetime;
    commitProgress = timeScale(commitMaxTime);
    progressSlider.value = commitProgress;

    updateTimeDisplay();
    updateScatterPlot();
    updateFileVisualization();

    tooltip.property("hidden", true);
    svg.select(".brush").call(brush.move, null);
}

function updateStoryOnScroll() {
    const story = document.querySelector("#commit-story");
    const bounds = story.getBoundingClientRect();

    // 用屏幕高度的 35% 处作为阅读位置
    const readingLine = window.innerHeight * 0.35;

    // 不在叙事区域内时，不干预时间滑块
    if (bounds.top > readingLine || bounds.bottom < readingLine) {
        return;
    }

    const elements = steps.nodes();
    let activeIndex = 0;

    // 找出最后一个顶部已经越过阅读位置的段落
    elements.forEach((element, index) => {
        if (element.getBoundingClientRect().top <= readingLine) {
            activeIndex = index;
        }
    });

    if (storyCommits.length > 0) {
        activateCommit(storyCommits[activeIndex]);
    }
}

// 每帧最多检查一次，避免滚动时频繁执行
let scrollUpdatePending = false;

function scheduleStoryUpdate() {
    if (scrollUpdatePending) return;

    scrollUpdatePending = true;

    requestAnimationFrame(() => {
        scrollUpdatePending = false;
        updateStoryOnScroll();
    });
}

window.addEventListener("scroll", scheduleStoryUpdate, {
    passive: true,
});

window.addEventListener("resize", scheduleStoryUpdate);

    updateStoryOnScroll();