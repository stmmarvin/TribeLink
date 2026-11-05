<?php

namespace App\Arcade;

/**
 * Stack: 1 point per block plus a bonus of at most `max_perfect_bonus` per
 * perfect drop (resources/js/game/stack/logic.ts), and nobody places a block
 * faster than `min_ms_per_block`.
 */
class StackRules implements ArcadeRules
{
    public function rules(): array
    {
        return [
            'stats.blocks' => ['required', 'integer', 'min:0', 'max:100000'],
            'stats.perfects' => ['required', 'integer', 'min:0', 'lte:stats.blocks'],
        ];
    }

    public function check(int $score, array $stats, int $elapsedMs, array $config): ?string
    {
        ['blocks' => $blocks, 'perfects' => $perfects] = $stats;

        return match (true) {
            $elapsedMs < $blocks * $config['min_ms_per_block'] => 'Zo snel kan niemand stapelen.',
            $score < $blocks || $score > $blocks + $perfects * $config['max_perfect_bonus'] => 'Deze score klopt niet.',
            default => null,
        };
    }
}
