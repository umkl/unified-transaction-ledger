#!/usr/bin/env node

import { program } from 'commander';
import { version } from '../package.json';
import { setupAction } from './core/setup-tokens';
import cashAction from './core/interrogate-cash';
import exportSpreadsheet from './core/export-to-spreadsheet';
import { loadConfig } from './lib/config';
import balanceAction from './core/interrogate-orphaned-balance';
import balanceExportAction from './core/export-balance';
import pullTransactions from './core/pull-transactions';

program.name('utl').version(version);

program.hook('preAction', async () => {
    await loadConfig();
});

program.command('setup').action(setupAction);

program.command('pull').action(pullTransactions);

program.command('spreadsheet').action(exportSpreadsheet);

program.command('cash').action(cashAction);

program.command('balance').action(balanceAction);

program.command('balanceSpreadsheet').action(balanceExportAction);

program.parseAsync();
