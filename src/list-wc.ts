import { MendixPlatformClient, setPlatformConfig } from 'mendixplatformsdk';
import { loadSettings } from './settings';

async function main() {
  const settings = loadSettings();
  setPlatformConfig({ mendixToken: settings.credentials.apikey });
  const client = new MendixPlatformClient();
  const app = client.getApp(settings.project.id);
  const wcs = await app.getRepository().getBranches();
  console.log('Available branches:', wcs);
}

main().catch(console.error);
