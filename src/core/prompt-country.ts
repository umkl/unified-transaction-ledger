import { select } from "@inquirer/prompts";

export async function promptCountry() {
  const answer = await select({
    message: "Select your country:",
    choices: [
      { name: "Deutsch", value: "DE" },
      { name: "Österreich", value: "AT" },
      { name: "United Kingdom", value: "UK" },
    ],
  });

  return answer;
}
