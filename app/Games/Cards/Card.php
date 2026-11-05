<?php

namespace App\Games\Cards;

/**
 * A Tribekaarten card as a string `color:value`: `sun:7`, `sea:skip`,
 * `wild:wild4`. Identical cards are interchangeable, so a card is played by
 * its code. Matches CardCode in resources/js/types/cards.ts.
 */
final class Card
{
    /** Zon (geel), Zee (blauw), Blad (groen) and Vuur (rood). */
    public const COLORS = ['sun', 'sea', 'leaf', 'fire'];

    public const WILD = 'wild';

    /** Beurt overslaan, richting omdraaien, +2 */
    public const ACTIONS = ['skip', 'reverse', 'draw2'];

    public static function color(string $card): string
    {
        return explode(':', $card)[0];
    }

    public static function value(string $card): string
    {
        return explode(':', $card)[1];
    }

    public static function isWild(string $card): bool
    {
        return self::color($card) === self::WILD;
    }

    public static function isNumber(string $card): bool
    {
        return ctype_digit(self::value($card));
    }

    /** Cards that make the next player draw: how many. */
    public static function drawCount(string $card): int
    {
        return match (self::value($card)) {
            'draw2' => 2,
            'wild4' => 4,
            default => 0,
        };
    }

    /**
     * The full deck of 108 cards: per colour one 0, two of 1–9 and two of
     * every action card, plus four colour changes and four colour change +4.
     *
     * @return list<string>
     */
    public static function deck(): array
    {
        $deck = [];

        foreach (self::COLORS as $color) {
            $deck[] = "{$color}:0";

            foreach ([...range(1, 9), ...self::ACTIONS] as $value) {
                array_push($deck, "{$color}:{$value}", "{$color}:{$value}");
            }
        }

        foreach (['wild', 'wild4'] as $value) {
            array_push($deck, ...array_fill(0, 4, self::WILD.':'.$value));
        }

        return $deck;
    }
}
