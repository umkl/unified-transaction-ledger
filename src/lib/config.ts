import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { log } from './log';

type Config = Record<string, string>;

const CONFIG_DIR = path.join(os.homedir(), '.config', 'utl');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function getConfigPath() {
    return CONFIG_PATH;
}

export async function loadConfig() {
    const config = await readConfig();
    for (const [key, value] of Object.entries(config)) {
        process.env[key] = value;
    }
}

export async function readConfig(): Promise<Config> {
    try {
        const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        // safety check for the shape of the config file
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        const entries = Object.entries(parsed).filter(
            ([, value]) => typeof value === 'string'
        );
        return Object.fromEntries(entries) as Config;
    } catch (err: any) {
        if (err?.code === 'ENOENT') {
            log('Config file not found.');
            return {};
        }
        throw err;
    }
}

export async function writeConfig(config: Config): Promise<void> {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    const serialized = JSON.stringify(config, null, 2) + '\n';
    await fs.writeFile(CONFIG_PATH, serialized, {
        encoding: 'utf-8',
        mode: 0o600,
    });
    try {
        await fs.chmod(CONFIG_PATH, 0o600);
    } catch {
        // Best-effort permissions for non-POSIX environments.
    }
    log('Config saved successfully.');
}

export async function persistEnv(keysToPersist: string[] = []) {
    const config = await readConfig();
    for (const key of keysToPersist) {
        const value = process.env[key];
        if (typeof value === 'string') {
            config[key] = value;
        }
    }
    await writeConfig(config);
}
