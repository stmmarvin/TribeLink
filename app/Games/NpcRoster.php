<?php

namespace App\Games;

/**
 * The NPCs that fill empty seats at a game table, from
 * config("{game}.npc.roster"): every NPC has its own name and Hotel
 * outfit, and no NPC sits at the same table twice.
 */
class NpcRoster
{
    public function __construct(public readonly string $game) {}

    /**
     * `$count` different NPCs, at random.
     *
     * @return list<array{name: string, look: array<string, mixed>}>
     */
    public function pick(int $count): array
    {
        $roster = config("{$this->game}.npc.roster");
        shuffle($roster);

        return array_slice($roster, 0, $count);
    }
}
