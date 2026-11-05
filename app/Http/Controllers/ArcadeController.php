<?php

namespace App\Http\Controllers;

use App\Arcade\ArcadeRules;
use App\Models\ArcadeScore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Playable arcade cabinets in the Hotel (config/arcade.php). The game runs in
 * the browser; the server only keeps the scores. `start` opens a run, `finish`
 * closes it with the score, after a few sanity checks against cheating:
 * a run is submitted once, by its own player, within `arcade.max_run_minutes`,
 * and the game's own ArcadeRules must find the score possible.
 */
class ArcadeController extends Controller
{
    public function show(Request $request, string $game): Response
    {
        $config = $this->game($game);

        return Inertia::render($config['page'], [
            'game' => ['id' => $game, 'name' => $config['name']],
            'personalBest' => ArcadeScore::personalBest($request->user(), $game),
            'leaderboards' => ArcadeScore::leaderboards($game),
        ]);
    }

    /** For the popup at the cabinet: your highscore and the leaderboards. */
    public function scores(Request $request, string $game): JsonResponse
    {
        $this->game($game);

        return response()->json([
            'personalBest' => ArcadeScore::personalBest($request->user(), $game),
            'leaderboards' => ArcadeScore::leaderboards($game),
        ]);
    }

    public function start(Request $request, string $game): JsonResponse
    {
        $this->game($game);

        $run = ArcadeScore::create([
            'user_id' => $request->user()->id,
            'game' => $game,
            'started_at' => now(),
        ]);

        return response()->json(['runId' => $run->id], 201);
    }

    public function finish(Request $request, string $game, ArcadeScore $run): JsonResponse
    {
        $config = $this->game($game);
        $user = $request->user();
        abort_unless($run->user_id === $user->id && $run->game === $game, 403);

        /** @var ArcadeRules $rules */
        $rules = app($config['rules']);
        $validated = $request->validate([
            'score' => ['required', 'integer', 'min:0', 'max:1000000'],
            'stats' => ['required', 'array'],
            ...$rules->rules(),
        ]);
        // Only the stats this game knows about, as integers
        $stats = array_map('intval', array_intersect_key(
            $validated['stats'],
            array_flip(array_map(fn (string $key) => substr($key, 6), array_keys($rules->rules()))),
        ));

        $elapsedMs = (int) $run->started_at->diffInMilliseconds(now());

        $error = match (true) {
            $run->isFinished() => 'Deze score is al opgeslagen.',
            $elapsedMs > config('arcade.max_run_minutes') * 60_000 => 'Dit potje is verlopen.',
            default => $rules->check((int) $validated['score'], $stats, $elapsedMs, $config),
        };

        if ($error) {
            return response()->json(['message' => $error, 'errors' => ['score' => [$error]]], 422);
        }

        $previousBest = ArcadeScore::personalBest($user, $game);

        $run->update(['score' => $validated['score'], 'stats' => $stats, 'finished_at' => now()]);

        return response()->json([
            'score' => $run->score,
            'personalBest' => max($previousBest, $run->score),
            'isHighscore' => $run->score > $previousBest,
            'leaderboards' => ArcadeScore::leaderboards($game),
        ]);
    }

    /** @return array{name: string, page: string, rules: class-string<ArcadeRules>} */
    private function game(string $game): array
    {
        $config = config("arcade.games.{$game}");
        abort_unless(is_array($config), 404);

        return $config;
    }
}
