#!/usr/bin/env node

import { program } from "commander";
import { version } from "../package.json";

import { setupAction } from "./setup-action";
import { excelAction } from "./excel";
import cashAction from "./cash";
import spreadsheetAction from "./spreadsheet";
import pullAction from "./pull-action";

program
  .name("utl")
  .description("Tool to easily fetch data from supported bank APIs.")
  .version(version);

program
  .command("setup")
  .description(
    "Setup the necessary tokens for accessing the APIs from supported banks.",
  )
  .action(setupAction);

program
  .command("pull")
  .description(
    "Retrieve data from the institutions and add them to the transactions list.",
  )
  .action(pullAction);

program
  .command("cash")
  .description("Insert an cash transaction into the ledger.")
  .action(cashAction);

program
  .command("spreadsheet")
  .description("Create a spreadsheet from the current transaction ledger.")
  .action(spreadsheetAction);

program.parseAsync();
