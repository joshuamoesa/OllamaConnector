import * as fs from 'fs';
import * as yaml from 'js-yaml';

export interface Settings {
  credentials: {
    username: string;
    apikey: string;
  };
  project: {
    name: string;
    id: string;
  };
  workingcopy: {
    current: string;
  };
}

export function loadSettings(filename: string = 'settings.yaml'): Settings {
  if (!fs.existsSync(filename)) {
    console.error(`Settings file '${filename}' not found. Copy settings.yaml.example to settings.yaml and fill in your credentials.`);
    process.exit(1);
  }
  return yaml.load(fs.readFileSync(filename, 'utf8')) as Settings;
}

export function saveSettings(settings: Settings, filename: string = 'settings.yaml'): void {
  fs.writeFileSync(filename, yaml.dump(settings), 'utf8');
}
