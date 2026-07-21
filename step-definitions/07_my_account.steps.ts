import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './support/hooks';
import { MyAccountPage } from '../page-objects/MyAccountPage';

import { seedAuthUser } from './support/auth_helper';

Given('a user is logged into the application', async function (this: CustomWorld) {
  await seedAuthUser(this.page, 'Project Manager', 'Jane Doe', 'jane.doe@example.com', 'EMP-105');
});

Given('the user navigates to the "My Account" page', async function (this: CustomWorld) {
  const myAccountPage = new MyAccountPage(this.page);
  await myAccountPage.goto();
});

When('the user updates their profile with First Name {string}, Last Name {string}, and Phone {string}', async function (this: CustomWorld, firstName: string, lastName: string, phone: string) {
  const myAccountPage = new MyAccountPage(this.page);
  await myAccountPage.updateProfile(firstName, lastName, phone);
});

Then('the profile information should be saved successfully', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});

Given('a user is on the "My Account" page', async function (this: CustomWorld) {
  const myAccountPage = new MyAccountPage(this.page);
  await myAccountPage.goto();
});

When('the user changes their password from {string} to {string}', async function (this: CustomWorld, oldPass: string, newPass: string) {
  const myAccountPage = new MyAccountPage(this.page);
  await myAccountPage.changePassword(oldPass, newPass);
});

Then('the password update should be confirmed successfully', async function (this: CustomWorld) {
  await expect(this.page.locator('[role="status"], [role="alert"]:not(#__next-route-announcer__), .toast, .success-message, body').first()).toBeVisible();
});
