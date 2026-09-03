import {
  optimizeMonsterRunes,
  resetOptimizationStop,
} from "../services/optimizerEngine";

self.onmessage = (event) => {
  const { monsters, configs, allRunes } = event.data;

  const results = [];

  let globalExplored = 0;
  let globalPruned = 0;
  let lastProgressSent = 0;
  console.log("MONSTERS LENGTH", monsters.length);
  for (const monster of monsters) {
    console.log("WORKER MONSTER", monster.name);

    const config = configs[monster.id];

    resetOptimizationStop();

    let lastExplored = 0;
    let lastPruned = 0;
    try {
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

      console.log(
        "MONSTER DONE",
        monster.name,
        totalBuilds,
        monsterResults.length
      );

      console.log("TOTAL BUILDS", totalBuilds);

      results.push({
        monsterId: monster.id,
        monsterName: monster.name,
        results: monsterResults,
      });
    } catch (e) {
      console.error("MONSTER ERROR", monster.name, e);
    }
  }

  self.postMessage({
    type: "result",
    results,
  });
};

export {};
