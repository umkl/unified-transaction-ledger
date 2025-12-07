import { select } from "@inquirer/prompts";

export async function promptCountry() {
  const answer = await select({
    message: "Select your country:",
    choices: [
      { name: "Deutsch", value: "de" },
      { name: "Österreich", value: "at" },
      { name: "United Kingdom", value: "uk" },
    ],
  });

  return answer;
}
