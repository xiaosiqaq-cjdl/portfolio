import { fetchJSON, renderProjects } from "../global.js";

const projects = await fetchJSON("../lib/projects.json");
const container = document.querySelector(".projects");

if (projects && container) {
  renderProjects(projects, container);

  document.querySelector(".projects-title").textContent =
    `Projects (${projects.length})`;
}