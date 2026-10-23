console.log("IT'S ALIVE!")

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

let navLinks = $$("nav a");

const BASE_PATH = new URL("./", import.meta.url).pathname;

let pages = [
    {url:"",title:"Home"},
    {url:"projects/", title:"Projects"},
    {url:"contact/", title:"Contact"},
    {url:"resume/", title:"Resume"},
    {url:"https://github.com/xiaosiqaq-cjdl", title:"GitHub"}
];

let nav = document.createElement("nav")
document.body.prepend(nav);

for(let p of pages){
    let url = p.url;

    if(!url.startsWith("http")){
        url = BASE_PATH + url;
    }

    let a = document. createElement("a");
    a.href = url;
    a.textContent = p.title;

    if (a.host === location.host && a.pathname === location.pathname){
        a.classList.add("current");
    }

    if (a.host !== location.host) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
    }

    nav.append(a);
}

document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <label class="color-scheme">
        Theme:
        <select>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
    `
);

let select = document.querySelector(".color-scheme select");

function setColorScheme(colorScheme) {
    document.documentElement.style.setProperty(
        "color-scheme",
        colorScheme
    );
    select.value = colorScheme;
}

// 打开页面时，恢复之前保存的主题
if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
}

// 用户切换选项时，修改主题并保存
select.addEventListener("input", function (event) {
    let colorScheme = event.target.value;

    setColorScheme(colorScheme);
    localStorage.colorScheme = colorScheme;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error loading JSON:", error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = "h2") {
  containerElement.innerHTML = "";

  // JSON 中的图片和链接路径是相对于 projects.js 文件的，因此我们需要使用 URL 构造函数来生成绝对路径
  const projectsBase = new URL("./projects/", import.meta.url);

  for (const project of projects) {
    const article = document.createElement("article");
    const imageURL = new URL(project.image, projectsBase).href;
    const projectURL = project.url
      ? new URL(project.url, projectsBase).href
      : "";

    article.innerHTML = `
      <${headingLevel}>
        ${
          projectURL
            ? `<a href="${projectURL}">${project.title}</a>`
            : project.title
        }
      </${headingLevel}>

      ${
        projectURL
          ? `<a href="${projectURL}">
               <img src="${imageURL}" alt="${project.title}">
             </a>`
          : `<img src="${imageURL}" alt="">`
      }

      <p>${project.description}</p>

      ${projectURL ? `<a href="${projectURL}">View project →</a>` : ""}
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}