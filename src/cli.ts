#!/usr/bin/env node

import { program } from "commander";
import { version } from "../package.json";

import { setupAction } from "./setup-action";
import { excelAction } from "./excel";
import cashAction from "./cash";
import spreadsheetAction from "./spreadsheet-action";
import pullAction from "./pull-action";
import { loadEnv } from "./lib/env";
import balanceAction from "./balance-action";
import balanceExportAction from "./balance-export-action";

program.name("utl").version(version);
program.hook("preAction", async () => {
    await loadEnv();
});

program.command("setup").action(setupAction);

program.command("pull").action(pullAction);

program.command("cash").action(cashAction);

program.command("balance").action(balanceAction);

program.command("balanceSpreadsheet").action(balanceExportAction);

program.command("spreadsheet").action(spreadsheetAction);

program.parseAsync();
