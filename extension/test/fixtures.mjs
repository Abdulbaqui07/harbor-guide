const other = (host, title) =>
  `<a href="https://${host}/page"><h3>${title}</h3></a><div>Some snippet text that makes the block tall enough to look like a real result block.</div>`;

const harbor = (href) =>
  `<a href="${href}"><h3>Harbor Terminal Portal - Container tracking</h3></a><div>Sign in to track containers in the yard and raise gate release requests.</div>`;

export const FIXTURES = {
  google: `<div id="search">
    <div data-hveid="a"><div data-snc="x">${other("portlogix.example", "Terminal Operations Handbook")}</div></div>
    <div data-hveid="b"><div data-snc="y">${harbor("https://harbor-guide.vercel.app/")}</div></div>
    <div data-hveid="c"><div data-snc="z">${other("freightwire.example", "Container tracking compared")}</div></div>
  </div>`,

  googleClassic: `<div id="search">
    <div class="g">${other("portlogix.example", "Handbook")}</div>
    <div class="g">${harbor("https://harbor-guide.vercel.app/login")}</div>
    <div class="g">${other("northgate-terminals.example", "Customer services")}</div>
  </div>`,

  bing: `<ol id="b_results">
    <li class="b_algo">${other("portlogix.example", "Handbook")}</li>
    <li class="b_algo">${harbor("https://harbor-guide.vercel.app/guide")}</li>
    <li class="b_algo">${other("freightwire.example", "Comparison")}</li>
  </ol>`,

  // DuckDuckGo wraps the destination in a redirect parameter.
  duckduckgo: `<div id="links">
    <article data-testid="result">${other("portlogix.example", "Handbook")}</article>
    <article data-testid="result">${harbor("https://duckduckgo.com/l/?uddg=https%3A%2F%2Fharbor-guide.vercel.app%2F&rut=abc")}</article>
    <article data-testid="result">${other("northgate-terminals.example", "Services")}</article>
  </div>`,

  noMatch: `<div id="search">
    <div data-hveid="a"><div data-snc="x">${other("portlogix.example", "Handbook")}</div></div>
    <div data-hveid="b"><div data-snc="y">${other("freightwire.example", "Comparison")}</div></div>
  </div>`,
};
