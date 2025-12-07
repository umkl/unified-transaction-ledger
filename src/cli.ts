#!/usr/bin/env node

import { program } from "commander";
import { version } from "../package.json";

import { setupAction } from "./setup";
import { excelAction } from "./excel";
import cashAction from "./cash";
import spreadsheetAction from "./spreadsheet";

program
  .name("utl")
  .description("Tool to easily fetch data from supported bank APIs.")
  .version(version);

program
  .command("setup")
  .description("Setup your API for accessing the Nordigen API.")
  .action(setupAction);

program
  .command("cash")
  .description("Insert an cash transaction into the ledger.")
  .action(cashAction);

program
  .command("spreadsheet")
  .description("Create a spreadsheet from the transaction ledger.")
  .action(spreadsheetAction);

program.parseAsync();
