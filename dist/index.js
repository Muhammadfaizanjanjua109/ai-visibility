'use strict';

var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var cheerio__namespace = /*#__PURE__*/_interopNamespace(cheerio);
var fs__default = /*#__PURE__*/_interopDefault(fs);
var path__default = /*#__PURE__*/_interopDefault(path);

// src/data/crawlers.ts
var AI_CRAWLERS = [
  {
    name: "GPTBot",
    company: "OpenAI",
    userAgentPattern: "gptbot",
    purpose: "training"
  },
  {
    name: "ChatGPT-User",
    company: "OpenAI",
    userAgentPattern: "chatgpt-user",
    purpose: "search"
  },
  {
    name: "ClaudeBot",
    company: "Anthropic",
    userAgentPattern: "claudebot",
    purpose: "training"
  },
  {
    name: "Claude-Web",
    company: "Anthropic",
    userAgentPattern: "claude-web",
    purpose: "search"
  },
  {
    name: "PerplexityBot",
    company: "Perplexity AI",
    userAgentPattern: "perplexitybot",
    purpose: "search"
  },
  {
    name: "Google-Extended",
    company: "Google",
    userAgentPattern: "google-extended",
    purpose: "training"
  },
  {
    name: "Googlebot",
    company: "Google",
    userAgentPattern: "googlebot",
    purpose: "indexing"
  },
  {
    name: "Bingbot",
    company: "Microsoft",
    userAgentPattern: "bingbot",
    purpose: "indexing"
  },
  {
    name: "CCBot",
    company: "Common Crawl",
    userAgentPattern: "ccbot",
    purpose: "training"
  },
  {
    name: "YouBot",
    company: "You.com",
    userAgentPattern: "youbot",
    purpose: "search"
  },
  {
    name: "cohere-ai",
    company: "Cohere",
    userAgentPattern: "cohere-ai",
    purpose: "training"
  },
  {
    name: "meta-externalagent",
    company: "Meta",
    userAgentPattern: "meta-externalagent",
    purpose: "training"
  },
  {
    name: "Applebot-Extended",
    company: "Apple",
    userAgentPattern: "applebot-extended",
    purpose: "training"
  },
  {
    name: "Diffbot",
    company: "Diffbot",
    userAgentPattern: "diffbot",
    purpose: "indexing"
  },
  {
    name: "Bytespider",
    company: "ByteDance",
    userAgentPattern: "bytespider",
    purpose: "training"
  }
];
function detectBot(userAgent) {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  return AI_CRAWLERS.find((bot) => ua.includes(bot.userAgentPattern)) ?? null;
}

// src/middleware/ai-detector.ts
var HTMLOptimizer = class {
  constructor(options = {}) {
    this.options = {
      stripJs: options.stripJs ?? true,
      removeAds: options.removeAds ?? true,
      removeTracking: options.removeTracking ?? true,
      simplifyNav: options.simplifyNav ?? false,
      structureContent: options.structureContent ?? true
    };
  }
  optimize(html) {
    let result = html;
    if (this.options.stripJs) {
      result = result.replace(
        /<script(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,
        ""
      );
      result = result.replace(/\s+on\w+="[^"]*"/gi, "");
      result = result.replace(/\s+on\w+='[^']*'/gi, "");
    }
    if (this.options.removeTracking) {
      result = result.replace(
        /<img[^>]*(?:width=["']1["'][^>]*height=["']1["']|height=["']1["'][^>]*width=["']1["'])[^>]*\/?>/gi,
        ""
      );
      result = result.replace(
        /<noscript>[^<]*(?:google-analytics|gtm|facebook|pixel)[^<]*<\/noscript>/gi,
        ""
      );
      result = result.replace(
        /<link[^>]*(?:google-analytics|doubleclick|facebook\.net)[^>]*>/gi,
        ""
      );
    }
    if (this.options.removeAds) {
      result = result.replace(
        /<[^>]+(?:class|id)=["'][^"']*(?:ad-|ads-|advertisement|banner-ad|sponsored)[^"']*["'][^>]*>[\s\S]*?<\/\w+>/gi,
        ""
      );
      result = result.replace(/<ins\b[^>]*>[\s\S]*?<\/ins>/gi, "");
    }
    if (this.options.simplifyNav) {
      result = result.replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, (_, inner) => {
        const links = inner.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi) || [];
        return `<nav>${links.join(" | ")}</nav>`;
      });
    }
    result = result.replace(
      "<head>",
      "<head>\n  <!-- Optimized for AI crawlers by ai-visibility -->"
    );
    return result;
  }
};
var AIBotDetector = class {
  constructor(config = {}) {
    this.additionalBots = config.additionalBots ?? [];
    this.ignoreBots = new Set(
      (config.ignoreBots ?? []).map((b) => b.toLowerCase())
    );
  }
  /**
   * Detect if the given User-Agent belongs to an AI crawler.
   * Returns BotInfo if detected, null otherwise.
   */
  detect(userAgent) {
    if (!userAgent) return null;
    const known = detectBot(userAgent);
    if (known && !this.ignoreBots.has(known.userAgentPattern)) {
      return known;
    }
    const ua = userAgent.toLowerCase();
    for (const pattern of this.additionalBots) {
      if (ua.includes(pattern.toLowerCase()) && !this.ignoreBots.has(pattern.toLowerCase())) {
        return {
          name: pattern,
          company: "Unknown",
          userAgentPattern: pattern.toLowerCase(),
          purpose: "unknown"
        };
      }
    }
    return null;
  }
  /** Get all tracked bot names */
  getBotNames() {
    return [
      ...AI_CRAWLERS.map((b) => b.name),
      ...this.additionalBots
    ];
  }
};
function createAIMiddleware(config = {}) {
  const detector = new AIBotDetector(config);
  const verbose = config.verbose ?? false;
  return function aiDetectorMiddleware(req, _res, next) {
    const userAgent = req.headers["user-agent"] ?? "";
    const botInfo = detector.detect(userAgent);
    if (botInfo) {
      req.isAIBot = true;
      req.aiBotInfo = botInfo;
      if (verbose) {
        console.log(
          `[ai-visibility] \u{1F916} ${botInfo.name} (${botInfo.company}) detected \u2192 ${req.method} ${req.url}`
        );
      }
    }
    next();
  };
}
function optimizeResponseForAI(options = {}) {
  const optimizer = new HTMLOptimizer(options);
  return function aiOptimizeMiddleware(req, res, next) {
    if (!req.isAIBot) {
      next();
      return;
    }
    const originalSend = res.send.bind(res);
    res.send = function(body) {
      if (typeof body === "string" && body.includes("<html") && res.getHeader("content-type")?.includes("text/html") !== false) {
        body = optimizer.optimize(body);
      }
      return originalSend(body);
    };
    next();
  };
}

// src/generators/robots-generator.ts
var DEFAULT_DISALLOW = ["/admin", "/api", "/private", "/_next", "/static"];
var RobotsGenerator = class _RobotsGenerator {
  constructor(config = {}) {
    const allBotNames = AI_CRAWLERS.map((b) => b.name);
    this.config = {
      allowAI: config.allowAI ?? allBotNames,
      blockAI: config.blockAI ?? [],
      disallow: config.disallow ?? DEFAULT_DISALLOW,
      sitemapUrl: config.sitemapUrl ?? "",
      crawlDelay: config.crawlDelay ?? 0
    };
  }
  /**
   * Generate the robots.txt content as a string.
   */
  generate() {
    const lines = [];
    lines.push("# robots.txt \u2014 Generated by ai-visibility");
    lines.push("# https://github.com/yourusername/ai-visibility");
    lines.push("");
    if (this.config.blockAI.length > 0) {
      lines.push("# Blocked AI crawlers (training opt-out)");
      for (const bot of this.config.blockAI) {
        lines.push(`User-agent: ${bot}`);
        lines.push("Disallow: /");
        lines.push("");
      }
    }
    const allowedBots = this.config.allowAI.filter(
      (b) => !this.config.blockAI.includes(b)
    );
    if (allowedBots.length > 0) {
      lines.push("# AI crawlers \u2014 explicitly allowed");
      for (const bot of allowedBots) {
        lines.push(`User-agent: ${bot}`);
        lines.push("Allow: /");
        if (this.config.crawlDelay > 0) {
          lines.push(`Crawl-delay: ${this.config.crawlDelay}`);
        }
        lines.push("");
      }
    }
    lines.push("# Default rules");
    lines.push("User-agent: *");
    for (const path2 of this.config.disallow) {
      lines.push(`Disallow: ${path2}`);
    }
    lines.push("");
    if (this.config.sitemapUrl) {
      lines.push(`Sitemap: ${this.config.sitemapUrl}`);
    }
    return lines.join("\n");
  }
  /**
   * Returns a pre-built robots.txt that allows ALL known AI crawlers.
   * Good for quick setup with zero configuration.
   */
  static allowAll(options = {}) {
    return new _RobotsGenerator({
      allowAI: AI_CRAWLERS.map((b) => b.name),
      blockAI: [],
      disallow: options.disallow ?? DEFAULT_DISALLOW,
      sitemapUrl: options.sitemapUrl
    }).generate();
  }
  /**
   * Returns a robots.txt that blocks training bots (CCBot, GPTBot, etc.)
   * but allows search/indexing bots.
   */
  static blockTraining(options = {}) {
    const trainingBots = AI_CRAWLERS.filter((b) => b.purpose === "training").map((b) => b.name);
    const searchBots = AI_CRAWLERS.filter((b) => b.purpose !== "training").map((b) => b.name);
    return new _RobotsGenerator({
      allowAI: searchBots,
      blockAI: trainingBots,
      disallow: options.disallow ?? DEFAULT_DISALLOW,
      sitemapUrl: options.sitemapUrl
    }).generate();
  }
};

// src/generators/llms-generator.ts
var LLMSTextGenerator = class {
  constructor(config) {
    this.config = config;
  }
  /**
   * Generate the llms.txt content.
   * If autoSummarize is true and a page has no summary, it will attempt
   * to fetch the page and extract the first meaningful paragraph.
   */
  async generate() {
    const { siteName, description, baseUrl, pages, contact } = this.config;
    const lines = [];
    lines.push(`# ${siteName}`);
    lines.push("");
    lines.push(`> ${description}`);
    lines.push("");
    if (contact) {
      lines.push("## About");
      lines.push("");
      if (contact.email) lines.push(`- Email: ${contact.email}`);
      if (contact.twitter) lines.push(`- Twitter: ${contact.twitter}`);
      if (contact.github) lines.push(`- GitHub: ${contact.github}`);
      lines.push("");
    }
    const sorted = [...pages].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2, undefined: 1 };
      return (order[a.priority ?? "medium"] ?? 1) - (order[b.priority ?? "medium"] ?? 1);
    });
    const highPriority = sorted.filter((p) => p.priority === "high");
    const rest = sorted.filter((p) => p.priority !== "high");
    if (highPriority.length > 0) {
      lines.push("## Key Resources");
      lines.push("");
      for (const page of highPriority) {
        await this.appendPage(lines, page, baseUrl);
      }
    }
    if (rest.length > 0) {
      lines.push("## All Pages");
      lines.push("");
      for (const page of rest) {
        await this.appendPage(lines, page, baseUrl);
      }
    }
    lines.push("---");
    lines.push(`Generated by ai-visibility \u2014 https://github.com/yourusername/ai-visibility`);
    return lines.join("\n");
  }
  async appendPage(lines, page, baseUrl) {
    const fullUrl = this.resolveUrl(page.url, baseUrl);
    lines.push(`### ${page.title}`);
    lines.push(`URL: ${fullUrl}`);
    let summary = page.summary;
    if (!summary && this.config.autoSummarize) {
      summary = await this.fetchSummary(fullUrl);
    }
    if (summary) {
      lines.push("");
      lines.push(summary);
    }
    lines.push("");
  }
  resolveUrl(url, baseUrl) {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    if (baseUrl) {
      return `${baseUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
    }
    return url;
  }
  /**
   * Attempt to fetch a live URL and extract its first meaningful paragraph.
   * Falls back gracefully if fetch fails.
   */
  async fetchSummary(url) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "ai-visibility/0.1.0 (llms.txt generator)" },
        signal: AbortSignal.timeout(5e3)
      });
      if (!response.ok) return "";
      const html = await response.text();
      const match = html.match(
        /<(?:article|main|\.content)[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i
      ) ?? html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (match) {
        const text = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        return text.slice(0, 300) + (text.length > 300 ? "..." : "");
      }
      return "";
    } catch {
      return "";
    }
  }
  /**
   * Generate a minimal llms.txt with just URLs and titles.
   * Useful for large sites where you don't want summaries.
   */
  static minimal(config) {
    const lines = [];
    lines.push(`# ${config.siteName}`);
    lines.push("");
    lines.push(`> ${config.description}`);
    lines.push("");
    lines.push("## Pages");
    lines.push("");
    for (const page of config.pages) {
      const base = config.baseUrl?.replace(/\/$/, "") ?? "";
      const url = page.url.startsWith("http") ? page.url : `${base}${page.url}`;
      lines.push(`- [${page.title}](${url})`);
    }
    return lines.join("\n");
  }
};
var SchemaBuilder = class _SchemaBuilder {
  // ---- FAQ ----
  static faq(items) {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a
        }
      }))
    };
  }
  // ---- Product ----
  static product(data) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: data.name,
      offers: {
        "@type": "Offer",
        price: data.price,
        priceCurrency: data.currency ?? "USD",
        availability: `https://schema.org/${data.availability ?? "InStock"}`
      }
    };
    if (data.description) schema["description"] = data.description;
    if (data.url) schema["url"] = data.url;
    if (data.image) schema["image"] = data.image;
    if (data.brand) schema["brand"] = { "@type": "Brand", name: data.brand };
    if (data.features?.length) schema["additionalProperty"] = data.features.map((f) => ({
      "@type": "PropertyValue",
      name: "feature",
      value: f
    }));
    if (data.author) {
      schema["author"] = {
        "@type": "Person",
        name: data.author.name,
        ...data.author.jobTitle && { jobTitle: data.author.jobTitle }
      };
    }
    return schema;
  }
  // ---- Article ----
  static article(data) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: data.headline
    };
    if (data.description) schema["description"] = data.description;
    if (data.url) schema["url"] = data.url;
    if (data.image) schema["image"] = data.image;
    if (data.publishedDate) schema["datePublished"] = data.publishedDate;
    if (data.modifiedDate) schema["dateModified"] = data.modifiedDate;
    if (data.keywords?.length) schema["keywords"] = data.keywords.join(", ");
    if (data.author) {
      schema["author"] = { "@type": "Person", name: data.author };
    }
    if (data.publisher) {
      schema["publisher"] = {
        "@type": "Organization",
        name: data.publisher
      };
    }
    return schema;
  }
  // ---- Organization ----
  static organization(data) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: data.name
    };
    if (data.url) schema["url"] = data.url;
    if (data.logo) schema["logo"] = data.logo;
    if (data.description) schema["description"] = data.description;
    if (data.email) schema["email"] = data.email;
    if (data.phone) schema["telephone"] = data.phone;
    if (data.sameAs?.length) schema["sameAs"] = data.sameAs;
    if (data.address) {
      schema["address"] = {
        "@type": "PostalAddress",
        ...data.address.street && { streetAddress: data.address.street },
        ...data.address.city && { addressLocality: data.address.city },
        ...data.address.country && { addressCountry: data.address.country }
      };
    }
    return schema;
  }
  // ---- Person ----
  static person(data) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: data.name
    };
    if (data.jobTitle) schema["jobTitle"] = data.jobTitle;
    if (data.url) schema["url"] = data.url;
    if (data.image) schema["image"] = data.image;
    if (data.email) schema["email"] = data.email;
    if (data.description) schema["description"] = data.description;
    if (data.sameAs?.length) schema["sameAs"] = data.sameAs;
    if (data.worksFor) schema["worksFor"] = { "@type": "Organization", name: data.worksFor };
    return schema;
  }
  // ---- Auto-detect from HTML ----
  /**
   * Analyze HTML content and auto-generate the most appropriate schema.
   * Uses heuristics to detect FAQ, Product, or Article patterns.
   */
  static fromHTML(html, hints = {}) {
    const $ = cheerio__namespace.load(html);
    const type = _SchemaBuilder.detectType($);
    if (type === "faq") {
      const faqs = _SchemaBuilder.extractFAQs($);
      if (faqs.length > 0) return _SchemaBuilder.faq(faqs);
    }
    if (type === "product") {
      const price = _SchemaBuilder.extractPrice($);
      const name = $("h1").first().text().trim() || "Product";
      return _SchemaBuilder.product({
        name,
        price: price ?? 0,
        currency: "USD",
        features: _SchemaBuilder.extractFeatures($)
      });
    }
    const headline = $("h1").first().text().trim() || "Article";
    const description = $('meta[name="description"]').attr("content") ?? $("p").first().text().trim().slice(0, 160);
    return _SchemaBuilder.article({
      headline,
      description,
      author: hints.author ?? $('meta[name="author"]').attr("content"),
      publisher: hints.publisher
    });
  }
  // ---- Render helpers ----
  /**
   * Serialize schema to a JSON-LD <script> tag string.
   * Use this to inject into your HTML <head>.
   */
  static toScriptTag(schema) {
    return `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;
  }
  /**
   * Serialize multiple schemas into a single <script> tag (array).
   */
  static toScriptTagMultiple(schemas) {
    return `<script type="application/ld+json">
${JSON.stringify(schemas, null, 2)}
</script>`;
  }
  // ---- Private helpers ----
  static detectType($) {
    const text = $("body").text().toLowerCase();
    const h1 = $("h1").first().text().toLowerCase();
    if (text.includes("frequently asked") || text.includes("faq") || $('dt, .faq, [class*="faq"]').length > 2) {
      return "faq";
    }
    if (text.match(/\$[\d,]+|€[\d,]+|£[\d,]+/) || text.includes("add to cart") || text.includes("buy now") || h1.includes("pricing") || text.includes("per month") || text.includes("/month")) {
      return "product";
    }
    return "article";
  }
  static extractFAQs($) {
    const faqs = [];
    $("dt").each((_, dt) => {
      const q = $(dt).text().trim();
      const a = $(dt).next("dd").text().trim();
      if (q && a) faqs.push({ q, a });
    });
    if (faqs.length === 0) {
      $("h3, h4").each((_, el) => {
        const q = $(el).text().trim();
        const a = $(el).next("p").text().trim();
        if (q && a && q.includes("?")) faqs.push({ q, a });
      });
    }
    return faqs;
  }
  static extractPrice($) {
    const text = $("body").text();
    const match = text.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    if (match) {
      return parseFloat(match[1].replace(",", ""));
    }
    return null;
  }
  static extractFeatures($) {
    const features = [];
    $("ul li, ol li").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && text.length < 200) {
        features.push(text);
      }
    });
    return features.slice(0, 10);
  }
};
var DEFAULT_OPTIONS = {
  checkAnswerPlacement: true,
  checkFactDensity: true,
  checkHeadingStructure: true,
  checkEEAT: true,
  checkSnippability: true,
  checkSchema: true
};
var ContentAnalyzer = class {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  /**
   * Analyze HTML content and return an AI readability score.
   */
  async analyze(html) {
    const $ = cheerio__namespace.load(html);
    const issues = [];
    const breakdown = {
      answerFrontLoading: 0,
      factDensity: 0,
      headingStructure: 0,
      eeatSignals: 0,
      snippability: 0,
      schemaCoverage: 0
    };
    if (this.options.checkAnswerPlacement) {
      const result = this.checkAnswerFrontLoading($);
      breakdown.answerFrontLoading = result.score;
      issues.push(...result.issues);
    } else {
      breakdown.answerFrontLoading = 100;
    }
    if (this.options.checkFactDensity) {
      const result = this.checkFactDensity($);
      breakdown.factDensity = result.score;
      issues.push(...result.issues);
    } else {
      breakdown.factDensity = 100;
    }
    if (this.options.checkHeadingStructure) {
      const result = this.checkHeadingStructure($);
      breakdown.headingStructure = result.score;
      issues.push(...result.issues);
    } else {
      breakdown.headingStructure = 100;
    }
    if (this.options.checkEEAT) {
      const result = this.checkEEAT($);
      breakdown.eeatSignals = result.score;
      issues.push(...result.issues);
    } else {
      breakdown.eeatSignals = 100;
    }
    if (this.options.checkSnippability) {
      const result = this.checkSnippability($);
      breakdown.snippability = result.score;
      issues.push(...result.issues);
    } else {
      breakdown.snippability = 100;
    }
    if (this.options.checkSchema) {
      const result = this.checkSchemaCoverage($);
      breakdown.schemaCoverage = result.score;
      issues.push(...result.issues);
    } else {
      breakdown.schemaCoverage = 100;
    }
    const weights = {
      answerFrontLoading: 0.25,
      factDensity: 0.15,
      headingStructure: 0.15,
      eeatSignals: 0.2,
      snippability: 0.1,
      schemaCoverage: 0.15
    };
    const overallScore = Math.round(
      Object.entries(breakdown).reduce((sum, [key, score]) => {
        return sum + score * (weights[key] ?? 0);
      }, 0)
    );
    const recommendations = this.generateRecommendations(breakdown);
    return {
      overallScore,
      breakdown,
      issues: issues.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.severity] - order[b.severity];
      }),
      recommendations
    };
  }
  // ---- Individual Checks ----
  checkAnswerFrontLoading($) {
    const issues = [];
    const h1 = $("h1").first();
    if (!h1.length) {
      issues.push({
        type: "answer-placement",
        severity: "high",
        message: "No H1 tag found on the page",
        fix: "Add a clear, descriptive H1 tag that states what this page is about"
      });
      return { score: 0, issues };
    }
    const mainContent = $('main, article, [role="main"], .content, #content').first();
    const firstP = mainContent.length ? mainContent.find("p").first() : $("h1").first().nextAll("p").first();
    const firstPText = firstP.text().trim();
    if (!firstPText || firstPText.length < 30) {
      issues.push({
        type: "answer-placement",
        severity: "high",
        message: "No substantive paragraph found after H1",
        fix: "Add a clear, direct answer or description in the first paragraph immediately after your H1"
      });
      return { score: 20, issues };
    }
    const h1Text = h1.text().toLowerCase();
    const answerWords = ["is", "are", "helps", "provides", "enables", "allows", "lets", "gives", "makes"];
    const hasDirectAnswer = answerWords.some((w) => firstPText.toLowerCase().includes(w));
    const allText = $("body").text();
    const firstPPosition = allText.indexOf(firstPText.slice(0, 50));
    const positionRatio = firstPPosition / allText.length;
    if (!hasDirectAnswer) {
      issues.push({
        type: "answer-placement",
        severity: "medium",
        message: "First paragraph may not directly answer the page topic",
        fix: `Start with a direct statement like "This page covers..." or "${h1Text} is..."`
      });
      return { score: 55, issues };
    }
    if (positionRatio > 0.2) {
      issues.push({
        type: "answer-placement",
        severity: "medium",
        message: "Main answer appears too far down the page",
        fix: "Move the key answer/description to the very top of the page content"
      });
      return { score: 65, issues };
    }
    return { score: 95, issues };
  }
  checkFactDensity($) {
    const issues = [];
    const paragraphs = $("p");
    let totalWords = 0;
    let verifiableFacts = 0;
    paragraphs.each((_, el) => {
      const text = $(el).text();
      const words = text.split(/\s+/).filter(Boolean).length;
      totalWords += words;
      const facts = (text.match(
        /\b\d+(?:\.\d+)?%|\b\d{4}\b|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|thousand|k|m|b)?\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
      ) ?? []).length;
      verifiableFacts += facts;
    });
    if (totalWords === 0) {
      return { score: 0, issues: [{ type: "fact-density", severity: "high", message: "No paragraph content found", fix: "Add substantive text content to the page" }] };
    }
    const factsPerHundred = verifiableFacts / totalWords * 100;
    if (factsPerHundred < 2) {
      issues.push({
        type: "fact-density",
        severity: "high",
        message: `Very low fact density: ${factsPerHundred.toFixed(1)} facts per 100 words (target: 4-6)`,
        fix: "Add specific numbers, dates, statistics, or measurable claims to support your content"
      });
      return { score: 25, issues };
    }
    if (factsPerHundred < 4) {
      issues.push({
        type: "fact-density",
        severity: "medium",
        message: `Below-target fact density: ${factsPerHundred.toFixed(1)} facts per 100 words (target: 4-6)`,
        fix: "Include more specific data points, percentages, or concrete examples"
      });
      return { score: 60, issues };
    }
    if (factsPerHundred > 10) {
      issues.push({
        type: "fact-density",
        severity: "low",
        message: "Very high fact density \u2014 content may feel dense or list-heavy",
        fix: "Add explanatory prose between data points to improve readability"
      });
      return { score: 75, issues };
    }
    return { score: 95, issues };
  }
  checkHeadingStructure($) {
    const issues = [];
    let score = 100;
    const h1Count = $("h1").length;
    const h2s = $("h2");
    const h3s = $("h3");
    if (h1Count === 0) {
      issues.push({ type: "heading-structure", severity: "high", message: "Missing H1 tag", fix: "Add exactly one H1 tag as the main page title" });
      score -= 40;
    } else if (h1Count > 1) {
      issues.push({ type: "heading-structure", severity: "medium", message: `Multiple H1 tags found (${h1Count})`, fix: "Use only one H1 per page. Demote additional H1s to H2" });
      score -= 20;
    }
    if (h3s.length > 0 && h2s.length === 0) {
      issues.push({ type: "heading-structure", severity: "medium", message: "H3 tags used without any H2 tags", fix: "Add H2 headings to create proper hierarchy: H1 \u2192 H2 \u2192 H3" });
      score -= 20;
    }
    let lastLevel = 1;
    $("h1, h2, h3, h4").each((_, el) => {
      const level = parseInt(el.tagName.replace("h", ""), 10);
      if (level > lastLevel + 1) {
        issues.push({
          type: "heading-structure",
          severity: "low",
          message: `Heading level skipped: H${lastLevel} \u2192 H${level}`,
          fix: `Add an H${lastLevel + 1} between your H${lastLevel} and H${level}`
        });
        score -= 10;
      }
      lastLevel = level;
    });
    $("h1, h2, h3").each((_, el) => {
      if (!$(el).text().trim()) {
        issues.push({ type: "heading-structure", severity: "medium", message: "Empty heading tag found", fix: "Remove or fill empty heading tags" });
        score -= 10;
      }
    });
    return { score: Math.max(0, score), issues };
  }
  checkEEAT($) {
    const issues = [];
    let score = 0;
    const MAX = 100;
    const hasAuthor = $('[itemtype*="Person"], [itemprop="author"], meta[name="author"], .author, [rel="author"]').length > 0 || $("body").text().match(/written by|by [A-Z][a-z]+ [A-Z][a-z]+/i) !== null;
    if (hasAuthor) {
      score += 25;
    } else {
      issues.push({
        type: "eeat",
        severity: "medium",
        message: "No author information detected",
        fix: "Add author name with a link to their bio or use schema.org Person markup"
      });
    }
    const hasOrg = $('[itemtype*="Organization"], [itemprop="publisher"]').length > 0 || $('meta[property="og:site_name"]').length > 0;
    if (hasOrg) {
      score += 25;
    } else {
      issues.push({
        type: "eeat",
        severity: "low",
        message: "No organization/publisher markup found",
        fix: "Add Organization schema or og:site_name meta tag"
      });
    }
    const hasContact = $('a[href^="mailto:"], a[href^="tel:"], [role="contentinfo"], footer').length > 0;
    if (hasContact) {
      score += 25;
    } else {
      issues.push({
        type: "eeat",
        severity: "medium",
        message: "No contact information found",
        fix: "Add email, phone, or contact page link \u2014 AI models use this as a trust signal"
      });
    }
    const bodyText = $("body").text();
    const trustSignals = [
      /years?\s+(?:of\s+)?experience/i,
      /certified|certification/i,
      /award|recognized/i,
      /published|featured in/i,
      /trusted by|used by/i,
      /\d+\s*(?:k|,000)?\s*(?:users|customers|companies)/i
    ];
    const hasTrustSignals = trustSignals.some((pattern) => pattern.test(bodyText));
    if (hasTrustSignals) {
      score += 25;
    } else {
      issues.push({
        type: "eeat",
        severity: "low",
        message: "No expertise/trust signals detected",
        fix: "Add credentials, years of experience, customer counts, or press mentions"
      });
    }
    return { score: Math.min(score, MAX), issues };
  }
  checkSnippability($) {
    const issues = [];
    const headings = $("h2, h3");
    if (headings.length === 0) {
      issues.push({
        type: "snippability",
        severity: "medium",
        message: "No H2/H3 subheadings found",
        fix: "Break content into sections with descriptive H2/H3 headings so AI can extract individual sections"
      });
      return { score: 30, issues };
    }
    let snippableCount = 0;
    let totalChecked = 0;
    headings.each((_, el) => {
      totalChecked++;
      const nextEl = $(el).next();
      const nextText = nextEl.text().trim();
      if (nextText.length >= 80) {
        snippableCount++;
      } else {
        issues.push({
          type: "snippability",
          severity: "low",
          message: `Section "${$(el).text().trim()}" has insufficient content below it`,
          fix: "Add at least 2-3 sentences of context below each heading so the section can stand alone"
        });
      }
    });
    const ratio = snippableCount / Math.max(totalChecked, 1);
    const score = Math.round(ratio * 100);
    return { score, issues };
  }
  checkSchemaCoverage($) {
    const issues = [];
    const schemaScripts = $('script[type="application/ld+json"]');
    if (schemaScripts.length === 0) {
      issues.push({
        type: "schema",
        severity: "high",
        message: "No JSON-LD structured data found",
        fix: "Add JSON-LD schema markup using SchemaBuilder from ai-visibility"
      });
      return { score: 0, issues };
    }
    let validSchemas = 0;
    schemaScripts.each((_, el) => {
      try {
        const json = JSON.parse($(el).html() ?? "");
        if (json["@context"] && json["@type"]) validSchemas++;
      } catch {
        issues.push({
          type: "schema",
          severity: "medium",
          message: "Invalid JSON-LD schema found (parse error)",
          fix: "Validate your JSON-LD using schema.org validator or use SchemaBuilder"
        });
      }
    });
    if (validSchemas === 0) {
      return { score: 10, issues };
    }
    const schemaText = $('script[type="application/ld+json"]').text();
    const hasFAQ = schemaText.includes('"FAQPage"');
    const hasOrg = schemaText.includes('"Organization"');
    if (!hasFAQ) {
      issues.push({
        type: "schema",
        severity: "low",
        message: "No FAQPage schema found",
        fix: "Add FAQ schema to help AI models extract Q&A content from your page"
      });
    }
    if (!hasOrg) {
      issues.push({
        type: "schema",
        severity: "low",
        message: "No Organization schema found",
        fix: "Add Organization schema to establish E-E-A-T signals for AI models"
      });
    }
    const score = hasFAQ && hasOrg ? 100 : hasFAQ || hasOrg ? 75 : 50;
    return { score, issues };
  }
  // ---- Recommendations ----
  generateRecommendations(breakdown) {
    const recs = [];
    if (breakdown.answerFrontLoading < 70) {
      recs.push("\u{1F4CC} Front-load your answers: AI models prioritize content in the first 20% of a section");
    }
    if (breakdown.factDensity < 60) {
      recs.push("\u{1F4CA} Add more data: Include specific numbers, dates, and statistics to improve citability");
    }
    if (breakdown.headingStructure < 80) {
      recs.push("\u{1F3D7}\uFE0F Fix heading hierarchy: Use H1 \u2192 H2 \u2192 H3 consistently for better content parsing");
    }
    if (breakdown.eeatSignals < 60) {
      recs.push("\u{1F3C6} Boost E-E-A-T: Add author credentials, company info, and trust signals");
    }
    if (breakdown.snippability < 70) {
      recs.push("\u2702\uFE0F Improve snippability: Each section should be self-contained and informative");
    }
    if (breakdown.schemaCoverage < 50) {
      recs.push("\u{1F516} Add structured data: Use SchemaBuilder to add JSON-LD markup for AI understanding");
    }
    if (recs.length === 0) {
      recs.push("\u2705 Great job! Your content is well-optimized for AI visibility");
    }
    return recs;
  }
};
var DEFAULT_LOG_PATH = "./logs/ai-crawler.json";
var DEFAULT_MAX_MEMORY = 1e3;
var AIVisitorLogger = class {
  constructor(config = {}) {
    this.memoryLogs = [];
    this.config = {
      storage: config.storage ?? "both",
      logFilePath: config.logFilePath ?? DEFAULT_LOG_PATH,
      trackCrawlers: config.trackCrawlers ?? [],
      maxMemoryEntries: config.maxMemoryEntries ?? DEFAULT_MAX_MEMORY
    };
    if (this.config.storage !== "memory") {
      const dir = path__default.default.dirname(this.config.logFilePath);
      if (!fs__default.default.existsSync(dir)) {
        fs__default.default.mkdirSync(dir, { recursive: true });
      }
      if (!fs__default.default.existsSync(this.config.logFilePath)) {
        fs__default.default.writeFileSync(this.config.logFilePath, JSON.stringify([], null, 2));
      }
    }
  }
  /**
   * Express middleware that logs AI crawler visits.
   */
  middleware() {
    return (req, res, next) => {
      const userAgent = req.headers["user-agent"] ?? "";
      const botInfo = detectBot(userAgent);
      if (!botInfo) {
        next();
        return;
      }
      if (this.config.trackCrawlers.length > 0 && !this.config.trackCrawlers.includes(botInfo.name)) {
        next();
        return;
      }
      const startTime = Date.now();
      res.on("finish", () => {
        const log = {
          botName: botInfo.name,
          company: botInfo.company,
          url: req.url,
          method: req.method,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          statusCode: res.statusCode,
          responseTimeMs: Date.now() - startTime,
          userAgent,
          ip: req.ip ?? req.socket.remoteAddress
        };
        this.saveLog(log);
      });
      next();
    };
  }
  /**
   * Manually log a crawler visit (useful for non-Express frameworks).
   */
  log(entry) {
    this.saveLog(entry);
  }
  /**
   * Get all logs, optionally filtered.
   */
  getLogs(filter) {
    const logs = this.readAllLogs();
    return logs.filter((log) => {
      if (filter?.botName && log.botName !== filter.botName) return false;
      if (filter?.url && !log.url.includes(filter.url)) return false;
      if (filter?.days) {
        const cutoff = /* @__PURE__ */ new Date();
        cutoff.setDate(cutoff.getDate() - filter.days);
        if (new Date(log.timestamp) < cutoff) return false;
      }
      return true;
    });
  }
  /**
   * Get aggregated statistics per bot.
   */
  getStats(days) {
    const logs = this.getLogs(days ? { days } : void 0);
    const stats = {};
    for (const log of logs) {
      if (!stats[log.botName]) {
        stats[log.botName] = {
          botName: log.botName,
          company: log.company,
          totalVisits: 0,
          uniqueUrls: /* @__PURE__ */ new Set(),
          lastSeen: log.timestamp,
          avgResponseTimeMs: 0,
          successRate: 0,
          successCount: 0
        };
      }
      const s = stats[log.botName];
      s.totalVisits++;
      s.uniqueUrls.add(log.url);
      if (new Date(log.timestamp) > new Date(s.lastSeen)) {
        s.lastSeen = log.timestamp;
      }
      s.avgResponseTimeMs = (s.avgResponseTimeMs * (s.totalVisits - 1) + log.responseTimeMs) / s.totalVisits;
      if (log.statusCode >= 200 && log.statusCode < 400) {
        s.successCount++;
      }
      s.successRate = Math.round(s.successCount / s.totalVisits * 100);
    }
    const result = {};
    for (const [key, v] of Object.entries(stats)) {
      result[key] = {
        botName: v.botName,
        company: v.company,
        totalVisits: v.totalVisits,
        uniqueUrlCount: v.uniqueUrls.size,
        lastSeen: v.lastSeen,
        avgResponseTimeMs: Math.round(v.avgResponseTimeMs),
        successRate: v.successRate,
        successCount: v.successCount
      };
    }
    return result;
  }
  /**
   * Clear all logs.
   */
  clearLogs() {
    this.memoryLogs = [];
    if (this.config.storage !== "memory") {
      fs__default.default.writeFileSync(this.config.logFilePath, JSON.stringify([], null, 2));
    }
  }
  // ---- Private ----
  saveLog(log) {
    if (this.config.storage === "memory" || this.config.storage === "both") {
      this.memoryLogs.push(log);
      if (this.memoryLogs.length > this.config.maxMemoryEntries) {
        this.memoryLogs = this.memoryLogs.slice(-this.config.maxMemoryEntries);
      }
    }
    if (this.config.storage === "file" || this.config.storage === "both") {
      try {
        const existing = this.readFromFile();
        existing.push(log);
        fs__default.default.writeFileSync(this.config.logFilePath, JSON.stringify(existing, null, 2));
      } catch (err) {
        console.error("[ai-visibility] Failed to write crawler log:", err);
      }
    }
  }
  readAllLogs() {
    if (this.config.storage === "memory") {
      return [...this.memoryLogs];
    }
    if (this.config.storage === "file") {
      return this.readFromFile();
    }
    return this.memoryLogs.length > 0 ? [...this.memoryLogs] : this.readFromFile();
  }
  readFromFile() {
    try {
      if (!fs__default.default.existsSync(this.config.logFilePath)) return [];
      const raw = fs__default.default.readFileSync(this.config.logFilePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
};

exports.AIBotDetector = AIBotDetector;
exports.AIVisitorLogger = AIVisitorLogger;
exports.ContentAnalyzer = ContentAnalyzer;
exports.LLMSTextGenerator = LLMSTextGenerator;
exports.RobotsGenerator = RobotsGenerator;
exports.SchemaBuilder = SchemaBuilder;
exports.createAIMiddleware = createAIMiddleware;
exports.optimizeResponseForAI = optimizeResponseForAI;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map