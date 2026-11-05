<?php

namespace App\Arcade;

/**
 * Wave Rush: the score is exactly the distance in metres plus the bonuses
 * (resources/js/game/wave-rush/player.ts → POINTS). Nobody goes faster than
 * the boost speed, and coins, boost items and ramps are never closer together
 * than the track generator places them.
 */
class WaveRushRules implements ArcadeRules
{
    public function rules(): array
    {
        return [
            'stats.distance' => ['required', 'integer', 'min:0', 'max:1000000'],
            'stats.coins' => ['required', 'integer', 'min:0'],
            'stats.boosts' => ['required', 'integer', 'min:0'],
            'stats.tricks' => ['required', 'integer', 'min:0'],
        ];
    }

    public function check(int $score, array $stats, int $elapsedMs, array $config): ?string
    {
        ['distance' => $distance, 'coins' => $coins, 'boosts' => $boosts, 'tricks' => $tricks] = $stats;
        $points = $config['points'];
        $spacing = $config['min_metres_between'];

        return match (true) {
            $distance > $config['max_speed_mps'] * $elapsedMs / 1000 => 'Zo snel gaat geen jetski.',
            $coins > $distance / $spacing['coin'] + 1,
            $boosts > $distance / $spacing['boost'] + 1,
            $tricks > $distance / $spacing['ramp'] + 1 => 'Zoveel bonussen liggen er niet op de baan.',
            $score !== $distance + $coins * $points['coin'] + $boosts * $points['boost'] + $tricks * $points['trick'] => 'Deze score klopt niet.',
            default => null,
        };
    }
}
