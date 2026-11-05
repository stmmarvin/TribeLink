<?php

use App\Games\Cards\Card;
use App\Games\Cards\CardNpc;
use App\Games\Cards\CardRules;
use App\Games\Cards\IllegalMove;
use Random\Engine\Mt19937;
use Random\Randomizer;

/**
 * A table in a known state: one hand per seat, the top card of the discard
 * pile and the draw pile (top card last). Seat 0 is to play.
 *
 * @param  list<list<string>>  $hands
 * @param  list<string>  $draw
 * @param  list<string>  $houseRules
 */
function cardTable(array $hands, string $top = 'sun:5', array $draw = ['sea:1', 'sea:2', 'sea:3', 'sea:4', 'sea:6', 'sea:7'], array $houseRules = [], ?string $color = null): CardRules
{
    return CardRules::fromArray([
        'houseRules' => $houseRules,
        'seats' => array_map(fn (array $hand) => ['hand' => $hand, 'called' => false, 'out' => false], $hands),
        'drawPile' => $draw,
        'discardPile' => ['leaf:9', $top],
        'color' => $color ?? Card::color($top),
        'direction' => 1,
        'turn' => 0,
        'pendingDraw' => 0,
        'drawn' => null,
        'catchable' => null,
        'winner' => null,
        'turns' => 0,
    ], new Randomizer(new Mt19937(7)));
}

describe('the deck and dealing', function () {
    test('the deck has 108 cards', function () {
        $deck = Card::deck();

        expect($deck)->toHaveCount(108)
            ->and(array_count_values($deck))->toMatchArray(['sun:0' => 1, 'sun:7' => 2, 'fire:skip' => 2, 'wild:wild' => 4, 'wild:wild4' => 4]);
    });

    test('everyone gets seven cards and a number card is turned up', function () {
        $rules = CardRules::deal(4, rng: new Randomizer(new Mt19937(1)));

        expect(array_map(fn (array $s) => count($s['hand']), $rules->seats))->toBe([7, 7, 7, 7])
            ->and($rules->discardPile)->toHaveCount(1)
            ->and(Card::isNumber($rules->top()))->toBeTrue()
            ->and($rules->color)->toBe(Card::color($rules->top()))
            ->and(count($rules->drawPile))->toBe(108 - 28 - 1)
            ->and($rules->turn)->toBe(0);
    });

    test('the state survives a round trip', function () {
        $rules = CardRules::deal(3, ['stacking'], new Randomizer(new Mt19937(3)));

        expect(CardRules::fromArray($rules->toArray())->toArray())->toBe($rules->toArray());
    });
});

describe('valid moves', function () {
    test('a card fits on the same colour, the same number or the same symbol', function () {
        $rules = cardTable([['sun:2', 'sea:5', 'leaf:3', 'fire:skip'], ['sea:1']]);

        expect($rules->playable(0))->toEqualCanonicalizing(['sun:2', 'sea:5']);

        $rules = cardTable([['sea:skip', 'leaf:3'], ['sea:1']], top: 'fire:skip');
        expect($rules->playable(0))->toBe(['sea:skip']);
    });

    test('a colour change always fits and sets the colour', function () {
        $rules = cardTable([['wild:wild', 'leaf:3'], ['sea:1']]);

        expect($rules->playable(0))->toBe(['wild:wild']);

        $rules->play(0, 'wild:wild', 'leaf');
        expect($rules->color)->toBe('leaf')
            ->and($rules->turn)->toBe(1)
            ->and($rules->fits('leaf:8'))->toBeTrue()
            ->and($rules->fits('sun:8'))->toBeFalse();
    });

    test('a colour change needs a colour', function () {
        cardTable([['wild:wild', 'leaf:3'], ['sea:1']])->play(0, 'wild:wild');
    })->throws(IllegalMove::class, 'Kies eerst een kleur.');

    test('a card that does not fit is refused', function () {
        cardTable([['leaf:3', 'sun:1'], ['sea:1']])->play(0, 'leaf:3');
    })->throws(IllegalMove::class, 'Die kaart past niet.');

    test('you cannot play a card you do not have', function () {
        cardTable([['sun:1', 'sun:2'], ['sea:1']])->play(0, 'sun:3');
    })->throws(IllegalMove::class);

    test('only the player whose turn it is may play', function () {
        cardTable([['sun:1'], ['sun:2', 'sun:3']])->play(1, 'sun:2');
    })->throws(IllegalMove::class, 'Je bent niet aan de beurt.');

    test('the played card goes on the discard pile and the turn moves on', function () {
        $rules = cardTable([['sun:1', 'sea:2'], ['sea:1'], ['sea:3']]);
        $rules->play(0, 'sun:1');

        expect($rules->top())->toBe('sun:1')
            ->and($rules->hand(0))->toBe(['sea:2'])
            ->and($rules->turn)->toBe(1)
            ->and($rules->turns)->toBe(1);
    });
});

describe('drawing', function () {
    test('a drawn card that fits may be played right away', function () {
        $rules = cardTable([['leaf:1', 'leaf:2'], ['sea:1']], draw: ['sea:4', 'sun:8']);

        expect($rules->draw(0))->toBe(['sun:8'])
            ->and($rules->turn)->toBe(0)
            ->and($rules->playable(0))->toBe(['sun:8']);

        $rules->play(0, 'sun:8');
        expect($rules->turn)->toBe(1);
    });

    test('after drawing only the drawn card may be played', function () {
        $rules = cardTable([['sun:1', 'leaf:2'], ['sea:1']], draw: ['sun:8']);
        $rules->draw(0);

        $rules->play(0, 'sun:1');
    })->throws(IllegalMove::class, 'Je mag nu alleen de kaart leggen die je net pakte.');

    test('a drawn card that fits may also be kept', function () {
        $rules = cardTable([['leaf:1', 'leaf:2'], ['sea:1']], draw: ['sun:8']);
        $rules->draw(0);
        $rules->pass(0);

        expect($rules->hand(0))->toBe(['leaf:1', 'leaf:2', 'sun:8'])->and($rules->turn)->toBe(1);
    });

    test('a drawn card that does not fit ends the turn', function () {
        $rules = cardTable([['leaf:1', 'leaf:2'], ['sea:1']], draw: ['fire:8']);
        $rules->draw(0);

        expect($rules->turn)->toBe(1)->and($rules->drawn)->toBeNull();
    });

    test('you cannot pass without drawing', function () {
        cardTable([['leaf:1'], ['sea:1']])->pass(0);
    })->throws(IllegalMove::class, 'Pak eerst een kaart.');

    test('the turn timer draws for you and ends your turn', function () {
        $rules = cardTable([['leaf:1', 'leaf:2'], ['sea:1']], draw: ['sun:8']);
        $rules->timeout(0);

        expect($rules->hand(0))->toContain('sun:8')->and($rules->turn)->toBe(1);
    });
});

describe('action cards and direction', function () {
    test('skip passes over the next player', function () {
        $rules = cardTable([['sun:skip', 'sea:1'], ['sea:2'], ['sea:3']]);
        $rules->play(0, 'sun:skip');

        expect($rules->turn)->toBe(2);
    });

    test('reverse turns the direction of play around', function () {
        $rules = cardTable([['sun:reverse', 'sea:1'], ['sea:2'], ['sea:3'], ['sea:4']]);
        $rules->play(0, 'sun:reverse');

        expect($rules->direction)->toBe(-1)
            ->and($rules->turn)->toBe(3)
            ->and($rules->nextSeat(3))->toBe(2);
    });

    test('with two players reverse works as skip', function () {
        $rules = cardTable([['sun:reverse', 'sea:1'], ['sea:2']]);
        $rules->play(0, 'sun:reverse');

        expect($rules->turn)->toBe(0);
    });

    test('+2 makes the next player draw two and skips them', function () {
        $rules = cardTable([['sun:draw2', 'sea:1'], ['leaf:2'], ['leaf:3']]);
        $rules->play(0, 'sun:draw2');

        expect($rules->hand(1))->toHaveCount(3)->and($rules->turn)->toBe(2);
    });

    test('colour change +4 makes the next player draw four and skips them', function () {
        $rules = cardTable([['wild:wild4', 'sea:1'], ['leaf:2'], ['leaf:3']]);
        $rules->play(0, 'wild:wild4', 'sea');

        expect($rules->hand(1))->toHaveCount(5)
            ->and($rules->turn)->toBe(2)
            ->and($rules->color)->toBe('sea');
    });

    test('the direction is followed after a reverse', function () {
        $rules = cardTable([['sun:reverse', 'sea:1'], ['sun:2', 'sun:9'], ['sun:3'], ['sun:4', 'sun:6']]);
        $rules->play(0, 'sun:reverse');
        $rules->play(3, 'sun:4');

        expect($rules->turn)->toBe(2);
    });
});

describe('house rules', function () {
    test('without stacking you cannot answer a +2 with a +2', function () {
        $rules = cardTable([['sun:draw2', 'sea:1'], ['sea:draw2', 'leaf:1'], ['leaf:3']]);
        $rules->play(0, 'sun:draw2');

        expect($rules->hand(1))->toHaveCount(4)->and($rules->turn)->toBe(2);
    });

    test('with stacking the next player stacks or draws everything', function () {
        $rules = cardTable([['sun:draw2', 'sea:1'], ['sea:draw2', 'leaf:1'], ['leaf:3', 'sea:9']], houseRules: ['stacking']);
        $rules->play(0, 'sun:draw2');

        expect($rules->pendingDraw)->toBe(2)
            ->and($rules->turn)->toBe(1)
            ->and($rules->playable(1))->toBe(['sea:draw2']);

        $rules->play(1, 'sea:draw2');
        expect($rules->pendingDraw)->toBe(4)->and($rules->playable(2))->toBe([]);

        $rules->draw(2);
        expect($rules->hand(2))->toHaveCount(6)
            ->and($rules->pendingDraw)->toBe(0)
            ->and($rules->turn)->toBe(0);
    });

    test('with stacking a +4 goes on a +2 but not the other way round', function () {
        $rules = cardTable([['wild:wild4', 'sea:1'], ['sea:draw2', 'wild:wild4', 'leaf:1'], ['leaf:3']], houseRules: ['stacking']);
        $rules->play(0, 'wild:wild4', 'sun');

        expect($rules->playable(1))->toBe(['wild:wild4']);
    });

    test('with the 0/7 rule a 7 swaps hands with the chosen player', function () {
        $rules = cardTable([['sun:7', 'sea:1', 'sea:2'], ['leaf:1'], ['fire:1', 'fire:2', 'fire:3', 'fire:4']], houseRules: ['zero_seven']);
        $rules->play(0, 'sun:7', target: 2);

        expect($rules->hand(0))->toBe(['fire:1', 'fire:2', 'fire:3', 'fire:4'])
            ->and($rules->hand(2))->toBe(['sea:1', 'sea:2']);
    });

    test('with the 0/7 rule a 7 needs someone to swap with', function () {
        cardTable([['sun:7', 'sea:1'], ['leaf:1']], houseRules: ['zero_seven'])->play(0, 'sun:7');
    })->throws(IllegalMove::class, 'Kies met wie je van hand ruilt.');

    test('with the 0/7 rule a 0 passes all hands on', function () {
        $rules = cardTable([['sun:0', 'sea:1'], ['leaf:1', 'leaf:2'], ['fire:1', 'fire:2', 'fire:3']], houseRules: ['zero_seven']);
        $rules->play(0, 'sun:0');

        expect($rules->hand(1))->toBe(['sea:1'])
            ->and($rules->hand(2))->toBe(['leaf:1', 'leaf:2'])
            ->and($rules->hand(0))->toBe(['fire:1', 'fire:2', 'fire:3']);
    });
});

describe('reshuffling', function () {
    test('an empty draw pile is refilled from the discard pile, except the top card', function () {
        $rules = cardTable([['leaf:1', 'leaf:2'], ['sea:1']], top: 'sun:5', draw: []);
        $rules->discardPile = ['fire:1', 'fire:2', 'fire:3', 'sun:5'];

        $rules->draw(0);

        expect($rules->discardPile)->toBe(['sun:5'])
            ->and($rules->drawPile)->toHaveCount(2)
            ->and($rules->hand(0))->toHaveCount(3)
            ->and(array_column($rules->events, 'type'))->toContain('reshuffle');
    });

    test('no cards anywhere: drawing gives nothing but the game goes on', function () {
        $rules = cardTable([['leaf:1'], ['sea:1']], draw: []);
        $rules->discardPile = ['sun:5'];

        expect($rules->draw(0))->toBe([])->and($rules->turn)->toBe(1);
    });
});

describe('"LAATSTE!"', function () {
    test('who forgets it and is caught draws two penalty cards', function () {
        $rules = cardTable([['sun:1', 'sea:9'], ['leaf:1', 'leaf:2'], ['fire:1']]);
        $rules->play(0, 'sun:1');

        expect($rules->catchable)->toBe(0)
            ->and($rules->callLast(1))->toBe(0)
            ->and($rules->hand(0))->toHaveCount(3)
            ->and($rules->catchable)->toBeNull();
    });

    test('pressing it yourself in time keeps you safe', function () {
        $rules = cardTable([['sun:1', 'sea:9'], ['leaf:1', 'leaf:2'], ['fire:1']]);
        $rules->callLast(0);
        $rules->play(0, 'sun:1');

        expect($rules->catchable)->toBeNull()
            ->and($rules->callLast(1))->toBeNull()
            ->and($rules->hand(0))->toHaveCount(1);
    });

    test('pressing it right after playing still counts', function () {
        $rules = cardTable([['sun:1', 'sea:9'], ['leaf:1', 'leaf:2'], ['fire:1']]);
        $rules->play(0, 'sun:1');
        $rules->callLast(0);

        expect($rules->callLast(1))->toBeNull()->and($rules->hand(0))->toHaveCount(1);
    });

    test('once the next player moved you can no longer be caught', function () {
        $rules = cardTable([['sun:1', 'sea:9'], ['sun:2', 'leaf:2', 'leaf:4'], ['fire:1', 'fire:2', 'fire:3']]);
        $rules->play(0, 'sun:1');
        $rules->play(1, 'sun:2');

        expect($rules->callLast(2))->toBeNull()->and($rules->hand(0))->toHaveCount(1);
    });

    test('pressing it with a full hand does nothing', function () {
        $rules = cardTable([['sun:1', 'sea:9', 'sea:8'], ['leaf:1']]);

        expect($rules->callLast(0))->toBeNull()
            ->and($rules->seats[0]['called'])->toBeFalse()
            ->and($rules->hand(0))->toHaveCount(3);
    });

    test('drawing again means announcing again', function () {
        $rules = cardTable([['leaf:1', 'leaf:2'], ['sea:1']], draw: ['fire:8']);
        $rules->callLast(0);
        $rules->draw(0);

        expect($rules->seats[0]['called'])->toBeFalse();
    });
});

describe('winning and giving up', function () {
    test('who plays their last card wins', function () {
        $rules = cardTable([['sun:1'], ['sea:1']]);
        $rules->play(0, 'sun:1');

        expect($rules->winner)->toBe(0)->and($rules->isFinished())->toBeTrue()->and($rules->playable(1))->toBe([]);
    });

    test('a finished game takes no more moves', function () {
        $rules = cardTable([['sun:1'], ['sun:2']]);
        $rules->play(0, 'sun:1');
        $rules->play(1, 'sun:2');
    })->throws(IllegalMove::class, 'Het potje is al afgelopen.');

    test('giving up puts your hand back in the draw pile and the others play on', function () {
        $rules = cardTable([['sun:1', 'sun:2'], ['sea:1'], ['leaf:1']], draw: ['fire:1']);
        $rules->forfeit(0);

        expect($rules->isOut(0))->toBeTrue()
            ->and($rules->hand(0))->toBe([])
            ->and($rules->drawPile)->toHaveCount(3)
            ->and($rules->turn)->toBe(1)
            ->and($rules->nextSeat(2))->toBe(1)
            ->and($rules->isFinished())->toBeFalse();
    });

    test('the last player left wins', function () {
        $rules = cardTable([['sun:1', 'sun:2'], ['sea:1']]);
        $rules->forfeit(1);

        expect($rules->winner)->toBe(0);
    });
});

describe('the NPC', function () {
    test('it plays a card that fits, or draws', function () {
        $npc = new CardNpc('normal', new Randomizer(new Mt19937(1)));

        expect($npc->decide(cardTable([['leaf:1', 'sun:3'], ['sea:1', 'sea:2', 'sea:3']]), 0))
            ->toMatchArray(['action' => 'play', 'card' => 'sun:3'])
            ->and($npc->decide(cardTable([['leaf:1', 'leaf:3'], ['sea:1']]), 0))
            ->toBe(['action' => 'draw']);
    });

    test('it keeps action cards and colour changes for later', function () {
        $npc = new CardNpc('normal');
        $rules = cardTable([['sun:skip', 'wild:wild4', 'wild:wild', 'sea:5', 'sun:2'], ['sea:1', 'sea:2', 'sea:3', 'sea:4']]);

        expect($npc->decide($rules, 0)['card'])->toBe('sun:2');
    });

    test('it uses an action card when the next player is almost out', function () {
        $npc = new CardNpc('normal');
        $rules = cardTable([['sun:skip', 'sun:2', 'sea:3'], ['sea:1']]);

        expect($npc->decide($rules, 0)['card'])->toBe('sun:skip');
    });

    test('it plays +4 only when nothing else fits, and picks the colour it has most of', function () {
        $npc = new CardNpc('normal');
        $rules = cardTable([['wild:wild4', 'fire:1', 'fire:2', 'leaf:3'], ['sea:1', 'sea:2', 'sea:3']]);

        expect($npc->decide($rules, 0))->toMatchArray(['action' => 'play', 'card' => 'wild:wild4', 'color' => 'fire']);
    });

    test('after drawing a card that fits it plays it', function () {
        $npc = new CardNpc('normal');
        $rules = cardTable([['leaf:1', 'leaf:2'], ['sea:1']], draw: ['sun:8']);
        $rules->draw(0);

        expect($npc->decide($rules, 0))->toMatchArray(['action' => 'play', 'card' => 'sun:8']);
    });

    test('a hard NPC attacks sooner', function () {
        $rules = cardTable([['sun:skip', 'sun:2', 'sea:3'], ['sea:1', 'sea:2', 'sea:4']]);

        expect((new CardNpc('normal'))->decide($rules, 0)['card'])->toBe('sun:2')
            ->and((new CardNpc('hard'))->decide($rules, 0)['card'])->toBe('sun:skip');
    });

    test('a hard NPC keeps a 7 when swapping would get it a bigger hand', function () {
        $rules = cardTable([['sun:7', 'sun:2'], ['sea:1', 'sea:2', 'sea:3', 'sea:4', 'sea:6']], houseRules: ['zero_seven']);

        expect((new CardNpc('normal'))->decide($rules, 0)['card'])->toBe('sun:7')
            ->and((new CardNpc('hard'))->decide($rules, 0)['card'])->toBe('sun:2');
    });

    test('a hard NPC swaps with a 7 to grab a smaller hand', function () {
        $rules = cardTable([['sun:7', 'sun:2', 'leaf:1', 'fire:3'], ['sea:1', 'sea:2', 'sea:3', 'sea:4'], ['fire:8']], houseRules: ['zero_seven']);

        expect((new CardNpc('hard'))->decide($rules, 0))->toMatchArray(['card' => 'sun:7', 'target' => 2]);
    });

    test('a hard NPC counts cards when it picks a colour', function () {
        // Only the colour change fits; sun and leaf are tied, but a leaf card is on the discard pile already
        $rules = cardTable([['wild:wild', 'sun:1', 'leaf:3'], ['sea:1', 'sea:2', 'sea:3', 'sea:4']], top: 'fire:5');

        expect((new CardNpc('normal'))->decide($rules, 0)['color'])->toBe('sun')
            ->and((new CardNpc('hard'))->decide($rules, 0)['color'])->toBe('leaf');
    });

    test('NPCs can play a whole game to the end', function () {
        $rules = CardRules::deal(4, ['stacking', 'zero_seven'], new Randomizer(new Mt19937(11)));
        $npcs = [new CardNpc('normal'), new CardNpc('easy'), new CardNpc('hard'), new CardNpc('easy')];

        for ($move = 0; $move < 2000 && ! $rules->isFinished(); $move++) {
            $seat = $rules->turn;
            $choice = $npcs[$seat]->decide($rules, $seat);

            match ($choice['action']) {
                'play' => $rules->play($seat, $choice['card'], $choice['color'], $choice['target']),
                'draw' => $rules->draw($seat),
                'pass' => $rules->pass($seat),
            };
        }

        $cards = count($rules->drawPile) + count($rules->discardPile) + array_sum(array_map(fn (array $s) => count($s['hand']), $rules->seats));

        expect($rules->isFinished())->toBeTrue()
            ->and($rules->hand($rules->winner))->toBe([])
            ->and($cards)->toBe(108);
    });
});
