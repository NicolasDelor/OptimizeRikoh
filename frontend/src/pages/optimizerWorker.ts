import { optimizeMonsterRunes } from "../services/optimizerEngine";

self.onmessage = (event) => {
  const { monsters, configs, allRunes } = event.data;

  const results = [];

  let globalExplored = 0;
  let globalPruned = 0;
  let lastProgressSent = 0;

  for (const monster of monsters) {
    const config = configs[monster.id];

    let lastExplored = 0;
    let lastPruned = 0;

    const { results: monsterResults, totalBuilds } = optimizeMonsterRunes(
      monster,
      config,
      allRunes,
      ({ explored, pruned, total }) => {
        globalExplored += explored - lastExplored;
        globalPruned += pruned - lastPruned;

        lastExplored = explored;
        lastPruned = pruned;

        const now = Date.now();

        if (now - lastProgressSent >= 250) {
          lastProgressSent = now;

          self.postMessage({
            type: "progress",
            explored: globalExplored,
            pruned: globalPruned,
            total,
          });
        }
      }
    );
    console.log("TOTAL BUILDS", totalBuilds);

    results.push({
      monsterId: monster.id,
      monsterName: monster.name,
      results: monsterResults,
    });
  }

  self.postMessage({
    type: "result",
    results,
  });
};

export {};
