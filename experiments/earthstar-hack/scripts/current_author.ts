import { Earthstar } from "../deps.ts";

const settings = new Earthstar.SharedSettings();

console.log('settings', settings)
if (!settings.author) {
  console.log("No author keypair currently saved to settings.");
  Deno.exit(0);
}

console.group("Current author keypair:");
console.log(settings.author.address);

Deno.exit(0);
