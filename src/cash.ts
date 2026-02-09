import { input } from "@inquirer/prompts";

import crypto from "crypto";
import datePrompt from "date-prompt";
import { TransactionsCacheDocuments } from "./TransactionDocument";
import fs from "fs/promises";

export default async function cashAction() {
  // 1. amount
  const amount = await input({
    message: "Enter the cash amount (use negative for expenses):",
  });
  // 2. description
  const description = await input({
    message: "Enter a description for the transaction:",
  });
  // 3. receipient name
  const recipient = await input({
    message: "Enter the recipient name:",
  });

  // 4. exection date
  const executionDate = await datePrompt("Enter Execution Date");

  console.log("Cash transaction details:");
  console.log("Amount:", amount);
  console.log("Description:", description);
  console.log("Recipient:", recipient);
  console.log("Execution Date:", executionDate);

  const transaction: Transaction = {
    id: `cash-${crypto
      .randomBytes(8)
      .toString("hex")}-${executionDate.toString()}`,
    amount: parseFloat(amount),
    date: new Date(executionDate),
    description: description,
    recipient: recipient,
  };

  const transactionFile = await TransactionsCacheDocuments.create();
  transactionFile.addTransaction(transaction);
  transactionFile.persist();
}
