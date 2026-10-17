console.log("IT'S ALIVE!")

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

let navLinks = $$("nav a");

const BASE_PATH = 
    location.hostname=== "localhost" || location.hostname === "127.0.0.1"
        ? "/"
        : "/portfolio";

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