#!/usr/bin/env node

import { program } from "commander";
import { version } from "../package.json";

import { setupAction } from "./setup-action";
import { excelAction } from "./excel";
import cashAction from "./cash";
import spreadsheetAction from "./spreadsheet";
import pullAction from "./pull-action";

program.name("utl").version(version);

program.command("setup").action(setupAction);

program.command("pull").action(pullAction);

program.command("cash").action(cashAction);

program.command("spreadsheet").action(spreadsheetAction);

program.parseAsync();
