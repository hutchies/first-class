// @ts-nocheck
import { nanoid } from "nanoid";
import { newRandom, outOfOrder, randomItem, rescoreAll, score } from "./logic";
import { state, core } from "./stores"
import { get } from "svelte/store"
import { tick } from "svelte";

// To add:
// 'finished' routine
// round counter in stores
// seeded randomness using alea library
// timer
// daily puzzle and random puzzles
// different word lists?
// Autofocus next one
// Move on on return?

export async function endGame(){
    // check for clashes
    while(get(state).roundLog.some((r, i) => outOfOrder(i))){
        console.log('out of order');
        let i = await choose(`Out of order: select row to cancel`);

        state.update(s => {
            s.roundLog[i].word = '';
            s.roundLog[i].realWord = '';
            return s;
        })
        score(get(state).roundLog[i].round, i);
    }
}


export let advance = () => {};

export async function choose(message){
  state.update(s => {
    s.choiceMessage = message;
    s.choosing = true;
    s.selection = -1;
    return s;
  })
  await tick();
  return new Promise((resolve, reject) => {
    advance = () => {
    let chosen = get(state).selection;
      state.update(s => {
        s.choosing = false;
        s.selection = -1;
        return s;
      });
      advance = () => {};
      resolve(chosen);
    }
  })
}

export function select(i){
  state.update(s => {
    s.selection = i;
    return s;
  });
}

export function toggle(i){
    if(!get(state).choosing) return;
    console.log('toggle', i);
    if(get(state).selection == i){
        select(-1);
    }else{
        select(i);
    }
}

export function setupGame(type = 'Random', seed = false){
    if(!seed){
        if(type == 'Daily'){
            let now = new Date();
            seed = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}`;
        }else{
            seed = nanoid();
        }
    }

    advance = () => {};

    newRandom(seed);
    let starterDice = [];
    for(let d of core.diceValues){
        starterDice.push(randomItem(d));
    }
    starterDice = starterDice.sort((a,b) => a.localeCompare(b));
    state.update(s => {
        s.choosing = false;
        s.selection = -1;
        s.gameType = type;
        s.starterDice = starterDice;
        s.seed = seed;
        s.round = 'dice';
        s.viewing = 'player';
        s.roundLog = [];
        s.botLog = false;
        s.total = 0;
        s.solving = false;
        s.diceList = []
        for(let i = 0; i < core.numRounds; i++){
            let dice = [];
            for(let d of core.diceValues){
                dice.push(randomItem(d));
            }
            dice = dice.sort((a,b) => a.localeCompare(b));
            let banned = randomItem(core.bannedDice);
            s.diceList.push({
                dice,
                banned
            });
            s.roundLog.push({
                dice: ['','',''], // could pregenerate them all tbf? but maybe not
                banned: '', // single character
                startingLetter: core.specialLetterRounds.includes(i) ? starterDice[core.specialLetterRounds.indexOf(i)] : false,
                word: '',
                realWord: '',
                allowed: null,
                filled: false,
                scoreIfAllowed: 0, // i.e. what it would score if it's allowed
                score: {value: 0},
                wordComponent: false
            })
        }
        return s;
    })
}