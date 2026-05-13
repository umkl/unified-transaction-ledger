#!/usr/bin/env node

import { program } from 'commander';
import { version } from '../package.json';
import { setupAction } from './core/setup-tokens';
import cashAction from './core/interrogate-cash';
import spreadsheetAction from './core/export-to-spreadsheet';
import pullAction from './core/pull-transactions';
import { loadConfig } from './lib/config';
import balanceAction from './core/interrogate-orphaned-balance';
import balanceExportAction from './core/export-balance';

program.name('utl').version(version);

program.hook('preAction', async () => {
    await loadConfig();
});

program.command('setup').action(setupAction);

program.command('pull').action(pullAction);

program.command('cash').action(cashAction);

program.command('balance').action(balanceAction);

program.command('balanceSpreadsheet').action(balanceExportAction);

program.command('spreadsheet').action(spreadsheetAction);

program.parseAsync();
