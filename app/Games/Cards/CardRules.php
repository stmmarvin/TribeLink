<?php

namespace App\Games\Cards;

use Random\Randomizer;

/**
 * The rules of Tribekaarten, without database or players: seats 0…n-1
 * around the table, the draw pile, the discard pile and whose turn it is.
 * App\Models\CardGame stores this state and decides who is at which seat.
 *
 * - Play a card of the same colour, value or symbol; colour changes always fit.
 * - Can't or won't play: draw one card. If it fits you may play it right away
 *   (`drawn`), or `pass`.
 * - Skip, reverse (with two players: skip), +2 and colour change +4 (the next
 *   player draws and misses their turn).
 * - Down to one card: press "LAATSTE!" (`callLast`) before someone else does,
 *   or draw the penalty cards.
 * - Empty draw pile: the discard pile except its top card is shuffled into it.
 * - House rules (config/cards.php): `stacking` (+2 on +2, +4 on +2 or +4, the
 *   next player draws everything) and `zero_seven` (0 passes all hands on,
 *   7 swaps your hand with an opponent).
 *
 * Every action appends what happened to `events`, for the animations at the table.
 */
final class CardRules
{
    /** @var list<array{hand: list<string>, called: bool, out: bool}> */
    public array $seats = [];

    /** @var list<string> The top card is the last one. */
    public array $drawPile = [];

    /** @var list<string> The top card is the last one. */
    public array $discardPile = [];

    /** Current colour: the top card's, or the one chosen with a colour change. */
    public string $color = '';

    /** 1 clockwise (seat 0 → 1 → 2), -1 the other way. */
    public int $direction = 1;

    public int $turn = 0;

    /** Stacking house rule: cards the player whose turn it is draws unless they stack. */
    public int $pendingDraw = 0;

    /** The card the current player just drew and may still play. */
    public ?string $drawn = null;

    /** Seat that is down to one card without pressing "LAATSTE!", until the next player moves. */
    public ?int $catchable = null;

    public ?int $winner = null;

    /** Finished turns. */
    public int $turns = 0;

    /** @var list<array<string, mixed>> */
    public array $events = [];

    /**
     * @param  list<string>  $houseRules
     */
    private function __construct(
        public readonly array $houseRules,
        private readonly Randomizer $rng,
        private readonly int $penalty,
    ) {}

    /**
     * A new game: shuffle, deal `$handSize` cards to everyone and turn the
     * first number card face up. Seat 0 starts.
     *
     * @param  list<string>  $houseRules
     */
    public static function deal(int $players, array $houseRules = [], ?Randomizer $rng = null, int $handSize = 7, int $penalty = 2): self
    {
        $rules = new self($houseRules, $rng ?? new Randomizer, $penalty);
        $rules->drawPile = $rules->rng->shuffleArray(Card::deck());

        for ($seat = 0; $seat < $players; $seat++) {
            $rules->seats[] = ['hand' => array_splice($rules->drawPile, -$handSize), 'called' => false, 'out' => false];
        }

        // Start on a number card, so the first player doesn't get an action card for free
        while (! Card::isNumber(end($rules->drawPile))) {
            $card = array_pop($rules->drawPile);
            array_splice($rules->drawPile, $rules->rng->getInt(0, count($rules->drawPile) - 1), 0, [$card]);
        }

        $rules->discardPile[] = array_pop($rules->drawPile);
        $rules->color = Card::color($rules->top());
        $rules->events[] = ['type' => 'deal', 'card' => $rules->top()];

        return $rules;
    }

    /** @param  array<string, mixed>  $state  from toArray() */
    public static function fromArray(array $state, ?Randomizer $rng = null, int $penalty = 2): self
    {
        $rules = new self($state['houseRules'], $rng ?? new Randomizer, $penalty);

        foreach (['seats', 'drawPile', 'discardPile', 'color', 'direction', 'turn', 'pendingDraw', 'drawn', 'catchable', 'winner', 'turns'] as $key) {
            $rules->{$key} = $state[$key];
        }

        return $rules;
    }

    /** @return array<string, mixed> Everything except the events. */
    public function toArray(): array
    {
        return [
            'houseRules' => $this->houseRules,
            'seats' => $this->seats,
            'drawPile' => $this->drawPile,
            'discardPile' => $this->discardPile,
            'color' => $this->color,
            'direction' => $this->direction,
            'turn' => $this->turn,
            'pendingDraw' => $this->pendingDraw,
            'drawn' => $this->drawn,
            'catchable' => $this->catchable,
            'winner' => $this->winner,
            'turns' => $this->turns,
        ];
    }

    public function top(): string
    {
        return $this->discardPile[array_key_last($this->discardPile)];
    }

    public function isFinished(): bool
    {
        return $this->winner !== null;
    }

    public function hasRule(string $rule): bool
    {
        return in_array($rule, $this->houseRules, true);
    }

    /** @return list<string> */
    public function hand(int $seat): array
    {
        return $this->seats[$seat]['hand'];
    }

    public function isOut(int $seat): bool
    {
        return $this->seats[$seat]['out'];
    }

    /** @return list<int> Seats still playing. */
    public function activeSeats(): array
    {
        return array_keys(array_filter($this->seats, fn (array $s) => ! $s['out']));
    }

    /** The next seat still playing, in the direction of play. */
    public function nextSeat(int $from): int
    {
        $count = count($this->seats);
        $seat = $from;

        do {
            $seat = (($seat + $this->direction) % $count + $count) % $count;
        } while ($this->seats[$seat]['out'] && $seat !== $from);

        return $seat;
    }

    /** Does this card fit on the table right now? */
    public function fits(string $card): bool
    {
        if ($this->pendingDraw > 0) {
            // Stacking: only +2 on +2, and +4 on either
            return Card::value($card) === 'wild4'
                || (Card::value($card) === 'draw2' && Card::value($this->top()) === 'draw2');
        }

        return Card::isWild($card)
            || Card::color($card) === $this->color
            || Card::value($card) === Card::value($this->top());
    }

    /**
     * The cards this seat may play now (each code once).
     *
     * @return list<string>
     */
    public function playable(int $seat): array
    {
        if ($this->isFinished() || $seat !== $this->turn) {
            return [];
        }

        if ($this->drawn !== null) {
            return $this->fits($this->drawn) ? [$this->drawn] : [];
        }

        return array_values(array_unique(array_filter($this->hand($seat), $this->fits(...))));
    }

    /**
     * Play a card. A colour change needs `$color`; a 7 with the 0/7 rule
     * needs the `$target` seat to swap hands with.
     */
    public function play(int $seat, string $card, ?string $color = null, ?int $target = null): void
    {
        $this->assertTurn($seat);
        $hand = $this->hand($seat);
        $index = array_search($card, $hand, true);

        match (true) {
            $this->drawn !== null && $card !== $this->drawn => throw new IllegalMove('Je mag nu alleen de kaart leggen die je net pakte.'),
            $index === false => throw new IllegalMove('Die kaart heb je niet.'),
            ! $this->fits($card) => throw new IllegalMove($this->pendingDraw > 0 ? 'Stapel een +kaart of pak de kaarten.' : 'Die kaart past niet.'),
            Card::isWild($card) && ! in_array($color, Card::COLORS, true) => throw new IllegalMove('Kies eerst een kleur.'),
            default => null,
        };

        $swapsHands = $this->hasRule('zero_seven') && Card::value($card) === '7' && count($hand) > 1;

        if ($swapsHands && ($target === null || $target === $seat || ! isset($this->seats[$target]) || $this->isOut($target))) {
            throw new IllegalMove('Kies met wie je van hand ruilt.');
        }

        $this->endCatchWindow($seat);
        array_splice($hand, $index, 1);
        $this->seats[$seat]['hand'] = $hand;
        $this->discardPile[] = $card;
        $this->color = Card::isWild($card) ? $color : Card::color($card);
        $this->drawn = null;
        $this->turns++;
        $this->events[] = ['type' => 'play', 'seat' => $seat, 'card' => $card, 'color' => $this->color];

        if ($hand === []) {
            $this->winner = $seat;
            $this->events[] = ['type' => 'win', 'seat' => $seat];

            return;
        }

        if (count($hand) === 1 && ! $this->seats[$seat]['called']) {
            $this->catchable = $seat;
        }

        $value = Card::value($card);

        if ($value === 'skip') {
            $this->events[] = ['type' => 'skip', 'seat' => $this->nextSeat($seat)];
            $this->advance(2);
        } elseif ($value === 'reverse') {
            $this->direction *= -1;
            $this->events[] = ['type' => 'reverse', 'direction' => $this->direction];
            // With two players reversing means: you go again
            $this->advance(count($this->activeSeats()) === 2 ? 2 : 1);
        } elseif (Card::drawCount($card) > 0 && $this->hasRule('stacking')) {
            $this->pendingDraw += Card::drawCount($card);
            $this->advance(1);
        } elseif (Card::drawCount($card) > 0) {
            $next = $this->nextSeat($seat);
            $this->give($next, Card::drawCount($card));
            $this->events[] = ['type' => 'skip', 'seat' => $next];
            $this->advance(2);
        } elseif ($swapsHands) {
            [$this->seats[$seat]['hand'], $this->seats[$target]['hand']] = [$this->seats[$target]['hand'], $this->seats[$seat]['hand']];
            $this->afterHandsMoved();
            $this->events[] = ['type' => 'swap', 'seat' => $seat, 'target' => $target];
            $this->advance(1);
        } elseif ($this->hasRule('zero_seven') && $value === '0') {
            $this->rotateHands();
            $this->events[] = ['type' => 'rotate', 'direction' => $this->direction];
            $this->advance(1);
        } else {
            $this->advance(1);
        }
    }

    /**
     * Draw instead of playing: the stacked +cards (turn over), or one card
     * that you may play right away when it fits.
     *
     * @return list<string> The drawn cards.
     */
    public function draw(int $seat): array
    {
        $this->assertTurn($seat);

        if ($this->drawn !== null) {
            throw new IllegalMove('Je hebt al een kaart gepakt: leg hem of pas.');
        }

        $this->endCatchWindow($seat);

        if ($this->pendingDraw > 0) {
            $cards = $this->give($seat, $this->pendingDraw);
            $this->pendingDraw = 0;
            $this->turns++;
            $this->advance(1);

            return $cards;
        }

        $cards = $this->give($seat, 1);

        if ($cards !== [] && $this->fits($cards[0])) {
            $this->drawn = $cards[0];
        } else {
            $this->turns++;
            $this->advance(1);
        }

        return $cards;
    }

    /** Keep the card you just drew and end your turn. */
    public function pass(int $seat): void
    {
        $this->assertTurn($seat);

        if ($this->drawn === null) {
            throw new IllegalMove('Pak eerst een kaart.');
        }

        $this->events[] = ['type' => 'pass', 'seat' => $seat];
        $this->turns++;
        $this->advance(1);
    }

    /** The turn timer ran out: the table draws for you (and passes). */
    public function timeout(int $seat): void
    {
        $this->events[] = ['type' => 'timeout', 'seat' => $seat];

        if ($this->drawn === null) {
            $this->draw($seat);
        }

        if ($this->drawn !== null && $this->turn === $seat) {
            $this->pass($seat);
        }
    }

    /**
     * "LAATSTE!": with two cards or fewer you announce your last card (and
     * are safe); whoever forgot to do so is caught and draws the penalty.
     *
     * @return int|null The seat that was caught.
     */
    public function callLast(int $seat): ?int
    {
        if ($this->isFinished() || $this->isOut($seat)) {
            return null;
        }

        if (count($this->hand($seat)) <= 2) {
            $this->seats[$seat]['called'] = true;
            $this->events[] = ['type' => 'last', 'seat' => $seat];

            if ($this->catchable === $seat) {
                $this->catchable = null;
            }
        }

        $caught = $this->catchable;

        if ($caught === null || $caught === $seat) {
            return null;
        }

        $this->catchable = null;
        $this->give($caught, $this->penalty);
        $this->events[] = ['type' => 'caught', 'seat' => $caught, 'by' => $seat, 'count' => $this->penalty];

        return $caught;
    }

    /**
     * The player gives up (or leaves): their hand is shuffled back into the
     * draw pile and the others play on. The last one left wins.
     */
    public function forfeit(int $seat): void
    {
        if ($this->isFinished() || $this->isOut($seat)) {
            return;
        }

        foreach ($this->hand($seat) as $card) {
            array_splice($this->drawPile, $this->rng->getInt(0, count($this->drawPile)), 0, [$card]);
        }

        $this->seats[$seat] = ['hand' => [], 'called' => false, 'out' => true];
        $this->events[] = ['type' => 'forfeit', 'seat' => $seat];

        if ($this->catchable === $seat) {
            $this->catchable = null;
        }

        $left = $this->activeSeats();

        if (count($left) === 1) {
            $this->winner = $left[0];
            $this->events[] = ['type' => 'win', 'seat' => $left[0]];
        } elseif ($this->turn === $seat) {
            $this->drawn = null;
            $this->turn = $this->nextSeat($seat);
        }
    }

    private function assertTurn(int $seat): void
    {
        if ($this->isFinished()) {
            throw new IllegalMove('Het potje is al afgelopen.');
        }

        if ($seat !== $this->turn) {
            throw new IllegalMove('Je bent niet aan de beurt.');
        }
    }

    /** The next player moved: whoever forgot "LAATSTE!" can't be caught any more. */
    private function endCatchWindow(int $actor): void
    {
        if ($this->catchable !== null && $this->catchable !== $actor) {
            $this->catchable = null;
        }
    }

    private function advance(int $steps): void
    {
        $this->drawn = null;

        for ($i = 0; $i < $steps; $i++) {
            $this->turn = $this->nextSeat($this->turn);
        }
    }

    /**
     * Cards from the draw pile into a hand; reshuffles the discard pile when
     * the draw pile runs out.
     *
     * @return list<string>
     */
    private function give(int $seat, int $count): array
    {
        $cards = [];

        for ($i = 0; $i < $count; $i++) {
            if ($this->drawPile === []) {
                $this->reshuffle();
            }

            if ($this->drawPile === []) {
                break;
            }

            $cards[] = array_pop($this->drawPile);
        }

        array_push($this->seats[$seat]['hand'], ...$cards);
        $this->afterHandsMoved();

        if ($cards !== []) {
            $this->events[] = ['type' => 'draw', 'seat' => $seat, 'count' => count($cards)];
        }

        return $cards;
    }

    /** Everything but the top card of the discard pile becomes the new draw pile. */
    private function reshuffle(): void
    {
        $top = array_pop($this->discardPile);

        if ($this->discardPile === []) {
            $this->discardPile = [$top];

            return;
        }

        $this->drawPile = $this->rng->shuffleArray($this->discardPile);
        $this->discardPile = [$top];
        $this->events[] = ['type' => 'reshuffle', 'count' => count($this->drawPile)];
    }

    /** 0/7 rule: every hand moves on to the next player in the direction of play. */
    private function rotateHands(): void
    {
        $hands = [];

        foreach ($this->activeSeats() as $seat) {
            $hands[$this->nextSeat($seat)] = $this->hand($seat);
        }

        foreach ($hands as $seat => $hand) {
            $this->seats[$seat]['hand'] = $hand;
        }

        $this->afterHandsMoved();
    }

    /** A bigger hand has to announce its last card again; one that grew can't be caught. */
    private function afterHandsMoved(): void
    {
        foreach ($this->seats as $seat => $s) {
            if (count($s['hand']) > 2) {
                $this->seats[$seat]['called'] = false;
            }
        }

        if ($this->catchable !== null && count($this->hand($this->catchable)) !== 1) {
            $this->catchable = null;
        }
    }
}
