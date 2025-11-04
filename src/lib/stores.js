import { nanoid } from "nanoid";
import { writable } from "svelte/store";

export let myID = nanoid();

export let state = writable(defaultState());

export let core = {
    diceValues: [
        ['F','R','L','H','D','V'],
        ['C','W','P','J','G','T'],
        ['B','M','K','N','Q','U']
    ],
    bannedDice: ['A','E','I','O','Y','S'],
    numRounds: 7, // I think?
    specialLetterRounds: [1, 3, 5], // starting with 0
}

export function defaultState(){
    return {
        starterDice: [],
        round: 'setup',
        roundLog: [],
        savedLog: [],
        viewing: 'player',
        fixedLetters: [],
        myID,
        players: {
            // coded by id from PocketBase in time?
        }
    }
}