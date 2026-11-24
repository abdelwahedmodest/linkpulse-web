/**
 * LinkPulse Web - High Fidelity Backlink Data Generator & Presets
 * Generates realistic, consistent backlink profiles (DR, backlinks, referring domains, top 100 backlinks)
 * with deterministic hashing for any arbitrary domain or URL, plus enriched presets for popular domains.
 */

class BacklinkDataGenerator {
  constructor() {
    this.sourceDomains = [
      { domain: 'medium.com', dr: 92, traffic: 420000, category: 'tech' },
      { domain: 'dev.to', dr: 86, traffic: 185000, category: 'dev' },
      { domain: 'techcrunch.com', dr: 93, traffic: 890000, category: 'news' },
      { domain: 'forbes.com', dr: 94, traffic: 2400000, category: 'business' },
      { domain: 'github.com', dr: 96, traffic: 5600000, category: 'dev' },
      { domain: 'searchengineland.com', dr: 89, traffic: 310000, category: 'seo' },
      { domain: 'searchenginejournal.com', dr: 90, traffic: 450000, category: 'seo' },
      { domain: 'hubspot.com', dr: 93, traffic: 1950000, category: 'marketing' },
      { domain: 'moz.com', dr: 91, traffic: 280000, category: 'seo' },
      { domain: 'smashingmagazine.com', dr: 88, traffic: 210000, category: 'design' },
      { domain: 'producthunt.com', dr: 90, traffic: 640000, category: 'products' },
      { domain: 'reddit.com', dr: 95, traffic: 8900000, category: 'community' },
      { domain: 'hackernews.ycombinator.com', dr: 91, traffic: 1200000, category: 'tech' },
      { domain: 'css-tricks.com', dr: 87, traffic: 175000, category: 'dev' },
      { domain: 'digitalocean.com', dr: 89, traffic: 510000, category: 'hosting' },
      { domain: 'stackexchange.com', dr: 92, traffic: 1400000, category: 'qa' },
      { domain: 'quora.com', dr: 93, traffic: 3200000, category: 'qa' },
      { domain: 'lemonde.fr', dr: 92, traffic: 1600000, category: 'news' },
      { domain: 'journaldunet.com', dr: 84, traffic: 340000, category: 'tech' },
      { domain: 'lefigaro.fr', dr: 91, traffic: 1450000, category: 'news' },
      { domain: 'webrankinfo.com', dr: 79, traffic: 92000, category: 'seo' },
      { domain: 'presse-citron.net', dr: 82, traffic: 280000, category: 'tech' },
      { domain: 'frandroid.com', dr: 85, traffic: 410000, category: 'tech' },
      { domain: 'clubic.com', dr: 84, traffic: 320000, category: 'tech' },
      { domain: 'siecledigital.fr', dr: 78, traffic: 85000, category: 'digital' },
      { domain: 'substack.com', dr: 91, traffic: 1100000, category: 'newsletter' },
      { domain: 'hashnode.com', dr: 83, traffic: 145000, category: 'dev' },
      { domain: 'freecodecamp.org', dr: 88, traffic: 780000, category: 'dev' },
      { domain: 'marketingland.com', dr: 86, traffic: 160000, category: 'marketing' },
      { domain: 'neilpatel.com', dr: 89, traffic: 620000, category: 'seo' }
    ];

    this.titlePrefixes = [
      'Top 10 Best Tools for',
      'The Ultimate Guide to',
      'How We Scaled Our Traffic with',
      'Complete Review & Benchmarks of',
      'Why Every Marketer Needs',
      'Best Open Source Alternatives to',
      'State of the Web & SEO Trends:',
      'Case Study: How to Analyze Competitors with',
      'Essential Resources and Directory for',
      'Comparing Industry Leaders in 2026:'
    ];

    this.surroundingSentences = [
      'In our extensive benchmark, we found that {{anchor}} consistently delivered accurate metrics and reliable indicators.',
      'According to recent data published on {{anchor}}, modern link building requires deep contextual relevance and high domain authority.',
      'To verify your backlinks and monitor referring domains, check out {{anchor}} which offers deep insight into external link profiles.',
      'You can easily verify your site popularity by using {{anchor}} to track new incoming mentions and DR evolution.',
      'Many SEO specialists rely on {{anchor}} as their reference index for tracking lost and acquired referring domains.',
      'For more details on domain score methodologies, refer to the documentation on {{anchor}}.',
      'We recommend testing your target pages through {{anchor}} before launching full outreach campaigns.',
      'A notable mention goes to {{anchor}} for offering transparent visibility into top referring subnets.'
    ];
  }

  // Simple deterministic PRNG based on a 32-bit integer seed
  createPRNG(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // Hash string into a 32-bit positive integer
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  // Extract clean domain name without protocol and query
  extractCleanDomain(rawUrl) {
    try {
      let normalized = rawUrl.trim();
      if (!/^https?:\/\//i.test(normalized)) {
        normalized = 'https://' + normalized;
      }
      const urlObj = new URL(normalized);
      return {
        hostname: urlObj.hostname.replace(/^www\./, ''),
        pathname: urlObj.pathname,
        cleanUrl: normalized
      };
    } catch {
      const clean = rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./, '').split('/')[0];
      return {
        hostname: clean || 'example.com',
        pathname: '/',
        cleanUrl: 'https://' + (clean || 'example.com')
      };
    }
  }

  // Generate complete dataset for any domain and scope
  generateData(rawUrl, scope = 'domain') {
    const { hostname, pathname, cleanUrl } = this.extractCleanDomain(rawUrl);
    const domainKey = hostname.toLowerCase();
    const seed = this.hashString(domainKey + '__' + scope);
    const rand = this.createPRNG(seed);

    // Preset overrides for famous domains to provide hyper-realistic values
    const famousPresets = {
      'ahrefs.com': { dr: 91, backlinksCount: 28400000, referringDomains: 142000, dofollowPercent: 84 },
      'stripe.com': { dr: 92, backlinksCount: 45100000, referringDomains: 198000, dofollowPercent: 88 },
      'github.com': { dr: 96, backlinksCount: 1850000000, referringDomains: 2450000, dofollowPercent: 91 },
      'wikipedia.org': { dr: 98, backlinksCount: 3400000000, referringDomains: 4800000, dofollowPercent: 82 },
      'openai.com': { dr: 93, backlinksCount: 68500000, referringDomains: 290000, dofollowPercent: 87 },
      'lemonde.fr': { dr: 92, backlinksCount: 94000000, referringDomains: 310000, dofollowPercent: 86 },
      'mozilla.org': { dr: 94, backlinksCount: 420000000, referringDomains: 950000, dofollowPercent: 89 },
      'vercel.com': { dr: 89, backlinksCount: 16800000, referringDomains: 88000, dofollowPercent: 85 },
      'shopify.com': { dr: 93, backlinksCount: 88000000, referringDomains: 420000, dofollowPercent: 83 }
    };

    let baseDr, totalBacklinks, referringDomains, dofollowPercent;

    if (famousPresets[domainKey]) {
      const p = famousPresets[domainKey];
      baseDr = p.dr;
      totalBacklinks = p.backlinksCount;
      referringDomains = p.referringDomains;
      dofollowPercent = p.dofollowPercent;
    } else {
      // Deterministic calculation based on domain hash
      const tld = domainKey.split('.').pop();
      let tldBonus = 0;
      if (['edu', 'gov'].includes(tld)) tldBonus = 25;
      else if (['org', 'io', 'ai'].includes(tld)) tldBonus = 10;
      else if (['com', 'fr', 'de', 'uk'].includes(tld)) tldBonus = 5;

      const hashNorm = (seed % 70) + 15; // 15 to 85
      baseDr = Math.min(94, Math.max(12, hashNorm + tldBonus));
      
      const factor = Math.pow(baseDr / 10, 3.4);
      totalBacklinks = Math.floor(factor * (800 + Math.floor(rand() * 1200)));
      referringDomains = Math.floor(totalBacklinks / (4.5 + rand() * 8.5));
      dofollowPercent = Math.floor(65 + rand() * 25); // 65% to 90%
    }

    // Adjust based on scope
    if (scope === 'exact') {
      baseDr = Math.max(1, baseDr - Math.floor(rand() * 4));
      totalBacklinks = Math.max(15, Math.floor(totalBacklinks * 0.08));
      referringDomains = Math.max(8, Math.floor(referringDomains * 0.06));
    } else if (scope === 'path') {
      totalBacklinks = Math.max(50, Math.floor(totalBacklinks * 0.22));
      referringDomains = Math.max(20, Math.floor(referringDomains * 0.18));
    } else if (scope === 'subdomains') {
      totalBacklinks = Math.floor(totalBacklinks * 1.35);
      referringDomains = Math.floor(referringDomains * 1.25);
    }

    // Determine brand name representation
    const brandName = hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);

    // Build anchor distribution
    const anchorTemplates = [
      { text: brandName, weight: 35 },
      { text: hostname, weight: 22 },
      { text: `https://${hostname}`, weight: 14 },
      { text: `${brandName} official`, weight: 8 },
      { text: 'click here', weight: 6 },
      { text: 'source', weight: 5 },
      { text: 'visit website', weight: 4 },
      { text: '(ancre image)', weight: 6 }
    ];

    // Generate Top 100 Backlinks
    const backlinks = [];
    const usedSourceUrls = new Set();
    const anchorCounts = {};

    for (let i = 0; i < 100; i++) {
      const srcIndex = Math.floor(rand() * this.sourceDomains.length);
      const srcDomain = this.sourceDomains[srcIndex];
      
      const slugParts = [
        'resources', 'article', 'post', 'blog', 'guide', 'news', 'tools', 'review', 'insights', 'comparison'
      ];
      const part1 = slugParts[Math.floor(rand() * slugParts.length)];
      const part2Id = 100 + Math.floor(rand() * 900);
      const sourceUrl = `https://${srcDomain.domain}/${part1}/${part2Id}`;
      
      // Calculate realistic source page DR (fluctuates around domain DR)
      const sourceDr = Math.min(99, Math.max(10, srcDomain.dr + Math.floor(rand() * 7) - 3));
      
      // Calculate realistic monthly organic traffic
      const trafficVariance = 0.4 + rand() * 1.2;
      const traffic = Math.max(12, Math.floor(srcDomain.traffic * trafficVariance / (1 + i * 0.03)));

      // Determine Dofollow / Nofollow according to overall percentage
      const isDofollow = rand() * 100 <= dofollowPercent;
      const linkType = isDofollow ? 'dofollow' : 'nofollow';

      // Pick anchor
      let chosenAnchor = brandName;
      const anchorRoll = rand() * 100;
      let cumWeight = 0;
      for (const t of anchorTemplates) {
        cumWeight += t.weight;
        if (anchorRoll <= cumWeight) {
          chosenAnchor = t.text;
          break;
        }
      }

      // Track anchor frequencies
      anchorCounts[chosenAnchor] = (anchorCounts[chosenAnchor] || 0) + 1;

      // Generate surrounding text snippet
      const sentenceTpl = this.surroundingSentences[Math.floor(rand() * this.surroundingSentences.length)];
      const anchorMarkup = `<strong>${this.escapeHtml(chosenAnchor)}</strong>`;
      const snippet = sentenceTpl.replace('{{anchor}}', anchorMarkup);

      // Source Page Title
      const titlePrefix = this.titlePrefixes[Math.floor(rand() * this.titlePrefixes.length)];
      const sourceTitle = `${titlePrefix} ${brandName} & Web Ecosystem`;

      // Target URL
      let targetUrl = `https://${hostname}/`;
      if (scope === 'exact' && pathname && pathname !== '/') {
        targetUrl = cleanUrl;
      } else if (i % 4 === 0) {
        targetUrl = `https://${hostname}/blog/post-${(i * 7) % 50}`;
      } else if (i % 7 === 0) {
        targetUrl = `https://${hostname}/pricing`;
      } else if (i % 5 === 0) {
        targetUrl = `https://${hostname}/features`;
      }

      // First seen date (within last 365 days)
      const daysAgo = Math.floor(rand() * 320) + 2;
      const dateSeen = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

      backlinks.push({
        id: i + 1,
        sourceDomain: srcDomain.domain,
        sourceUrl,
        sourceTitle,
        targetUrl,
        anchorText: chosenAnchor,
        snippet,
        linkType,
        sourceDr,
        traffic,
        dateSeen
      });
    }

    // Sort backlinks initially by Source DR descending (like Ahrefs default)
    backlinks.sort((a, b) => b.sourceDr - a.sourceDr);

    // Build frequent anchors array sorted by count
    const frequentAnchors = Object.entries(anchorCounts)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count);

    return {
      target: cleanUrl,
      rawInput: rawUrl,
      domain: hostname,
      scope: scope.toLowerCase(),
      domainRating: baseDr,
      backlinksCount: totalBacklinks,
      referringDomains: referringDomains,
      dofollowPercent: dofollowPercent,
      frequentAnchors: frequentAnchors,
      backlinks: backlinks,
      analyzedAt: new Date().toISOString()
    };
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Number format utility (e.g. 12450 -> "12.5K", 2400000 -> "2.4M")
  static formatMetric(num) {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + ' B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + ' M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + ' K';
    }
    return num.toLocaleString();
  }

  // Precise localized integer formatter
  static formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
  }
}

window.backlinkDataGenerator = new BacklinkDataGenerator();
