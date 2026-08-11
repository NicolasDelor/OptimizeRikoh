from itertools import combinations

class OptimizerService:

    def score(self, stats):
        return (
            stats["speed"] * 3
            + stats["crit_rate"] * 2
            + stats["atk"]
        )

    def optimize(self, runes):
        best_score = 0
        best_build = None

        for build in combinations(runes, 6):
            stats = {
                "speed": sum(r.speed for r in build),
                "atk": sum(r.atk for r in build),
                "crit_rate": sum(r.crit_rate for r in build)
            }

            score = self.score(stats)

            if score > best_score:
                best_score = score
                best_build = build

        return best_build
