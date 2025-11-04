// @ts-nocheck
import { newRandom, randomItem } from "./logic";
import { state, core } from "./stores"
import { get } from "svelte/store"

// To add:
// 'finished' routine
// round counter in stores
// seeded randomness using alea library
// timer
// daily puzzle and random puzzles
// different word lists?
// Autofocus next one
// Move on on return?

export function setupGame(type = 'Random'){
    if(type == 'Daily'){
        let now = new Date();
        newRandom(`${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`);
    }else{
        newRandom();
    }
    let starterDice = [];
    for(let d of core.diceValues){
        starterDice.push(randomItem(d));
    }
    starterDice = starterDice.sort((a,b) => a.localeCompare(b));
    state.update(s => {
        s.gameType = type;
        s.starterDice = starterDice;
        s.round = 'dice';
        s.viewing = 'player';
        s.roundLog = [];
        for(let i = 0; i < core.numRounds; i++){
            let dice = [];
            for(let d of core.diceValues){
                dice.push(randomItem(d));
            }
            dice = dice.sort((a,b) => a.localeCompare(b));
            let banned = randomItem(core.bannedDice);
            s.roundLog.push({
                dice, // could pregenerate them all tbf? but maybe not
                banned, // single character
                startingLetter: core.specialLetterRounds.includes(i) ? starterDice[core.specialLetterRounds.indexOf(i)] : false,
                word: '',
                realWord: '',
                allowed: null,
                ready: false,
                scoreIfAllowed: 0, // i.e. what it would score if it's allowed
                score: 0,
                wordComponent: false
            })
        }
        return s;
    })
}

export let gamePhases = {
    setup: {
        action: () => {
            setupGame('Random');
        }
    },
    
}