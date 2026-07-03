import { existsSync } from 'fs';
import puppeteer from 'puppeteer-core';

function getBrowserExecutablePath() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  const foundPath = possiblePaths.find((path) => existsSync(path));

  if (!foundPath) {
    throw new Error(
      'Chrome یا Microsoft Edge روی سیستم پیدا نشد. لطفاً یکی از آن‌ها را نصب کن یا مسیر executablePath را دستی تنظیم کن.',
    );
  }

  return foundPath;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: getBrowserExecutablePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'load',
    });

    await delay(500);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '10mm',
        bottom: '12mm',
        left: '10mm',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}