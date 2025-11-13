/**
 * Vercel Serverless Function for Prerendering
 * Serves fully rendered HTML to bots
 */

const puppeteer = require('puppeteer-core');
const chrome = require('@sparticuz/chromium');

module.exports = async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Launch browser
    const browser = await puppeteer.launch({
      args: chrome.args,
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: chrome.headless
    });

    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
    
    // Navigate to page
    const fullUrl = `https://onsi.shop${url}`;
    await page.goto(fullUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for content to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Get fully rendered HTML
    const html = await page.content();
    
    await browser.close();
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.setHeader('X-Prerendered', 'true');
    
    return res.status(200).send(html);
    
  } catch (error) {
    console.error('Prerendering error:', error);
    
    // Fallback to original URL
    return res.redirect(307, `https://onsi.shop${url}`);
  }
};
