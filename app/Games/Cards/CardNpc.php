<?php

namespace App\Games\Cards;

use Random\Randomizer;

/**
 * What an NPC at the Tribekaarten table does on its turn. `easy` plays any
 * card that fits; `normal` plays a simple but sensible game:
 *
 * - match the colour with a number card first, keep action cards for later
 * - use skip/+2/reverse when the next player is almost out
 * - a colour change only when nothing else fits, +4 only as the very last resort
 * - pick the colour it has most of, and swap hands with whoever has the fewest cards
 *
 * `hard` plays like `normal`, but also:
 *
 * - attacks sooner: when the next player is down to three cards
 * - counts cards: switches to (and picks) colours that are mostly on the discard
 *   pile already, so the others are less likely to still hold them
 * - with the 0/7 rule plays a 7 or 0 when it gets a smaller hand from it, and
 *   holds it back when it would get a bigger one
 *
 * It only looks at what everybody at the table can see: the discard pile and
 * how many cards each player holds, never at the other hands.
 */
final class CardNpc
{
    public function __construct(
        private readonly string $difficulty = 'normal',
        private readonly Randomizer $rng = new Randomizer,
    ) {}

    /**
     * @return array{action: 'play', card: string, color: ?string, target: ?int}|array{action: 'draw'|'pass'}
     */
    public function decide(CardRules $rules, int $seat): array
    {
        $playable = $rules->playable($seat);

        if ($playable === []) {
            return ['action' => $rules->drawn !== null ? 'pass' : 'draw'];
        }

        $card = $this->difficulty === 'easy'
            ? $playable[$this->rng->getInt(0, count($playable) - 1)]
            : $this->best($rules, $seat, $playable);

        $rest = $rules->hand($seat);
        array_splice($rest, (int) array_search($card, $rest, true), 1);

        return [
            'action' => 'play',
            'card' => $card,
            'color' => Card::isWild($card) ? $this->favouriteColor($rules, $rest) : null,
            'target' => $rules->hasRule('zero_seven') && Card::value($card) === '7' && $rest !== []
                ? $this->swapTarget($rules, $seat)
                : null,
        ];
    }

    /** Does the NPC remember to press "LAATSTE!" in time? */
    public function remembersLast(float $chance): bool
    {
        return $this->rng->nextFloat() < $chance;
    }

    /** @param  list<string>  $playable */
    private function best(CardRules $rules, int $seat, array $playable): string
    {
        $hard = $this->difficulty === 'hard';
        $next = $rules->nextSeat($seat);
        $threat = count($rules->hand($next)) <= ($hard ? 3 : 2);
        $hand = $rules->hand($seat);

        $score = function (string $card) use ($rules, $seat, $hard, $threat, $hand): float {
            $value = Card::value($card);
            $sameColor = count(array_filter($hand, fn (string $c) => Card::color($c) === Card::color($card)));

            $score = match (true) {
                $value === 'wild4' => $threat ? 4.5 : 0,
                $value === 'wild' => $threat ? 2.5 : 0.5,
                ! Card::isNumber($card) => $threat ? 5 : 1 + $sameColor / 20,
                // Numbers: stay on the colour, otherwise switch to a colour we have plenty of
                Card::color($card) === $rules->color => 3 + (int) $value / 20,
                default => 2 + $sameColor / 10 + ($hard ? $this->played($rules, Card::color($card)) : 0),
            };

            return $hard ? $score + $this->handGain($rules, $seat, $card) : $score;
        };

        usort($playable, fn (string $a, string $b) => $score($b) <=> $score($a));

        return $playable[0];
    }

    /**
     * Hard only: the 0/7 rule moves hands around. Worth playing when the hand
     * we get is smaller than what we keep after this card, not when it's bigger.
     */
    private function handGain(CardRules $rules, int $seat, string $card): float
    {
        $value = Card::value($card);
        $keep = count($rules->hand($seat)) - 1;

        if (! $rules->hasRule('zero_seven') || $keep === 0 || ! in_array($value, ['0', '7'], true)) {
            return 0;
        }

        $others = array_values(array_diff($rules->activeSeats(), [$seat]));
        // A 7 swaps with whoever has the fewest cards; a 0 passes every hand on
        // in the direction of play, so we get the previous player's
        $from = $value === '7'
            ? $others
            : array_filter($others, fn (int $s) => $rules->nextSeat($s) === $seat);
        $get = min(array_map(fn (int $s) => count($rules->hand($s)), $from) ?: [$keep]);

        return match (true) {
            $get < $keep => 3 + ($keep - $get) / 10,
            $get > $keep => -2,
            default => 0,
        };
    }

    /**
     * Hard only, card counting: how much of a colour is on the discard pile
     * already (0–0.5). The more is gone, the less the others still hold.
     */
    private function played(CardRules $rules, string $color): float
    {
        $count = count(array_filter($rules->discardPile, fn (string $c) => Card::color($c) === $color));

        // 25 cards of each colour in the deck
        return min($count, 25) / 50;
    }

    /** @param  list<string>  $hand */
    private function favouriteColor(CardRules $rules, array $hand): string
    {
        $counts = array_fill_keys(Card::COLORS, 0);

        foreach ($hand as $card) {
            if (! Card::isWild($card)) {
                $counts[Card::color($card)]++;
            }
        }

        if ($this->difficulty === 'easy' || max($counts) === 0) {
            return Card::COLORS[$this->rng->getInt(0, count(Card::COLORS) - 1)];
        }

        if ($this->difficulty === 'hard') {
            // Same number of cards in two colours: take the one the others are shortest of
            foreach ($counts as $color => $count) {
                $counts[$color] = $count + $this->played($rules, $color);
            }
        }

        return array_search(max($counts), $counts, true);
    }

    private function swapTarget(CardRules $rules, int $seat): int
    {
        $others = array_values(array_diff($rules->activeSeats(), [$seat]));
        usort($others, fn (int $a, int $b) => count($rules->hand($a)) <=> count($rules->hand($b)));

        return $this->difficulty === 'easy' ? $others[$this->rng->getInt(0, count($others) - 1)] : $others[0];
    }
}
