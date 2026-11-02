import { fetchJSON, renderProjects } from "../global.js";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const projects = await fetchJSON("../lib/projects.json");
const container = document.querySelector(".projects");
const searchInput = document.querySelector(".searchBar");
const title = document.querySelector(".projects-title");

if (projects && container && searchInput) {
  let query = "";
  let selectedYear = null;

  const years = [...new Set(projects.map(d => String(d.year)))]
    .sort(d3.descending);

  const colors = d3.scaleOrdinal()
    .domain(years)
    .range(d3.schemeTableau10);

  function toggleYear(year) {
    selectedYear = selectedYear === year ? null : year;
    update();
  }

  function renderPieChart(projectsGiven) {
    const data = d3.rollups(
      projectsGiven,
      group => group.length,
      project => String(project.year)
    )
      .map(([year, count]) => ({
        label: year,
        value: count
      }))
      .sort((a, b) => d3.descending(a.label, b.label));

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(50);

    const svg = d3.select("#projects-pie-plot");
    const legend = d3.select(".projects-legend");

    // 按年份匹配已有元素，更新时保持颜色和元素稳定
    const slices = svg.selectAll("path")
      .data(pie(data), d => d.data.label)
      .join("path")
      .attr("d", arc)
      .attr("fill", d => colors(d.data.label))
      .classed(
        "is-selected",
        d => d.data.label === selectedYear
      )
      .classed(
        "is-muted",
        d => selectedYear !== null
          && d.data.label !== selectedYear
      )
      .on("click", (event, d) => {
        toggleYear(d.data.label);
      });

    slices.selectAll("title")
      .data(d => [d])
      .join("title")
      .text(d => `${d.data.label}: ${d.data.value} projects`);

    const items = legend.selectAll("li")
      .data(data, d => d.label)
      .join("li");

    const buttons = items.selectAll("button")
      .data(d => [d])
      .join("button")
      .attr("type", "button")
      .attr("class", "legend-button")
      .attr("aria-pressed", d => String(d.label === selectedYear))
      .classed("is-selected", d => d.label === selectedYear)
      .on("click", (event, d) => {
        toggleYear(d.label);
      });

    buttons.selectAll(".swatch")
      .data(d => [d])
      .join("span")
      .attr("class", "swatch")
      .attr("aria-hidden", "true")
      .style("background-color", d => colors(d.label));

    buttons.selectAll(".legend-label")
      .data(d => [d])
      .join("span")
      .attr("class", "legend-label")
      .text(d => `${d.label} (${d.value})`);
  }

  function update() {
    // 第一步：搜索
    const searchResults = projects.filter(project =>
      Object.values(project)
        .join("\n")
        .toLowerCase()
        .includes(query)
    );

    // 搜索结果中没有选中的年份时，清除年份选择
    if (
      selectedYear !== null
      && !searchResults.some(
        project => String(project.year) === selectedYear
      )
    ) {
      selectedYear = null;
    }

    // 第二步：在搜索结果中筛选年份
    const visibleProjects = searchResults.filter(project =>
      selectedYear === null
      || String(project.year) === selectedYear
    );

    renderProjects(visibleProjects, container);
    title.textContent = `Projects (${visibleProjects.length})`;

    if (visibleProjects.length === 0) {
      container.textContent = "No projects match your search.";
    }

    // 饼图保留搜索结果的全部年份，方便切换选择
    renderPieChart(searchResults);
  }

  searchInput.addEventListener("input", event => {
    query = event.target.value.trim().toLowerCase();
    update();
  });

  update();
}