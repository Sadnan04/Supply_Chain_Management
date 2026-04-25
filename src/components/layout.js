export function buildShell(title, subtitle, body) {
  return `<section class="title"><h2>${title}</h2><p>${subtitle}</p></section>${body}`;
}

export function renderNav(container, routes, labels, current) {
  container.innerHTML = routes
    .map(
      (route) =>
        `<a class="${route === current ? "active" : ""}" href="#/${route}">${labels[route]}</a>`,
    )
    .join("");
}
