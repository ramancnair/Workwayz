import { Before, After, BeforeAll, AfterAll, setDefaultTimeout, setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { seedAuthUser } from './auth_helper';

setDefaultTimeout(60 * 1000);

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);

let globalBrowser: Browser;

BeforeAll(async function () {
  globalBrowser = await chromium.launch({ headless: true });
});

AfterAll(async function () {
  if (globalBrowser) {
    await globalBrowser.close();
  }
});

Before(async function (this: CustomWorld) {
  this.context = await globalBrowser.newContext({
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  });
  this.page = await this.context.newPage();
  await seedAuthUser(this.page, 'Administrator', 'Admin User', 'admin@projectflow.com', 'EMP-101');
});

After(async function (this: CustomWorld) {
  if (this.page) {
    await this.page.close();
  }
  if (this.context) {
    await this.context.close();
  }
});
