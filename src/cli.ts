#!/usr/bin/env node

import { program } from "commander";
import { version } from "../package.json";

import { setupAction } from "./setupAction";
import { excelAction } from "./excel";
import cashAction from "./cash";
import spreadsheetAction from "./spreadsheet";
import pullAction from "./pullAction";

program
  .name("utl")
  .description("Tool to easily fetch data from supported bank APIs.")
  .version(version);

program
  .command("setup")
  .description("Setup the necessary tokens for accessing the Nordigen API.")
  .option("-r, --refresh", "Refresh the existing access token.")
  .action(setupAction);


program
  .command("pull")
  .description("Retrieve data from the Nordigen API.")
  .action(pullAction);

program
  .command("cash")
  .description("Insert an cash transaction into the ledger.")
  .action(cashAction);

program
  .command("spreadsheet")
  .description("Create a spreadsheet from the transaction ledger.")
  .action(spreadsheetAction);

program.parseAsync();
