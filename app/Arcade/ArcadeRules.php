<?php

namespace App\Arcade;

/**
 * What a finished run of one arcade game must look like. The game runs in the
 * browser, so the server can't replay it; it can only check that the submitted
 * score is possible (config/arcade.php → games.*.rules).
 */
interface ArcadeRules
{
    /**
     * Validation rules for the `stats` the game sends along with its score.
     *
     * @return array<string, mixed>
     */
    public function rules(): array;

    /**
     * Why this run can't be right (shown to the player), or null when it can.
     *
     * @param  array<string, int>  $stats
     * @param  array<string, mixed>  $config  this game's entry in config/arcade.php
     */
    public function check(int $score, array $stats, int $elapsedMs, array $config): ?string;
}
