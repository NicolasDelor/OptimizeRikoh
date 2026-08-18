import fs from "fs";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const monsters = [];

let url =
  "https://swarfarm.com/api/v2/monsters/?limit=5000";

while (url) {
  console.log("Loading", url);

  const response = await fetch(url);

  const data = await response.json();

  monsters.push(...data.results);

  url = data.next;
}

fs.mkdirSync("./src/data", {
  recursive: true,
});

fs.writeFileSync(
  "./src/data/swarfarm-monsters.json",
  JSON.stringify(monsters, null, 2)
);

console.log(
  `Saved ${monsters.length} monsters`
);